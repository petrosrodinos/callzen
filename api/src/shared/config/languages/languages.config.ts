export const SUPPORTED_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ro', name: 'Romanian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
];

export const languageName = (code: string | null | undefined): string =>
  SUPPORTED_LANGUAGES.find((language) => language.code === code)?.name ??
  code ??
  'English';

export const MAX_CONVERSATION_LANGUAGES = 5;
export const AUTO_LANGUAGE = 'auto';
export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(
  (language) => language.code,
);

// Deduplicates, caps at the maximum and guarantees the primary language comes first.
export const normalizeLanguages = (
  primary: string | null | undefined,
  languages: string[] | null | undefined,
): { language: string; languages: string[] } => {
  const list = [
    ...new Set([...(primary ? [primary] : []), ...(languages ?? [])]),
  ].slice(0, MAX_CONVERSATION_LANGUAGES);
  const resolved = list.length ? list : ['en'];
  return { language: resolved[0], languages: resolved };
};

export const languageNames = (codes: string[]): string =>
  codes.map(languageName).join(', ');
