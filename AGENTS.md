## API rules (`api/**`)

@.cursor/rules/api-code-structure-and-best-practices.mdc

## App rules — HeroUI starter (`app/**`)

@.cursor/rules/app-code-structure-and-best-practices.mdc

## App rules — shadcn/ui starters (`react-starter/**`, `nextjs-app/**`)

@.cursor/rules/app-shadcn-code-structure-and-best-practices.mdc

## Translations (i18n)

Whenever you add or change a user-visible string in `app/`, add the key to **all 12 locale files** (`en`, `el`, `de`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `ro`, `sv`, `tr` under `app/src/i18n/locales/<lang>/`) in the same change, with real translations rather than English copies. Never rely on the fallback to `en`. See the "Translations" section of the app rules for details.

## Local development

For local API work, use `.env.staging` (`npm run start:staging` in `api/`), not `.env.local` — `.env.local` has empty/placeholder integration keys (e.g. `RESEND_API_KEY`), so flows like email sending fail locally with it. `.env.staging` has working keys.
