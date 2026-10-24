import i18n from "@/i18n";
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
    if (!isMediaCaptureSupported()) throw new CaptureError(i18n.t("common:errors.audio.micUnsupported"));
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
    } catch (error) {
        const name = (error as DOMException)?.name;
        if (name === "NotAllowedError") throw new CaptureError(i18n.t("common:errors.audio.micBlocked"));
        if (name === "NotFoundError") throw new CaptureError(i18n.t("common:errors.audio.micNotFound"));
        throw new CaptureError(i18n.t("common:errors.audio.micFailed"));
    }
};

// Captures the meeting tab's audio (the other participants). Chrome requires video to be requested,
// so the video track is stopped immediately.
export const getTabAudioStream = async (): Promise<MediaStream> => {
    if (!isTabAudioCaptureSupported()) throw new CaptureError(i18n.t("common:errors.audio.tabUnsupported"));
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
    } catch {
        throw new CaptureError(i18n.t("common:errors.audio.shareCancelled"));
    }

    stream.getVideoTracks().forEach((track) => track.stop());
    if (!stream.getAudioTracks().length) {
        throw new CaptureError(i18n.t("common:errors.audio.noAudioShared"));
    }
    return new MediaStream(stream.getAudioTracks());
};

export const stopStream = (stream: MediaStream | null | undefined) => {
    stream?.getTracks().forEach((track) => track.stop());
};
