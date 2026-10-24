import { Tones, type Tone } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const ToneFormOptions: { id: Tone; label: string }[] = [
    { id: Tones.PROFESSIONAL, label: i18n.t("options:agents.tone.professional") },
    { id: Tones.FRIENDLY, label: i18n.t("options:agents.tone.friendly") },
    { id: Tones.CONSULTATIVE, label: i18n.t("options:agents.tone.consultative") },
    { id: Tones.ASSERTIVE, label: i18n.t("options:agents.tone.assertive") },
];

export function getToneLabel(value: Tone | string | null | undefined): string {
    return ToneFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
