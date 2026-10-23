import { Tones, type Tone } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const ToneFormOptions: { id: Tone; label: string }[] = [
    { id: Tones.PROFESSIONAL, label: "Professional" },
    { id: Tones.FRIENDLY, label: "Friendly" },
    { id: Tones.CONSULTATIVE, label: "Consultative" },
    { id: Tones.ASSERTIVE, label: "Assertive" },
];

export function getToneLabel(value: Tone | string | null | undefined): string {
    return ToneFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
