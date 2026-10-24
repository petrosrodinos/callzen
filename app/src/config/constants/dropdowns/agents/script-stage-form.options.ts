import { ScriptStageTypes, type ScriptStageType } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const ScriptStageFormOptions: { id: ScriptStageType; label: string }[] = [
    { id: ScriptStageTypes.OPENER, label: i18n.t("options:agents.scriptStage.opener") },
    { id: ScriptStageTypes.PITCH, label: i18n.t("options:agents.scriptStage.pitch") },
    { id: ScriptStageTypes.DISCOVERY, label: i18n.t("options:agents.scriptStage.discovery") },
    { id: ScriptStageTypes.OBJECTION_HANDLING, label: i18n.t("options:agents.scriptStage.objectionHandling") },
    { id: ScriptStageTypes.CLOSE, label: i18n.t("options:agents.scriptStage.close") },
    { id: ScriptStageTypes.OTHER, label: i18n.t("options:agents.scriptStage.other") },
];

export function getScriptStageLabel(value: ScriptStageType | string | null | undefined): string {
    return ScriptStageFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
