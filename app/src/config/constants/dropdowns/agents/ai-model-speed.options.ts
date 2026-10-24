import { AiModelSpeeds, type AiModelSpeed } from "@/features/catalog/interfaces/catalog.interfaces";
import i18n from "@/i18n";

export const AiModelSpeedOptions: { id: AiModelSpeed; label: string }[] = [
    { id: AiModelSpeeds.FASTEST, label: i18n.t("options:agents.modelSpeed.fastest") },
    { id: AiModelSpeeds.FAST, label: i18n.t("options:agents.modelSpeed.fast") },
    { id: AiModelSpeeds.BALANCED, label: i18n.t("options:agents.modelSpeed.balanced") },
    { id: AiModelSpeeds.THOROUGH, label: i18n.t("options:agents.modelSpeed.thorough") },
];

export function getAiModelSpeedLabel(value: AiModelSpeed | string | null | undefined): string {
    return AiModelSpeedOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const RelativeCostLabels: Record<number, string> = { 1: i18n.t("options:agents.relativeCost.1"), 2: i18n.t("options:agents.relativeCost.2"), 3: i18n.t("options:agents.relativeCost.3"), 4: i18n.t("options:agents.relativeCost.4") };
