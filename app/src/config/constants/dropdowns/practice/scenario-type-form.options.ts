import { ScenarioTypes, type ScenarioType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const ScenarioTypeFormOptions: { id: ScenarioType; label: string }[] = [
    { id: ScenarioTypes.COLD_CALL, label: "Cold call" },
    { id: ScenarioTypes.INBOUND, label: "Inbound inquiry" },
    { id: ScenarioTypes.FOLLOW_UP, label: "Follow-up" },
    { id: ScenarioTypes.DEMO_FOLLOW_UP, label: "After a demo" },
    { id: ScenarioTypes.DISCOVERY, label: "Discovery call" },
    { id: ScenarioTypes.RENEWAL, label: "Renewal" },
    { id: ScenarioTypes.NEGOTIATION, label: "Price negotiation" },
    { id: ScenarioTypes.GATEKEEPER, label: "Gatekeeper" },
];

export function getScenarioTypeLabel(value: ScenarioType | string | null | undefined): string {
    return ScenarioTypeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
