import { DecisionAuthorityTypes, type DecisionAuthorityType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const DecisionAuthorityFormOptions: { id: DecisionAuthorityType; label: string }[] = [
    { id: DecisionAuthorityTypes.DECISION_MAKER, label: i18n.t("options:practice.authority.decisionMaker") },
    { id: DecisionAuthorityTypes.INFLUENCER, label: i18n.t("options:practice.authority.influencer") },
    { id: DecisionAuthorityTypes.GATEKEEPER, label: i18n.t("options:practice.authority.gatekeeper") },
    { id: DecisionAuthorityTypes.NEEDS_APPROVAL, label: i18n.t("options:practice.authority.needsApproval") },
];

export function getDecisionAuthorityLabel(value: DecisionAuthorityType | string | null | undefined): string {
    return DecisionAuthorityFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
