import type { CallType } from "@/features/calls/interfaces/calls.interfaces";
import { CallTypeFormOptions } from "@/config/constants/dropdowns/calls/call-type-form.options";

export const CallTypeFilterOptions: { id: CallType | "all"; label: string }[] = [{ id: "all", label: "All call types" }, ...CallTypeFormOptions];
