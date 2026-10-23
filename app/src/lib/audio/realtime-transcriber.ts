import { RealtimeConnection, type RealtimeServerEvent } from "./realtime-connection";

export interface TranscribedPhrase {
    id: string;
    text: string;
    startMs: number;
    endMs: number;
}

export interface RealtimeTranscriberOptions {
    track: MediaStreamTrack;
    clock: () => number;
    createSession: () => Promise<{ client_secret: string; webrtc_url: string }>;
    exchangeSdp: (args: { url: string; clientSecret: string; offerSdp: string }) => Promise<string>;
    onPhrase: (phrase: TranscribedPhrase) => void;
    onInterim?: (text: string) => void;
    onSpeaking?: (speaking: boolean) => void;
    onStatus?: (status: "connecting" | "live" | "reconnecting" | "failed") => void;
}

const MAX_RECONNECTS = 3;

// Streams one audio channel to an OpenAI Realtime session that only transcribes, and turns
// server VAD + transcription events into timestamped phrases. Reconnects on dropped connections.
export class RealtimeTranscriber {
    private connection: RealtimeConnection | null = null;
    private readonly options: RealtimeTranscriberOptions;
    private starts = new Map<string, number>();
    private ends = new Map<string, number>();
    private interim = new Map<string, string>();
    private reconnects = 0;
    private stopped = false;

    constructor(options: RealtimeTranscriberOptions) {
        this.options = options;
    }

    async start() {
        this.stopped = false;
        this.options.onStatus?.("connecting");
        await this.connect();
    }

    private async connect() {
        const session = await this.options.createSession();
        const connection = new RealtimeConnection({
            track: this.options.track,
            playRemoteAudio: false,
            exchangeSdp: (offerSdp) => this.options.exchangeSdp({ url: session.webrtc_url, clientSecret: session.client_secret, offerSdp }),
            onEvent: (event) => this.handleEvent(event),
            onStateChange: (state) => {
                if ((state === "failed" || state === "disconnected") && !this.stopped) void this.reconnect();
            },
        });
        this.connection = connection;
        await connection.connect();
        this.reconnects = 0;
        this.options.onStatus?.("live");
    }

    private async reconnect() {
        if (this.stopped) return;
        this.connection?.close();
        this.connection = null;
        if (this.reconnects >= MAX_RECONNECTS) {
            this.options.onStatus?.("failed");
            return;
        }
        this.reconnects += 1;
        this.options.onStatus?.("reconnecting");
        await new Promise((resolve) => window.setTimeout(resolve, 1000 * this.reconnects));
        try {
            await this.connect();
        } catch {
            void this.reconnect();
        }
    }

    private handleEvent(event: RealtimeServerEvent) {
        const itemId = String(event.item_id ?? "");
        switch (event.type) {
            case "input_audio_buffer.speech_started":
                this.starts.set(itemId, this.options.clock() - 300);
                this.options.onSpeaking?.(true);
                break;
            case "input_audio_buffer.speech_stopped":
                this.ends.set(itemId, this.options.clock());
                this.options.onSpeaking?.(false);
                break;
            case "conversation.item.input_audio_transcription.delta": {
                const text = `${this.interim.get(itemId) ?? ""}${String(event.delta ?? "")}`;
                this.interim.set(itemId, text);
                this.options.onInterim?.(text);
                break;
            }
            case "conversation.item.input_audio_transcription.completed": {
                const text = String(event.transcript ?? "").trim();
                const endMs = this.ends.get(itemId) ?? this.options.clock();
                const startMs = this.starts.get(itemId) ?? Math.max(0, endMs - text.split(/\s+/).length * 400);
                this.starts.delete(itemId);
                this.ends.delete(itemId);
                this.interim.delete(itemId);
                this.options.onInterim?.("");
                if (text) this.options.onPhrase({ id: itemId, text, startMs, endMs });
                break;
            }
            default:
                break;
        }
    }

    setEnabled(enabled: boolean) {
        this.options.track.enabled = enabled;
    }

    stop() {
        this.stopped = true;
        this.connection?.close();
        this.connection = null;
    }
}
