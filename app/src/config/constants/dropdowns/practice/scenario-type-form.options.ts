import { ScenarioTypes, type ScenarioType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const ScenarioTypeFormOptions: { id: ScenarioType; label: string }[] = [
    { id: ScenarioTypes.COLD_CALL, label: i18n.t("options:practice.scenario.coldCall") },
    { id: ScenarioTypes.INBOUND, label: i18n.t("options:practice.scenario.inbound") },
    { id: ScenarioTypes.FOLLOW_UP, label: i18n.t("options:practice.scenario.followUp") },
    { id: ScenarioTypes.DEMO_FOLLOW_UP, label: i18n.t("options:practice.scenario.demoFollowUp") },
    { id: ScenarioTypes.DISCOVERY, label: i18n.t("options:practice.scenario.discovery") },
    { id: ScenarioTypes.RENEWAL, label: i18n.t("options:practice.scenario.renewal") },
    { id: ScenarioTypes.NEGOTIATION, label: i18n.t("options:practice.scenario.negotiation") },
    { id: ScenarioTypes.GATEKEEPER, label: i18n.t("options:practice.scenario.gatekeeper") },
];

export function getScenarioTypeLabel(value: ScenarioType | string | null | undefined): string {
    return ScenarioTypeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
