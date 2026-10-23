import { AiModelSpeeds, type AiModelSpeed } from "@/features/catalog/interfaces/catalog.interfaces";

export const AiModelSpeedOptions: { id: AiModelSpeed; label: string }[] = [
    { id: AiModelSpeeds.FASTEST, label: "Fastest" },
    { id: AiModelSpeeds.FAST, label: "Fast" },
    { id: AiModelSpeeds.BALANCED, label: "Balanced" },
    { id: AiModelSpeeds.THOROUGH, label: "Thorough" },
];

export function getAiModelSpeedLabel(value: AiModelSpeed | string | null | undefined): string {
    return AiModelSpeedOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const RelativeCostLabels: Record<number, string> = { 1: "Low cost", 2: "Moderate cost", 3: "Higher cost", 4: "Premium cost" };
