import { CallTypes, type CallType } from "@/features/calls/interfaces/calls.interfaces";

export const CallTypeFormOptions: { id: CallType; label: string }[] = [
    { id: CallTypes.ONLINE_MEETING, label: "Online meeting" },
    { id: CallTypes.MICROPHONE, label: "Phone / microphone" },
    { id: CallTypes.PRACTICE, label: "Practice session" },
];

export function getCallTypeLabel(value: CallType | string | null | undefined): string {
    return CallTypeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}

export const LiveCallTypeDescriptionOptions: { id: CallType; label: string; description: string }[] = [
    {
        id: CallTypes.MICROPHONE,
        label: "Phone / microphone",
        description: "A call on your phone's speaker or another device. CallZen listens through this device's microphone. Best for cold calls.",
    },
    {
        id: CallTypes.ONLINE_MEETING,
        label: "Online meeting",
        description: "Google Meet, Zoom, Teams or any web meeting. You share the meeting tab's audio so both sides are captured separately.",
    },
];
