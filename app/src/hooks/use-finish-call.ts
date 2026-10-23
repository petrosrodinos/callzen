import { useCallback, useState } from "react";
import { useEndCall, useUploadRecording } from "@/features/calls/hooks/use-calls";
import type { CallEndReason, CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import type { CopilotSession } from "@/hooks/use-copilot-session";

interface FinishCallInput {
    callId: string;
    reason: CallEndReason;
    durationSeconds: number;
    recording: Blob | null;
    outcome?: CallOutcome;
    customOutcome?: string;
}

const waitFor = async (condition: () => boolean, timeoutMs: number) => {
    const startedAt = Date.now();
    while (condition() && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
};

// Ends a call without losing data: flushes queued transcript lines first, then ends the call
// (which starts the analysis) and uploads the recording with retries.
export const useFinishCall = (copilot: CopilotSession) => {
    const endCall = useEndCall();
    const uploadRecording = useUploadRecording();
    const [isFinishing, setIsFinishing] = useState(false);

    const finish = useCallback(
        async ({ callId, reason, durationSeconds, recording, outcome, customOutcome }: FinishCallInput) => {
            setIsFinishing(true);
            try {
                void copilot.flush();
                await waitFor(copilot.hasPendingSegments, 8000);

                const call = await endCall.mutateAsync({
                    id: callId,
                    dto: { ended_reason: reason, duration_seconds: Math.max(0, Math.round(durationSeconds)), outcome, custom_outcome: customOutcome, audio_seconds: Math.round(durationSeconds) },
                });

                if (recording && recording.size > 0) uploadRecording.mutate({ id: callId, blob: recording });
                return call;
            } finally {
                setIsFinishing(false);
            }
        },
        [copilot, endCall, uploadRecording],
    );

    return { finish, isFinishing };
};
