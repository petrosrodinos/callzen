import i18n from "@/i18n";
import { AgentVisibilities, type AgentVisibility } from "@/features/agent-access/interfaces/agent-access.interfaces";

export const AgentVisibilityFormOptions: { id: AgentVisibility; label: string }[] = [
    { id: AgentVisibilities.ORGANISATION, label: i18n.t("options:access.visibility.organisation") },
    { id: AgentVisibilities.SELECTED, label: i18n.t("options:access.visibility.selected") },
];

export const AgentVisibilityDescriptionOptions: { id: AgentVisibility; description: string }[] = [
    { id: AgentVisibilities.ORGANISATION, description: i18n.t("options:access.visibilityDescription.organisation") },
    { id: AgentVisibilities.SELECTED, description: i18n.t("options:access.visibilityDescription.selected") },
];

export function getAgentVisibilityLabel(value: AgentVisibility | string): string {
    return AgentVisibilityFormOptions.find((option) => option.id === value)?.label ?? String(value);
}

export function getAgentVisibilityDescription(value: AgentVisibility | string): string {
    return AgentVisibilityDescriptionOptions.find((option) => option.id === value)?.description ?? "";
}
