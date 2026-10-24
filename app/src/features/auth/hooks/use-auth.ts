import i18n from "@/i18n";
import { adminLoginToAccount, refreshAccountToken, signIn, signUp } from "../services/auth";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { useNavigate } from "react-router-dom";
import type { SignInUser, SignUpUser } from "../interfaces/auth.interface";
import { Routes } from "@/routes/routes";
import type { LoggedInUser } from "@/features/user/interfaces/user.interface";
import { toast } from "@/hooks/use-toast";
import { consumeRedirect } from "@/lib/redirect";


export function useSignin() {
    const { login } = useAuthStore((state) => state);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: SignInUser) => signIn(data),
        onSuccess: (data: LoggedInUser) => {
            login({
                ...data,
                isLoggedIn: true,
            });
            toast({
                title: i18n.t("common:toasts.auth.loginSuccessful"),
                description: i18n.t("common:toasts.auth.youHaveSuccessfullyLoggedIn"),
                duration: 2000,
            });
            navigate(consumeRedirect(window.location.search) ?? Routes.dashboard);
        },
        onError: (error: any) => {
            toast({
                title: i18n.t("common:toasts.auth.couldNotSignIn"),
                description: error?.message || i18n.t("common:toasts.auth.anUnexpectedErrorOccurred"),
                duration: 3000,
                variant: "error",
            });
        },
    });
}


export function useSignup() {
    const { login } = useAuthStore((state) => state);
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (data: SignUpUser) => signUp(data),
        onSuccess: (data) => {
            login({
                ...data,
                isLoggedIn: true,
            });
            toast({
                title: i18n.t("common:toasts.auth.welcomeToCallzen"),
                description: i18n.t("common:toasts.auth.yourAccountIsReady"),
                duration: 2000,
            });
            navigate(consumeRedirect(window.location.search) ?? Routes.dashboard);
        },
        onError: (error) => {
            toast({
                title: i18n.t("common:toasts.auth.couldNotSignUp"),
                description: error.message,
                duration: 3000,
                variant: "error",
            });
        },
    });
}


export function useRefreshAccountToken() {
    const { login } = useAuthStore((state) => state);
    return useMutation({
        mutationFn: () => refreshAccountToken(),
        onSuccess: (data: LoggedInUser) => {
            login({ ...data, isLoggedIn: true });
        },
    });
}

export function useAdminLoginToAccount() {
    const { login } = useAuthStore((state) => state);

    return useMutation({
        mutationFn: (account_uuid: string) => adminLoginToAccount(account_uuid),
        onSuccess: (data: LoggedInUser) => {
            toast({
                title: i18n.t("common:toasts.auth.adminLoginSuccessful"),
                description: i18n.t("common:toasts.auth.youHaveSuccessfullyLoggedInAs"),
                duration: 2000,
            });
            login({
                ...data,
                isLoggedIn: true,
            });
        },
        onError: (error: any) => {
            toast({
                title: i18n.t("common:toasts.auth.couldNotAdminLoginToAccount"),
                description: error.message,
                duration: 3000,
                variant: "error",
            });
        },
    });
}