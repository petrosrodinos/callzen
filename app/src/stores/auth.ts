import type { LoggedInUser } from "@/features/user/interfaces/user.interface";
import { create } from "zustand";
import { Routes } from "@/routes/routes";
import { devtools, persist } from "zustand/middleware";

interface UserStore extends LoggedInUser {
    login(user: any): void;
    logout(): void;
    updateUser(user: any): void;
}

const initialValues: UserStore = {
    isLoggedIn: false,
    user_uuid: null,
    role: null,
    full_name: "",
    email: null,
    access_token: null,
    expires_in: null,
    avatar: null,
    login: () => { },
    logout: () => { },
    updateUser: () => { },
};

const STORE_KEY = "auth";

export const useAuthStore = create<UserStore>()(
    devtools(
        persist(
            (set) => ({
                ...initialValues,
                login: (user: LoggedInUser) => {
                    set((state) => ({
                        ...state,
                        ...user,
                    }));
                },
                logout: () => {
                    set(initialValues);
                    localStorage.removeItem(STORE_KEY);
                    localStorage.removeItem("organisation");
                    window.location.href = Routes.auth.sign_in;
                },
                updateUser: async (user: Partial<LoggedInUser>) => {
                    set((state) => ({ ...state, ...user }));
                },
            }),
            {
                name: STORE_KEY,
            }
        )
    )
);

export const getAuthStoreState = () => useAuthStore.getState();