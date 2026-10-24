import { UsageKinds, type UsageKind } from "@/features/usage/interfaces/usage.interfaces";
import i18n from "@/i18n";

export const UsageKindOptions: { id: UsageKind; label: string }[] = [
    { id: UsageKinds.SUGGESTION, label: i18n.t("options:usage.kind.suggestion") },
    { id: UsageKinds.ASK, label: i18n.t("options:usage.kind.ask") },
    { id: UsageKinds.ANALYSIS, label: i18n.t("options:usage.kind.analysis") },
    { id: UsageKinds.PRACTICE_TURN, label: i18n.t("options:usage.kind.practiceTurn") },
    { id: UsageKinds.PRACTICE_VOICE, label: i18n.t("options:usage.kind.practiceVoice") },
    { id: UsageKinds.TRANSCRIPTION, label: i18n.t("options:usage.kind.transcription") },
    { id: UsageKinds.GENERATION, label: i18n.t("options:usage.kind.generation") },
];

export function getUsageKindLabel(value: UsageKind | string | null | undefined): string {
    return UsageKindOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
