import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface OrganisationStore {
    activeOrganisationId: string | null;
    setActiveOrganisationId(id: string | null): void;
}

const STORE_KEY = "organisation";

export const useOrganisationStore = create<OrganisationStore>()(
    devtools(
        persist(
            (set) => ({
                activeOrganisationId: null,
                setActiveOrganisationId: (id) => set({ activeOrganisationId: id }),
            }),
            { name: STORE_KEY },
        ),
    ),
);

// For non-React contexts such as the Axios interceptors.
export const getOrganisationStoreState = () => useOrganisationStore.getState();
