import { Speakers, type Speaker } from "@/features/calls/interfaces/calls.interfaces";

export const SpeakerOptions: { id: Speaker; label: string }[] = [
    { id: Speakers.USER, label: "You" },
    { id: Speakers.PROSPECT, label: "Prospect" },
    { id: Speakers.UNKNOWN, label: "Detecting…" },
];

export function getSpeakerLabel(value: Speaker | string | null | undefined): string {
    return SpeakerOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
