import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PlanErrorDetails } from "@/features/billing/interfaces/billing.interfaces";

// Transient UI state (not persisted): the plan error currently shown in the upgrade dialog, and whether the
// Buy minutes dialog is open.
interface PlanPromptStore {
    error: PlanErrorDetails | null;
    buyMinutesOpen: boolean;
    showError(error: PlanErrorDetails): void;
    dismissError(): void;
    setBuyMinutesOpen(open: boolean): void;
}

const STORE_KEY = "plan-prompt";

export const usePlanPromptStore = create<PlanPromptStore>()(
    devtools(
        (set) => ({
            error: null,
            buyMinutesOpen: false,
            showError: (error) => set({ error }),
            dismissError: () => set({ error: null }),
            setBuyMinutesOpen: (open) => set({ buyMinutesOpen: open, ...(open && { error: null }) }),
        }),
        { name: STORE_KEY },
    ),
);

export const getPlanPromptStoreState = () => usePlanPromptStore.getState();
