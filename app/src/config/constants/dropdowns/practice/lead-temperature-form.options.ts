import { LeadTemperatures, type LeadTemperature } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const LeadTemperatureFormOptions: { id: LeadTemperature; label: string }[] = [
    { id: LeadTemperatures.COLD, label: "Cold" },
    { id: LeadTemperatures.WARM, label: "Warm" },
];

export function getLeadTemperatureLabel(value: LeadTemperature | string | null | undefined): string {
    return LeadTemperatureFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const LeadTemperatureDescriptionOptions: Record<LeadTemperature, string> = {
    [LeadTemperatures.COLD]: "Never heard of you, no expressed interest, possibly busy or annoyed at being called.",
    [LeadTemperatures.WARM]: "Has shown interest or had prior contact, and is more open to talking.",
};

export const LeadTemperatureFilterOptions: { id: LeadTemperature | "all"; label: string }[] = [
    { id: "all", label: "Any temperature" },
    ...LeadTemperatureFormOptions,
];
