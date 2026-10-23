export const OutputLanguageModes = {
    CONVERSATION: "CONVERSATION",
    INTERFACE: "INTERFACE",
} as const;
export type OutputLanguageMode = (typeof OutputLanguageModes)[keyof typeof OutputLanguageModes];

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    role: RoleType;
    interface_language: string;
    output_language_mode: OutputLanguageMode;
    consent_line: string | null;
    keep_recordings: boolean;
    consent_acknowledged_at: string | null;
    default_consent_line: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateUserDto {
    full_name?: string;
    interface_language?: string;
    output_language_mode?: OutputLanguageMode;
    consent_line?: string;
    keep_recordings?: boolean;
    consent_acknowledged?: boolean;
}

export interface LoggedInUser {
    user_uuid: string | null;
    email: string | null;
    role: RoleType | null;
    access_token: string | null;
    expires_in: number | null;
    avatar?: string | null;
    full_name?: string | null;
    isLoggedIn?: boolean | null;
}

export const RoleTypes = {
    USER: "USER",
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    SUPPORT: "SUPPORT",
} as const;

export type RoleType = (typeof RoleTypes)[keyof typeof RoleTypes];
