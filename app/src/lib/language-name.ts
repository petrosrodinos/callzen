import { currentLanguage } from "@/i18n";

const cache = new Map<string, Intl.DisplayNames | null>();

const displayNames = (uiLanguage: string) => {
    if (!cache.has(uiLanguage)) {
        try {
            cache.set(uiLanguage, new Intl.DisplayNames([uiLanguage], { type: "language" }));
        } catch {
            cache.set(uiLanguage, null);
        }
    }
    return cache.get(uiLanguage) ?? null;
};

// Localised language name for a language code, in the current UI language. Falls back to the provided name (or the code).
export const getLanguageName = (code: string, fallbackName?: string) => {
    try {
        const name = displayNames(currentLanguage())?.of(code);
        if (name && name !== code) return name.charAt(0).toLocaleUpperCase(currentLanguage()) + name.slice(1);
    } catch {
        // invalid code for Intl: use the fallback
    }
    return fallbackName ?? code;
};
