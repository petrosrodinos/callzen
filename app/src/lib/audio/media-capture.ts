export class CaptureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CaptureError";
    }
}

export const isMediaCaptureSupported = (): boolean =>
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== "undefined";

export const isTabAudioCaptureSupported = (): boolean =>
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const getMicrophoneStream = async (): Promise<MediaStream> => {
    if (!isMediaCaptureSupported()) throw new CaptureError("This browser does not support microphone capture. Try the latest Chrome, Edge or Safari.");
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
    } catch (error) {
        const name = (error as DOMException)?.name;
        if (name === "NotAllowedError") throw new CaptureError("Microphone access was blocked. Allow it in your browser's site settings and try again.");
        if (name === "NotFoundError") throw new CaptureError("No microphone was found. Connect one and try again.");
        throw new CaptureError("Could not access the microphone.");
    }
};

// Captures the meeting tab's audio (the other participants). Chrome requires video to be requested,
// so the video track is stopped immediately.
export const getTabAudioStream = async (): Promise<MediaStream> => {
    if (!isTabAudioCaptureSupported()) throw new CaptureError("Capturing meeting audio needs a desktop browser such as Chrome or Edge.");
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
    } catch {
        throw new CaptureError("Screen sharing was cancelled. Pick your meeting tab and enable \"Share tab audio\".");
    }

    stream.getVideoTracks().forEach((track) => track.stop());
    if (!stream.getAudioTracks().length) {
        throw new CaptureError("No audio was shared. Select the meeting's browser tab and turn on \"Share tab audio\".");
    }
    return new MediaStream(stream.getAudioTracks());
};

export const stopStream = (stream: MediaStream | null | undefined) => {
    stream?.getTracks().forEach((track) => track.stop());
};
