// UI languages. Left-to-right, non-Asian scripts only (no Arabic/Hebrew or other RTL, no CJK/Indic/etc.).
export const UiLanguages = [
    { code: "en", label: "English", flag: "GB", dateLocale: "enUS" },
    { code: "el", label: "Ελληνικά", flag: "GR", dateLocale: "el" },
    { code: "es", label: "Español", flag: "ES", dateLocale: "es" },
    { code: "fr", label: "Français", flag: "FR", dateLocale: "fr" },
    { code: "de", label: "Deutsch", flag: "DE", dateLocale: "de" },
    { code: "it", label: "Italiano", flag: "IT", dateLocale: "it" },
    { code: "pt", label: "Português", flag: "PT", dateLocale: "pt" },
    { code: "nl", label: "Nederlands", flag: "NL", dateLocale: "nl" },
    { code: "pl", label: "Polski", flag: "PL", dateLocale: "pl" },
    { code: "ro", label: "Română", flag: "RO", dateLocale: "ro" },
    { code: "tr", label: "Türkçe", flag: "TR", dateLocale: "tr" },
    { code: "sv", label: "Svenska", flag: "SE", dateLocale: "sv" },
] as const;

export type UiLanguageCode = (typeof UiLanguages)[number]["code"];

export const DEFAULT_UI_LANGUAGE: UiLanguageCode = "en";
export const SUPPORTED_UI_LANGUAGE_CODES = UiLanguages.map((language) => language.code) as UiLanguageCode[];
