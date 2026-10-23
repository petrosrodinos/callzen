import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    useAddBookmark,
    useAddSegments,
    useAskCopilot,
    useGenerateSuggestion,
    useUpdateSegmentSpeaker,
    useUpdateSuggestion,
} from "@/features/calls/hooks/use-calls";
import {
    Speakers,
    SuggestionStatuses,
    SuggestionTypes,
    type Call,
    type SegmentInput,
    type Speaker,
    type Suggestion,
    type SuggestionResult,
} from "@/features/calls/interfaces/calls.interfaces";
import type { SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import { createClientId } from "@/lib/format";

export interface LiveSegment {
    id: string | null;
    client_id: string;
    speaker: Speaker;
    text: string;
    start_ms: number;
    end_ms: number;
    pending: boolean;
}

export type CopilotHealth = "ok" | "thinking" | "unavailable" | "offline";

const RETRY_MS = 3000;
const queueKey = (callId: string) => `callzen:pending-segments:${callId}`;

const readQueue = (callId: string): SegmentInput[] => {
    try {
        return JSON.parse(localStorage.getItem(queueKey(callId)) ?? "[]");
    } catch {
        return [];
    }
};

const writeQueue = (callId: string, queue: SegmentInput[]) => {
    try {
        if (queue.length) localStorage.setItem(queueKey(callId), JSON.stringify(queue));
        else localStorage.removeItem(queueKey(callId));
    } catch {
        // Storage may be unavailable (private mode); the in-memory queue still works.
    }
};

interface UseCopilotSessionOptions {
    call: Call | undefined;
    getElapsedMs: () => number;
}

export const useCopilotSession = ({ call, getElapsedMs }: UseCopilotSessionOptions) => {
    const callId = call?.id;
    const copilotEnabled = !!call?.copilot_enabled;

    const [segments, setSegments] = useState<LiveSegment[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [scriptProgress, setScriptProgress] = useState<string[]>([]);
    const [muted, setMuted] = useState(false);
    const [frequency, setFrequency] = useState<SuggestionFrequency | undefined>(undefined);
    const [health, setHealth] = useState<CopilotHealth>("ok");
    const [fallbackModel, setFallbackModel] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const queueRef = useRef<SegmentInput[]>([]);
    const inFlightRef = useRef(false);
    const flushAgainRef = useRef(false);
    const retryTimerRef = useRef<number | null>(null);
    const mutedRef = useRef(muted);
    const frequencyRef = useRef(frequency);
    const flushRef = useRef<() => Promise<void>>(async () => undefined);
    useEffect(() => {
        mutedRef.current = muted;
        frequencyRef.current = frequency;
    }, [muted, frequency]);

    const addSegments = useAddSegments();
    const generateSuggestion = useGenerateSuggestion();
    const askCopilot = useAskCopilot();
    const addBookmark = useAddBookmark();
    const updateSuggestion = useUpdateSuggestion();
    const updateSegmentSpeaker = useUpdateSegmentSpeaker();

    // Hydrate from the server once per call (also restores state after a page reload).
    const hydratedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!call || hydratedRef.current === call.id) return;
        hydratedRef.current = call.id;
        const pending = readQueue(call.id);
        queueRef.current = pending;
        setPendingCount(pending.length);
        setSegments([
            ...call.segments.map((s) => ({ ...s, client_id: s.client_id ?? s.id, pending: false })),
            ...pending.map((s) => ({ ...s, id: null, pending: true })),
        ]);
        setSuggestions(call.suggestions);
        setScriptProgress(call.script_progress ?? []);
        setFrequency(call.agent_snapshot?.suggestion_frequency);
    }, [call]);

    const applyResult = useCallback((result: SuggestionResult) => {
        if (result.suggestion) {
            setSuggestions((prev) => (prev.some((s) => s.id === result.suggestion?.id) ? prev : [...prev, result.suggestion as Suggestion]));
        }
        if (result.speaker_updates?.length) {
            const updates = new Map(result.speaker_updates.map((u) => [u.id, u.speaker]));
            setSegments((prev) => prev.map((s) => (s.id && updates.has(s.id) ? { ...s, speaker: updates.get(s.id) as Speaker } : s)));
        }
        if (result.script_progress) setScriptProgress(result.script_progress);
        if (result.fallback_model) setFallbackModel(result.fallback_model);
        setHealth(result.suggestions_unavailable ? "unavailable" : "ok");
    }, []);

    const flush = useCallback(async () => {
        if (!callId || !queueRef.current.length) return;
        if (inFlightRef.current) {
            flushAgainRef.current = true;
            return;
        }

        const batch = queueRef.current.slice(0, 50);
        inFlightRef.current = true;
        if (copilotEnabled && !mutedRef.current) setHealth("thinking");

        try {
            const result = await addSegments.mutateAsync({
                id: callId,
                dto: {
                    segments: batch,
                    request_suggestion: copilotEnabled && !mutedRef.current,
                    frequency: frequencyRef.current,
                    elapsed_ms: getElapsedMs(),
                },
            });

            const sent = new Set(batch.map((s) => s.client_id));
            queueRef.current = queueRef.current.filter((s) => !sent.has(s.client_id));
            writeQueue(callId, queueRef.current);
            setPendingCount(queueRef.current.length);

            const saved = new Map(result.segments.map((s) => [s.client_id, s]));
            setSegments((prev) =>
                prev.map((s) => {
                    const match = saved.get(s.client_id);
                    return match ? { ...s, id: match.id, pending: false } : s;
                }),
            );
            applyResult(result);
        } catch {
            // Keep the lines queued; they are retried until the connection comes back.
            setHealth("offline");
            if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = window.setTimeout(() => void flushRef.current(), RETRY_MS);
        } finally {
            inFlightRef.current = false;
            if (flushAgainRef.current) {
                flushAgainRef.current = false;
                void flushRef.current();
            }
        }
    }, [addSegments, applyResult, callId, copilotEnabled, getElapsedMs]);

    useEffect(() => {
        flushRef.current = flush;
    }, [flush]);

    useEffect(() => {
        const online = () => void flush();
        window.addEventListener("online", online);
        return () => {
            window.removeEventListener("online", online);
            if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
        };
    }, [flush]);

    const addFinalSegment = useCallback(
        (input: { speaker: Speaker; text: string; startMs: number; endMs: number; clientId?: string; send?: boolean }) => {
            const text = input.text.trim();
            if (!callId || !text) return;
            const segment: SegmentInput = {
                client_id: input.clientId ?? createClientId(),
                speaker: input.speaker,
                text,
                start_ms: Math.max(0, Math.round(input.startMs)),
                end_ms: Math.max(Math.round(input.startMs), Math.round(input.endMs)),
            };
            setSegments((prev) => [...prev, { ...segment, id: null, pending: input.send !== false }].sort((a, b) => a.start_ms - b.start_ms));
            if (input.send === false) return;
            queueRef.current = [...queueRef.current, segment];
            writeQueue(callId, queueRef.current);
            setPendingCount(queueRef.current.length);
            void flush();
        },
        [callId, flush],
    );

    // Records a line that the server already stored (e.g. browser-voice prospect replies).
    const addServerSegment = useCallback((segment: { id: string; client_id: string | null; speaker: Speaker; text: string; start_ms: number; end_ms: number }) => {
        setSegments((prev) => {
            const exists = prev.some((s) => s.id === segment.id || (segment.client_id && s.client_id === segment.client_id));
            const next: LiveSegment = { ...segment, client_id: segment.client_id ?? segment.id, pending: false };
            return exists
                ? prev.map((s) => (s.client_id === segment.client_id ? next : s))
                : [...prev, next].sort((a, b) => a.start_ms - b.start_ms);
        });
    }, []);

    const requestSuggestionNow = useCallback(async () => {
        if (!callId || !copilotEnabled || mutedRef.current) return;
        setHealth("thinking");
        try {
            applyResult(await generateSuggestion.mutateAsync({ id: callId, elapsed_ms: getElapsedMs(), frequency: frequencyRef.current }));
        } catch {
            setHealth("unavailable");
        }
    }, [applyResult, callId, copilotEnabled, generateSuggestion, getElapsedMs]);

    const ask = useCallback(
        async (question: string) => {
            if (!callId) return;
            const result = await askCopilot.mutateAsync({ id: callId, question, elapsed_ms: getElapsedMs() });
            setSuggestions((prev) => [...prev, result.suggestion]);
            return result;
        },
        [askCopilot, callId, getElapsedMs],
    );

    const bookmark = useCallback(
        (label?: string) => {
            if (!callId) return;
            addBookmark.mutate({ id: callId, at_ms: getElapsedMs(), label });
        },
        [addBookmark, callId, getElapsedMs],
    );

    const setSuggestionStatus = useCallback(
        (suggestion: Suggestion, status: Suggestion["status"]) => {
            if (!callId) return;
            setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, status } : s)));
            updateSuggestion.mutate({ id: callId, suggestionId: suggestion.id, status });
        },
        [callId, updateSuggestion],
    );

    const rateSuggestion = useCallback(
        (suggestion: Suggestion, feedback: "UP" | "DOWN") => {
            if (!callId) return;
            const next = suggestion.feedback === feedback ? null : feedback;
            setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? { ...s, feedback: next } : s)));
            updateSuggestion.mutate({ id: callId, suggestionId: suggestion.id, feedback: next });
        },
        [callId, updateSuggestion],
    );

    const flipSpeaker = useCallback(
        (segment: LiveSegment) => {
            if (!callId || !segment.id) return;
            const speaker = segment.speaker === Speakers.USER ? Speakers.PROSPECT : Speakers.USER;
            setSegments((prev) => prev.map((s) => (s.id === segment.id ? { ...s, speaker } : s)));
            updateSegmentSpeaker.mutate({ id: callId, segmentId: segment.id, speaker });
        },
        [callId, updateSegmentSpeaker],
    );

    const visible = useMemo(() => suggestions.filter((s) => s.status !== SuggestionStatuses.DISMISSED), [suggestions]);
    const coaching = useMemo(() => visible.filter((s) => s.type !== SuggestionTypes.ANSWER), [visible]);
    const primary = coaching.at(-1) ?? null;
    const pinned = useMemo(() => visible.filter((s) => s.status === SuggestionStatuses.PINNED && s.id !== primary?.id), [visible, primary]);
    const history = useMemo(() => coaching.slice(0, -1).reverse().slice(0, 8), [coaching]);
    const latestInfoCard = useMemo(() => [...coaching].reverse().find((s) => s.info_card)?.info_card ?? null, [coaching]);

    return {
        segments,
        suggestions,
        primary,
        pinned,
        history,
        latestInfoCard,
        scriptProgress,
        muted,
        setMuted,
        frequency,
        setFrequency,
        health,
        fallbackModel,
        pendingCount,
        isAsking: askCopilot.isPending,
        addFinalSegment,
        addServerSegment,
        flush,
        requestSuggestionNow,
        ask,
        bookmark,
        dismiss: (s: Suggestion) => setSuggestionStatus(s, SuggestionStatuses.DISMISSED),
        pin: (s: Suggestion) => setSuggestionStatus(s, s.status === SuggestionStatuses.PINNED ? SuggestionStatuses.SHOWN : SuggestionStatuses.PINNED),
        rateSuggestion,
        flipSpeaker,
        hasPendingSegments: () => queueRef.current.length > 0,
    };
};

export type CopilotSession = ReturnType<typeof useCopilotSession>;
