import { InvitationStatuses, type InvitationStatus } from "@/features/organisations/interfaces/organisations.interfaces";
import i18n from "@/i18n";

export const InvitationStatusOptions: { id: InvitationStatus; label: string }[] = [
    { id: InvitationStatuses.PENDING, label: i18n.t("options:organisations.invitation.pending") },
    { id: InvitationStatuses.EXPIRED, label: i18n.t("options:organisations.invitation.expired") },
    { id: InvitationStatuses.ACCEPTED, label: i18n.t("options:organisations.invitation.accepted") },
    { id: InvitationStatuses.REVOKED, label: i18n.t("options:organisations.invitation.revoked") },
];

export function getInvitationStatusLabel(value: InvitationStatus | string): string {
    return InvitationStatusOptions.find((option) => option.id === value)?.label ?? String(value);
}
