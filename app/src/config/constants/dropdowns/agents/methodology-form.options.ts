import { Methodologies, type Methodology } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const MethodologyFormOptions: { id: Methodology; label: string }[] = [
    { id: Methodologies.SPIN, label: "SPIN Selling" },
    { id: Methodologies.BANT, label: "BANT" },
    { id: Methodologies.MEDDIC, label: "MEDDIC" },
    { id: Methodologies.CHALLENGER, label: "Challenger" },
    { id: Methodologies.SANDLER, label: "Sandler" },
    { id: Methodologies.CUSTOM, label: "Custom / none" },
];

export function getMethodologyLabel(value: Methodology | string | null | undefined): string {
    return MethodologyFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
