import i18n from "@/i18n";
// Browser-native speech recognition (Web Speech API) and synthesis, used by the free
// "Browser voice" provider and as a transcription fallback when realtime AI is unavailable.

interface SpeechRecognitionAlternativeLike {
    transcript: string;
}
interface SpeechRecognitionResultLike {
    isFinal: boolean;
    0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    onspeechstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const isSpeechRecognitionSupported = (): boolean => typeof window !== "undefined" && !!getRecognitionCtor();
export const isSpeechSynthesisSupported = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window;

const LANGUAGE_LOCALES: Record<string, string> = {
    en: "en-US", el: "el-GR", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", pt: "pt-PT", nl: "nl-NL",
    pl: "pl-PL", ro: "ro-RO", tr: "tr-TR", sv: "sv-SE", ar: "ar-SA", hi: "hi-IN", ja: "ja-JP", zh: "zh-CN",
};

export const toSpeechLocale = (language: string): string => LANGUAGE_LOCALES[language] ?? language;

export interface RecognizedPhrase {
    text: string;
    startMs: number;
    endMs: number;
}

export interface BrowserRecognizerOptions {
    language: string;
    clock: () => number;
    onFinal: (phrase: RecognizedPhrase) => void;
    onInterim?: (text: string) => void;
    onError?: (message: string) => void;
}

export class BrowserSpeechRecognizer {
    private recognition: SpeechRecognitionLike | null = null;
    private active = false;
    private phraseStart: number | null = null;
    private readonly options: BrowserRecognizerOptions;

    constructor(options: BrowserRecognizerOptions) {
        this.options = options;
    }

    start() {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
            this.options.onError?.(i18n.t("common:errors.audio.speechUnsupported"));
            return;
        }
        this.active = true;
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = toSpeechLocale(this.options.language);

        recognition.onspeechstart = () => {
            this.phraseStart ??= this.options.clock();
        };
        recognition.onresult = (event) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0]?.transcript?.trim() ?? "";
                if (!text) continue;
                this.phraseStart ??= this.options.clock();
                if (result.isFinal) {
                    const endMs = this.options.clock();
                    this.options.onFinal({ text, startMs: this.phraseStart ?? endMs, endMs });
                    this.phraseStart = null;
                } else {
                    interim += `${text} `;
                }
            }
            this.options.onInterim?.(interim.trim());
        };
        recognition.onerror = (event) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                this.active = false;
                this.options.onError?.(i18n.t("common:errors.audio.speechBlocked"));
            }
        };
        // Chrome stops continuous recognition after silence; restart while the session is active.
        recognition.onend = () => {
            if (this.active) {
                try {
                    recognition.start();
                } catch {
                    // already started
                }
            }
        };

        this.recognition = recognition;
        recognition.start();
    }

    pause() {
        this.active = false;
        this.recognition?.stop();
    }

    resume() {
        if (!this.recognition) return this.start();
        this.active = true;
        try {
            this.recognition.start();
        } catch {
            // already running
        }
    }

    stop() {
        this.active = false;
        this.recognition?.abort();
        this.recognition = null;
    }
}

export const listBrowserVoices = (): Promise<SpeechSynthesisVoice[]> =>
    new Promise((resolve) => {
        if (!isSpeechSynthesisSupported()) return resolve([]);
        const voices = window.speechSynthesis.getVoices();
        if (voices.length) return resolve(voices);
        const handle = () => resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.addEventListener("voiceschanged", handle, { once: true });
        window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
    });

export const speakText = async (text: string, { voiceName, language }: { voiceName?: string; language: string }): Promise<void> => {
    if (!isSpeechSynthesisSupported()) return;
    const voices = await listBrowserVoices();
    const locale = toSpeechLocale(language);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.voice =
        voices.find((voice) => voice.name === voiceName) ?? voices.find((voice) => voice.lang === locale) ?? voices.find((voice) => voice.lang.startsWith(language)) ?? null;
    utterance.rate = 1.03;

    return new Promise((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
};

export const cancelSpeech = () => {
    if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
};
