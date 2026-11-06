import { useEffect, useRef } from "react";

// Show the countdown during the last two minutes (§8.3).
const WARNING_MS = 2 * 60 * 1000;

// The call's limit is the smallest of its plan minutes (max_duration_seconds, fixed at start) and the prospect's
// own time limit. Calls `onReached` once when the elapsed time reaches it; the server backstop covers the rest.
export const useCallTimeLimit = ({
    maxDurationSeconds,
    extraLimitMs,
    elapsedMs,
    active,
    onReached,
}: {
    maxDurationSeconds: number | null | undefined;
    extraLimitMs?: number | null;
    elapsedMs: number;
    active: boolean;
    onReached: () => void;
}) => {
    const limits = [maxDurationSeconds ? maxDurationSeconds * 1000 : null, extraLimitMs ?? null].filter((value): value is number => !!value);
    const limitMs = limits.length ? Math.min(...limits) : null;
    const remainingMs = limitMs === null ? null : Math.max(0, limitMs - elapsedMs);
    const reachedRef = useRef(false);
    const onReachedRef = useRef(onReached);
    useEffect(() => {
        onReachedRef.current = onReached;
    }, [onReached]);

    useEffect(() => {
        if (!active || remainingMs === null || remainingMs > 0 || reachedRef.current) return;
        reachedRef.current = true;
        onReachedRef.current();
    }, [active, remainingMs]);

    return { limitMs, remainingMs, warning: remainingMs !== null && remainingMs <= WARNING_MS };
};
