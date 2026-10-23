import { ScriptStageTypes, type ScriptStageType } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const ScriptStageFormOptions: { id: ScriptStageType; label: string }[] = [
    { id: ScriptStageTypes.OPENER, label: "Opener" },
    { id: ScriptStageTypes.PITCH, label: "Pitch" },
    { id: ScriptStageTypes.DISCOVERY, label: "Discovery" },
    { id: ScriptStageTypes.OBJECTION_HANDLING, label: "Objection handling" },
    { id: ScriptStageTypes.CLOSE, label: "Close" },
    { id: ScriptStageTypes.OTHER, label: "Other" },
];

export function getScriptStageLabel(value: ScriptStageType | string | null | undefined): string {
    return ScriptStageFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
