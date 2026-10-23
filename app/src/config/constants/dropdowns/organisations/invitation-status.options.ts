import { InvitationStatuses, type InvitationStatus } from "@/features/organisations/interfaces/organisations.interfaces";

export const InvitationStatusOptions: { id: InvitationStatus; label: string }[] = [
    { id: InvitationStatuses.PENDING, label: "Pending" },
    { id: InvitationStatuses.EXPIRED, label: "Expired" },
    { id: InvitationStatuses.ACCEPTED, label: "Accepted" },
    { id: InvitationStatuses.REVOKED, label: "Revoked" },
];

export function getInvitationStatusLabel(value: InvitationStatus | string): string {
    return InvitationStatusOptions.find((option) => option.id === value)?.label ?? String(value);
}
