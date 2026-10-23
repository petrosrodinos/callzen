import { DecisionAuthorityTypes, type DecisionAuthorityType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const DecisionAuthorityFormOptions: { id: DecisionAuthorityType; label: string }[] = [
    { id: DecisionAuthorityTypes.DECISION_MAKER, label: "Decision maker" },
    { id: DecisionAuthorityTypes.INFLUENCER, label: "Influencer" },
    { id: DecisionAuthorityTypes.GATEKEEPER, label: "Gatekeeper" },
    { id: DecisionAuthorityTypes.NEEDS_APPROVAL, label: "Needs approval" },
];

export function getDecisionAuthorityLabel(value: DecisionAuthorityType | string | null | undefined): string {
    return DecisionAuthorityFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
