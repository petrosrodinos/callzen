import { Speakers, type Speaker } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const SpeakerOptions: { id: Speaker; label: string }[] = [
    { id: Speakers.USER, label: i18n.t("options:calls.speaker.user") },
    { id: Speakers.PROSPECT, label: i18n.t("options:calls.speaker.prospect") },
    { id: Speakers.UNKNOWN, label: i18n.t("options:calls.speaker.unknown") },
];

export function getSpeakerLabel(value: Speaker | string | null | undefined): string {
    return SpeakerOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
