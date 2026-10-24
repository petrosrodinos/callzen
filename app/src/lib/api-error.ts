import i18n from "@/i18n";
import { isAxiosError } from "axios";

// Turns an Axios/Nest error into a human-readable message; falls back when the server gave none.
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (isAxiosError(error)) {
        const message = error.response?.data?.message;
        if (Array.isArray(message)) return message.join(". ");
        if (typeof message === "string" && message.trim()) return message;
        if (!error.response) return i18n.t("common:errors.lib.network");
    }
    return fallback;
};

export const getApiErrorCode = (error: unknown): string | undefined => {
    if (isAxiosError(error)) return error.response?.data?.code;
    return undefined;
};

export class ApiError extends Error {
    readonly code?: string;
    readonly status?: number;

    constructor(error: unknown, fallback: string) {
        super(getApiErrorMessage(error, fallback), { cause: error });
        this.code = getApiErrorCode(error);
        this.status = isAxiosError(error) ? error.response?.status : undefined;
    }
}
