import fixWebmDuration from "fix-webm-duration";

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export const pickRecorderMimeType = (): string => {
    if (typeof MediaRecorder === "undefined") return "";
    return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
};

// Mixes several audio streams (you + the prospect) into a single recording and exposes
// live input levels for the "listening" indicators.
export class CallRecorder {
    private context: AudioContext;
    private destination: MediaStreamAudioDestinationNode;
    private recorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private startedAt = 0;
    private pausedAt = 0;
    private pausedTotal = 0;
    private analysers = new Map<string, AnalyserNode>();
    private sources = new Map<string, MediaStreamAudioSourceNode>();

    constructor() {
        this.context = new AudioContext();
        this.destination = this.context.createMediaStreamDestination();
    }

    addStream(key: string, stream: MediaStream, { record = true }: { record?: boolean } = {}) {
        if (!stream.getAudioTracks().length) return;
        this.removeStream(key);
        const source = this.context.createMediaStreamSource(stream);
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        if (record) source.connect(this.destination);
        this.sources.set(key, source);
        this.analysers.set(key, analyser);
    }

    removeStream(key: string) {
        this.sources.get(key)?.disconnect();
        this.sources.delete(key);
        this.analysers.delete(key);
    }

    // 0..1 RMS level for a given input, used for the live audio meter.
    getLevel(key: string): number {
        const analyser = this.analysers.get(key);
        if (!analyser) return 0;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
            const normalized = (value - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.min(1, Math.sqrt(sum / data.length) * 4);
    }

    async start(record: boolean) {
        if (this.context.state === "suspended") await this.context.resume();
        this.startedAt = Date.now();
        if (!record) return;

        const mimeType = pickRecorderMimeType();
        this.recorder = new MediaRecorder(this.destination.stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
        this.recorder.ondataavailable = (event) => {
            if (event.data.size) this.chunks.push(event.data);
        };
        this.recorder.start(1000);
    }

    pause() {
        if (this.recorder?.state === "recording") this.recorder.pause();
        this.pausedAt = Date.now();
    }

    resume() {
        if (this.recorder?.state === "paused") this.recorder.resume();
        if (this.pausedAt) this.pausedTotal += Date.now() - this.pausedAt;
        this.pausedAt = 0;
    }

    get isRecording(): boolean {
        return !!this.recorder;
    }

    async stop(): Promise<Blob | null> {
        const recorder = this.recorder;
        if (!recorder) {
            await this.dispose();
            return null;
        }

        const stopped = new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
        });
        if (recorder.state !== "inactive") recorder.stop();
        await stopped;

        const type = recorder.mimeType || "audio/webm";
        const raw = new Blob(this.chunks, { type });
        const durationMs = Date.now() - this.startedAt - this.pausedTotal;
        await this.dispose();

        // MediaRecorder WebM files have no duration header, which breaks seeking. Patch it in.
        if (type.includes("webm")) {
            try {
                return await fixWebmDuration(raw, durationMs, { logger: false });
            } catch {
                return raw;
            }
        }
        return raw;
    }

    private async dispose() {
        this.sources.forEach((source) => source.disconnect());
        this.sources.clear();
        this.analysers.clear();
        this.recorder = null;
        this.chunks = [];
        if (this.context.state !== "closed") await this.context.close().catch(() => undefined);
    }
}
