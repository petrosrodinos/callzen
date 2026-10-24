import type { CallType } from "@/features/calls/interfaces/calls.interfaces";
import { CallTypeFormOptions } from "@/config/constants/dropdowns/calls/call-type-form.options";
import i18n from "@/i18n";

export const CallTypeFilterOptions: { id: CallType | "all"; label: string }[] = [{ id: "all", label: i18n.t("options:calls.typeFilter.all") }, ...CallTypeFormOptions];
