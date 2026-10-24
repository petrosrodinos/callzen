import { CallTypes, type CallType } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallTypeFormOptions: { id: CallType; label: string }[] = [
    { id: CallTypes.ONLINE_MEETING, label: i18n.t("options:calls.type.onlineMeeting") },
    { id: CallTypes.MICROPHONE, label: i18n.t("options:calls.type.microphone") },
    { id: CallTypes.PRACTICE, label: i18n.t("options:calls.type.practice") },
];

export function getCallTypeLabel(value: CallType | string | null | undefined): string {
    return CallTypeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const LiveCallTypeDescriptionOptions: { id: CallType; label: string; description: string }[] = [
    {
        id: CallTypes.MICROPHONE,
        label: i18n.t("options:calls.type.microphone"),
        description: i18n.t("options:calls.typeDescription.microphone"),
    },
    {
        id: CallTypes.ONLINE_MEETING,
        label: i18n.t("options:calls.type.onlineMeeting"),
        description: i18n.t("options:calls.typeDescription.onlineMeeting"),
    },
];
