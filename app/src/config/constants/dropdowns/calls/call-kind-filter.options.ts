import { CallKinds, type CallKind } from "@/features/calls/interfaces/calls.interfaces";

export const CallKindFormOptions: { id: CallKind; label: string }[] = [
    { id: CallKinds.LIVE, label: "Live call" },
    { id: CallKinds.PRACTICE, label: "Practice" },
];

export const CallKindFilterOptions: { id: CallKind | "all"; label: string }[] = [{ id: "all", label: "Live & practice" }, ...CallKindFormOptions];

export function getCallKindLabel(value: CallKind | string): string {
    return CallKindFormOptions.find((option) => option.id === value)?.label ?? value;
}
