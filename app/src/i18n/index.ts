import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { DEFAULT_UI_LANGUAGE, SUPPORTED_UI_LANGUAGE_CODES } from "./languages";

// locales/<lang>/<namespace>.json — English is the source of truth, other languages fall back to it per key.
const files = import.meta.glob<Record<string, unknown>>("./locales/*/*.json", { eager: true, import: "default" });

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, content] of Object.entries(files)) {
    const [, language, namespace] = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/) ?? [];
    if (!language || !namespace) continue;
    (resources[language] ??= {})[namespace] = content;
}

export const LANGUAGE_STORAGE_KEY = "callzen-language";

// Initialised synchronously (resources are bundled) so module-level `t()` calls — dropdown options, zod messages — resolve in the
// right language. Changing language reloads the page (see `changeLanguage`) to keep those module-level strings consistent.
void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        ns: Object.keys(resources[DEFAULT_UI_LANGUAGE] ?? {}),
        defaultNS: "common",
        fallbackLng: DEFAULT_UI_LANGUAGE,
        supportedLngs: SUPPORTED_UI_LANGUAGE_CODES,
        nonExplicitSupportedLngs: true,
        load: "languageOnly",
        interpolation: { escapeValue: false },
        detection: { order: ["localStorage", "navigator"], lookupLocalStorage: LANGUAGE_STORAGE_KEY, caches: ["localStorage"] },
        initAsync: false,
        react: { useSuspense: false },
    });

const applyDocumentLanguage = (language: string) => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
};
applyDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_UI_LANGUAGE);

// Persist the choice and reload so every module-level translated string is rebuilt in the new language.
export const changeLanguage = async (code: string) => {
    if (code === i18n.resolvedLanguage) return;
    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
        // storage unavailable: the choice only lasts for this page load
    }
    await i18n.changeLanguage(code);
    window.location.reload();
};

export const currentLanguage = () => i18n.resolvedLanguage ?? DEFAULT_UI_LANGUAGE;
export const currentLocale = () => currentLanguage();

export default i18n;
