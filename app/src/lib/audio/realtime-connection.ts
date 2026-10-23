// Thin wrapper around an OpenAI Realtime WebRTC session: sends one local audio track,
// optionally plays the remote audio, and exposes the JSON event data channel.

export type RealtimeServerEvent = { type: string; [key: string]: unknown };

export interface RealtimeConnectionOptions {
    track: MediaStreamTrack;
    exchangeSdp: (offerSdp: string) => Promise<string>;
    onEvent: (event: RealtimeServerEvent) => void;
    onStateChange?: (state: RTCPeerConnectionState) => void;
    onRemoteStream?: (stream: MediaStream) => void;
    playRemoteAudio?: boolean;
}

export class RealtimeConnection {
    private peer: RTCPeerConnection | null = null;
    private channel: RTCDataChannel | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private remoteStream: MediaStream | null = null;
    private readonly options: RealtimeConnectionOptions;

    constructor(options: RealtimeConnectionOptions) {
        this.options = options;
    }

    async connect(): Promise<void> {
        const peer = new RTCPeerConnection();
        this.peer = peer;

        peer.onconnectionstatechange = () => this.options.onStateChange?.(peer.connectionState);
        peer.ontrack = (event) => {
            this.remoteStream = event.streams[0] ?? new MediaStream([event.track]);
            this.options.onRemoteStream?.(this.remoteStream);
            if (this.options.playRemoteAudio) {
                const audio = this.audioElement ?? new Audio();
                audio.autoplay = true;
                audio.srcObject = this.remoteStream;
                this.audioElement = audio;
                void audio.play().catch(() => undefined);
            }
        };

        peer.addTrack(this.options.track, new MediaStream([this.options.track]));

        const channel = peer.createDataChannel("oai-events");
        this.channel = channel;
        const opened = new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error("Realtime data channel did not open in time")), 15000);
            channel.onopen = () => {
                window.clearTimeout(timer);
                resolve();
            };
        });
        channel.onmessage = (message) => {
            try {
                this.options.onEvent(JSON.parse(message.data));
            } catch {
                // Ignore malformed frames.
            }
        };

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const answer = await this.options.exchangeSdp(offer.sdp ?? "");
        await peer.setRemoteDescription({ type: "answer", sdp: answer });
        await opened;
    }

    send(event: Record<string, unknown>): boolean {
        if (this.channel?.readyState !== "open") return false;
        this.channel.send(JSON.stringify(event));
        return true;
    }

    getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }

    setOutputMuted(muted: boolean) {
        if (this.audioElement) this.audioElement.muted = muted;
    }

    replaceTrack(track: MediaStreamTrack) {
        const sender = this.peer?.getSenders().find((s) => s.track?.kind === "audio");
        void sender?.replaceTrack(track);
    }

    close() {
        try {
            this.channel?.close();
        } catch {
            // already closed
        }
        this.peer?.getSenders().forEach((sender) => {
            try {
                this.peer?.removeTrack(sender);
            } catch {
                // ignore
            }
        });
        this.peer?.close();
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.srcObject = null;
        }
        this.peer = null;
        this.channel = null;
        this.audioElement = null;
    }
}
