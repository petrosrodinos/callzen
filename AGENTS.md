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

## Monetization guard rails (`api/**`, `app/**`)

- **Never hardcode prices or plan limits.** AI prices come from models.dev via `ModelPricingService` (manual prices only in the `pricing.model_overrides` AppConfig key). Plan limits, feature flags, analysis visibility, Stripe price ids and default models live in AppConfig (`api/src/modules/app-config/registry`); read them through `AppConfigService` / `EntitlementsService`, never from the seed constants.
- **Adding a setting** = a registry entry (Zod schema + default). `ensureDefaults()` writes it on boot without overwriting admin edits.
- **Every create/start/upload/invite path goes through `PlanLimitService`**; plan features on endpoints use `@RequiresFeature(...)` (enforced by `OrgGuard`). Record AI usage with `UsageService.record` (tokens or audio durations) — costs and markup are computed there.
- **Only platform `ADMIN` / `SUPER_ADMIN` see AI costs and model choices.** The API omits money fields for everyone else; don't add cost data to user-facing responses.
- **No scheduled deletion of user data.** Nothing expires automatically; only user-initiated deletes exist (§7 of `docs/Monetization_Implementation_Plan.md`).

