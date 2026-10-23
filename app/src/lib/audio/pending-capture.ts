// Holds media streams captured on the call setup screen (where the browser requires a user
// gesture for screen/tab sharing) until the live call screen takes ownership of them.

export interface PendingCapture {
    callId: string;
    microphone: MediaStream;
    remote: MediaStream | null;
}

let pending: PendingCapture | null = null;

export const setPendingCapture = (capture: PendingCapture) => {
    pending = capture;
};

export const takePendingCapture = (callId: string): PendingCapture | null => {
    if (!pending || pending.callId !== callId) return null;
    const capture = pending;
    pending = null;
    return capture;
};
