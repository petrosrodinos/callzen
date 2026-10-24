import { CallKinds, type CallKind } from "@/features/calls/interfaces/calls.interfaces";
import i18n from "@/i18n";

export const CallKindFormOptions: { id: CallKind; label: string }[] = [
    { id: CallKinds.LIVE, label: i18n.t("options:calls.kind.live") },
    { id: CallKinds.PRACTICE, label: i18n.t("options:calls.kind.practice") },
];

export const CallKindFilterOptions: { id: CallKind | "all"; label: string }[] = [{ id: "all", label: i18n.t("options:calls.kind.all") }, ...CallKindFormOptions];

export function getCallKindLabel(value: CallKind | string): string {
    return CallKindFormOptions.find((option) => option.id === value)?.label ?? value;
}
