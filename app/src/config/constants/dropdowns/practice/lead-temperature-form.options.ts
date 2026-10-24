import { LeadTemperatures, type LeadTemperature } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const LeadTemperatureFormOptions: { id: LeadTemperature; label: string }[] = [
    { id: LeadTemperatures.COLD, label: i18n.t("options:practice.temperature.cold") },
    { id: LeadTemperatures.WARM, label: i18n.t("options:practice.temperature.warm") },
];

export function getLeadTemperatureLabel(value: LeadTemperature | string | null | undefined): string {
    return LeadTemperatureFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const LeadTemperatureDescriptionOptions: Record<LeadTemperature, string> = {
    [LeadTemperatures.COLD]: i18n.t("options:practice.temperatureDescription.cold"),
    [LeadTemperatures.WARM]: i18n.t("options:practice.temperatureDescription.warm"),
};

export const LeadTemperatureFilterOptions: { id: LeadTemperature | "all"; label: string }[] = [
    { id: "all", label: i18n.t("options:practice.temperatureFilter.any") },
    ...LeadTemperatureFormOptions,
];
