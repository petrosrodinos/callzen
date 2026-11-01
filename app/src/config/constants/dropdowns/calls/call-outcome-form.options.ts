import { CallOutcomes, type CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallOutcomeFormOptions: { id: CallOutcome; label: string }[] = [
    { id: CallOutcomes.MEETING_BOOKED, label: i18n.t("options:calls.outcome.meetingBooked") },
    { id: CallOutcomes.DEAL_WON, label: i18n.t("options:calls.outcome.dealWon") },
    { id: CallOutcomes.FOLLOW_UP, label: i18n.t("options:calls.outcome.followUp") },
    { id: CallOutcomes.LOST, label: i18n.t("options:calls.outcome.lost") },
    { id: CallOutcomes.NO_DECISION, label: i18n.t("options:calls.outcome.noDecision") },
    { id: CallOutcomes.GATEKEEPER, label: i18n.t("options:calls.outcome.gatekeeper") },
    { id: CallOutcomes.NO_ANSWER, label: i18n.t("options:calls.outcome.noAnswer") },
    { id: CallOutcomes.VOICEMAIL, label: i18n.t("options:calls.outcome.voicemail") },
    { id: CallOutcomes.PROPOSAL_SENT, label: i18n.t("options:calls.outcome.proposalSent") },
    { id: CallOutcomes.QUALIFIED, label: i18n.t("options:calls.outcome.qualified") },
    { id: CallOutcomes.DISQUALIFIED, label: i18n.t("options:calls.outcome.disqualified") },
    { id: CallOutcomes.REFERRED, label: i18n.t("options:calls.outcome.referred") },
    { id: CallOutcomes.WRONG_NUMBER, label: i18n.t("options:calls.outcome.wrongNumber") },
    { id: CallOutcomes.CUSTOM, label: i18n.t("options:calls.outcome.custom") },
];

export function getCallOutcomeLabel(value: CallOutcome | string | null | undefined): string {
    return CallOutcomeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
