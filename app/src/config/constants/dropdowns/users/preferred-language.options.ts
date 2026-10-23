// Languages supported for calls; `flag` is the ISO country whose flag represents the language.
export const PreferredLanguageOptions = [
    { id: "en", label: "English", flag: "GB" },
    { id: "el", label: "Greek", flag: "GR" },
    { id: "es", label: "Spanish", flag: "ES" },
    { id: "fr", label: "French", flag: "FR" },
    { id: "de", label: "German", flag: "DE" },
    { id: "it", label: "Italian", flag: "IT" },
    { id: "pt", label: "Portuguese", flag: "PT" },
    { id: "nl", label: "Dutch", flag: "NL" },
    { id: "pl", label: "Polish", flag: "PL" },
    { id: "ro", label: "Romanian", flag: "RO" },
    { id: "tr", label: "Turkish", flag: "TR" },
    { id: "sv", label: "Swedish", flag: "SE" },
    { id: "ar", label: "Arabic", flag: "SA" },
    { id: "hi", label: "Hindi", flag: "IN" },
    { id: "ja", label: "Japanese", flag: "JP" },
    { id: "zh", label: "Chinese", flag: "CN" },
] as const;

export type PreferredLanguage = (typeof PreferredLanguageOptions)[number]["id"];

export const getLanguageFlag = (code: string): string | undefined => PreferredLanguageOptions.find((option) => option.id === code)?.flag;

export const DEFAULT_PREFERRED_LANGUAGE: PreferredLanguage = "en";

// Best guess from the browser (e.g. "el-GR" -> "el"), falling back to English.
export const detectPreferredLanguage = (): PreferredLanguage => {
    const code = navigator.language?.split("-")[0]?.toLowerCase();
    return PreferredLanguageOptions.find((option) => option.id === code)?.id ?? DEFAULT_PREFERRED_LANGUAGE;
};
