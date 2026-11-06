# CallZen – Monetization Implementation Plan

Status: **Implemented** (2026-11-06). See §17 for implementation notes and what still needs per-environment setup.
Date: 2026-11-01

This plan turns the earlier go-to-market and pricing proposal into a buildable blueprint. It adds the requirements from the review: models.dev pricing, the `AppConfig` table, configurable plan limits, a simpler cost UI, no automatic data retention, plan-based analysis visibility, and Extras left out of scope.

---

## 0. Summary

| # | Requirement | Outcome |
|---|---|---|
| 1 | models.dev pricing | `ModelPricingService` syncs `https://models.dev/api.json` into a local cache table. All cost calculations read from it. The hardcoded `input_per_million` / `output_per_million` / per-minute prices are removed. |
| 2 | AppConfig | A generic key/JSON table, with a typed registry in code (Zod schema plus default per key), an admin API and an admin page at `/admin/config`. The first key is `pricing.markup_percent`. |
| 3 | Configurable plan limits | Plan keys stay fixed in code (`STARTER`, `PRO`, `COACH`, plus `TRIAL`). All of their limits and feature flags live in AppConfig, seeded with the previously recommended values. Languages are not plan-restricted. |
| 4 | Simpler cost UI | **Only platform `ADMIN` / `SUPER_ADMIN` see AI costs** (total and per session). Everyone else sees **usage minutes only**. Model pickers, the price list, the by-model and by-activity breakdowns and browser voice are hidden. The backend keeps all of it. |
| 5 | Retention | Data is kept indefinitely. Nothing expires. Plan-based retention is removed from the proposal. Account deletion is unchanged. |
| 6 | Analysis visibility | The full analysis always runs and is always stored. A per-plan visibility matrix in AppConfig filters the API response. Locked sections show as upgrade teasers. |
| 7 | Extras | Branding, priority support, and affiliate/white-label are **out of scope**. |
| 8 | Everything else | Plans, pooled minutes, top-up packs, annual billing, trial, seats, the coach cohort dashboard, and Stripe billing are kept as proposed. |

---

## 1. Current state (verified in the codebase)

- **Pricing** is hardcoded in `api/src/shared/config/ai-models/ai-models.config.ts`. `AI_MODEL_CATALOG` holds 7 OpenAI models with `input_per_million` / `output_per_million`. `estimateTokenCost()` uses those values and returns `0` for unknown models.
- **Audio pricing** is hardcoded in `api/src/shared/config/voices/voice-providers.config.ts`:
  - `TRANSCRIPTION_COST_PER_MINUTE_USD = 0.006`
  - OpenAI Realtime `cost_per_minute_usd: 0.15`
  - Models: `REALTIME_VOICE_MODEL = 'gpt-realtime'`, `REALTIME_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe'`. Uploads use `gpt-4o-transcribe-diarize`.
- **Usage** is recorded through `UsageService.record()` into `UsageEvent`. Fields are `kind`, `model`, `input_tokens`, `output_tokens`, `audio_seconds` and `cost_usd` (a Float). Token costs are computed in `AiService.toResult()`. Audio costs are computed in `CallsService.recordAudioUsage()` and `CallTranscriptionService`.
- **The usage page** is `app/src/pages/settings/pages/usage/index.tsx`. It shows the total, `by_kind`, `by_model` and a model plus voice price list (from `GET /catalog`).
- **Model selection**:
  - `AssistantAgent.realtime_model` / `analysis_model`
  - The co-pilot editor's `models-section.tsx`
  - The model picker in `rerun-analysis-dialog.tsx`
- **Voice providers**: `PracticeAgent.voice_provider` (`OPENAI_REALTIME` | `BROWSER`) and `voice-picker.tsx`.
- **Roles**: `AuthRole` has `USER | ADMIN | SUPER_ADMIN | SUPPORT`. `RolesGuard` already lets `SUPER_ADMIN` through. The app already has an `/admin` area guarded by `ADMIN` / `SUPER_ADMIN`, with only a health page so far.
- **Organisations** own co-pilots, prospects, calls and usage. Billing therefore attaches to the **organisation**, not the user.
- **Retention**: no automatic expiry or cron deletes exist. Only user-initiated deletes exist (call, recording, transcript, organisation, account), plus the per-call `keep_recording` flag.
- **Stripe**: `api/src/integrations/stripe/` is scaffolded (customers, products, payments, webhooks, coupons) but not wired to any plan logic. `stripe@20` is installed.
- **Infrastructure**: BullMQ and Redis (cache-manager) are available for sync jobs and the entitlement cache.

---

## 2. Plans, limits and features (seed values)

These are **seed defaults only**. Every number and flag below is stored in AppConfig and can be edited by admins. The code never hardcodes a limit; it reads the effective config.

### 2.1 Plans

| Plan key | Price (Stripe) | Purpose |
|---|---|---|
| `TRIAL` | Free | New orgs and coach-invited students before they subscribe. One per owner. |
| `STARTER` | ~$29/mo | Individual rep |
| `PRO` | ~$59–79/mo | Serious individual |
| `COACH` | ~$149/mo base + ~$15–25 per extra seat | Coach plus students, with pooled usage |

Prices live in **Stripe** (see §8). AppConfig only stores the Stripe price IDs for each plan.

### 2.2 Limits (seed)

`null` means unlimited. "Pooled" means shared across the whole organisation for each billing period.

| Limit key | TRIAL | STARTER | PRO | COACH |
|---|---|---|---|---|
| `seats_included` | 1 | 1 | 1 | 11 (coach + 10 students) |
| `extra_seats_allowed` | false | false | false | true |
| `live_minutes_per_period` | 20 (lifetime, shared with practice) | 120 | 600 | 1,500 (pooled) |
| `practice_minutes_per_period` | – (shared with live, above) | 30 | 300 | 1,000 (pooled) |
| `live_minutes_reserved_for_owner_per_period` | null | null | null | 300 (carved out of the pooled 1,500) |
| `practice_minutes_reserved_for_owner_per_period` | null | null | null | 0 (supported, off by default) |
| `live_minutes_per_member_per_period` | null | null | null | 200 (applies to non-owner members) |
| `practice_minutes_per_member_per_period` | null | null | null | 150 (applies to non-owner members) |
| `copilots_max` | 1 | 1 | 5 | null |
| `practice_prospects_max` | 2 | 3 | 25 | null |
| `practice_prospects_per_member_max` | null | null | null | 15 (non-owner members, §10.1h) |
| `uploads_per_period` | 1 | 5 | 30 | 100 |
| `trial_days` | 14 | – | – | – |

**Coach protections (added in review).** The Coach pool is shared, so two controls stop students from locking the coach out:
- **Owner reserve.** With the seeds, 300 of the 1,500 live minutes can only be used by the org's `OWNER` members. Students share the remaining 1,200.
- **Per-member cap.** Non-owner members can use at most 200 live and 150 practice minutes each per period. With 10 students, the 200-minute cap (2,000 in total) is more than the 1,200 they share, which is intentional: not everyone uses their full share, and no single student can take more than a sixth of it.
- Owners are not subject to the per-member caps. They are limited only by the pool.
- Rules and formulas are in §8.3a. Validation: the reserve must not exceed the pool, and a cap must be at least 1 minute when set.

Change from the earlier proposal: Starter used to get "5 sessions on free browser voice". Browser voice is now hidden (§6), so Starter instead gets a small OpenAI Realtime practice allowance (30 min). This raises Starter's cost floor. Section 10 has the margin check.

### 2.3 Feature flags (seed)

| Feature key | TRIAL | STARTER | PRO | COACH |
|---|---|---|---|---|
| `knowledge_document_import` | false | false | true | true |
| `org_roles_permissions` | false | false | false | true |
| `org_invitations` | false | false | false | true |
| `view_all_member_calls` | false | false | false | true |
| `cohort_dashboard` | false | false | false | true |
| `topup_purchases` | false | true | true | true |
| `student_pages`, `practice_assignments`, `call_comments`, `coach_reports`, `student_export` | false | false | false | true (all five, see §10.1a) |
| `agent_access_control` | false | false | false | true (§10.1h) |

**Not plan-gated:**
- **Languages.** All plans get every supported language and the existing `MAX_CONVERSATION_LANGUAGES = 5` per co-pilot. That global constant is not a plan limit.
- **Retention.** Data is kept indefinitely on all plans (§7).
- **Personal dashboard and trends.** Available on all plans.

### 2.4 Top-ups and annual billing (kept from the proposal)

- **Top-up packs**: one-off Stripe purchases (or admin grants) that add minutes. Defaults are `+100 live minutes` and `+60 practice minutes`. The pack definitions are in AppConfig.
- **Top-up minutes never expire. They roll over** until used (decided in review). The plan's included minutes are always used first. Top-up minutes are drawn down only once the period's allowance is exhausted, oldest pack first (FIFO). They survive plan changes and cancellation, and are lost only when the organisation or account is deleted.
- **Everyone with a paid plan can buy minutes for themselves, with no involvement from the owner or coach** (decided in review). A top-up is either:
  - **Personal**: usable only by the buyer, in that organisation. Every member can buy these, including coach students. They never touch the shared pool or the per-member caps (§8.3a).
  - **Team pool**: shared by the whole organisation. Only the org `OWNER` (or an `ADMIN` with `billing.manage`) can buy these. Owners of orgs with more than one seat see both choices ("For the team" and "Just for me"). Solo users see a single "Buy minutes" button, since the choice makes no difference to them.
- The same packs (§2.1 `plans.topup_packs`) are used for both. Trial organisations can't buy either (`topup_purchases` is off for `TRIAL`) and are prompted to subscribe.
- **Annual billing**: each paid plan has a monthly and a yearly Stripe price, with the yearly price at about 2 months free. Monthly usage allowances still reset each month, anchored to the subscription start.

---

## 3. Database changes

### 3.1 New enums

```prisma
enum PlanKey {
  TRIAL
  STARTER
  PRO
  COACH
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  INCOMPLETE
}

enum SubscriptionSource {
  STRIPE   // managed by Stripe webhooks
  MANUAL   // assigned by a platform admin (e.g. first coaches for free)
}

enum PricingSource {
  MODELS_DEV
  MODELS_DEV_ALIAS     // resolved via alias / dated snapshot / secondary provider
  ADMIN_OVERRIDE
  UNPRICED
}
```

### 3.2 `AppConfig` (requirement 2)

One row per configuration key. The value is JSON, validated by a Zod schema registered in code for each key. Adding a new setting means adding a registry entry; no new table or mechanism is needed.

```prisma
model AppConfig {
  key           String   @id               // e.g. "pricing.markup_percent"
  value         Json
  version       Int      @default(1)        // optimistic concurrency
  updated_by_id String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  updated_by User? @relation(fields: [updated_by_id], references: [id], onDelete: SetNull)

  @@map("app_config")
}

model AppConfigHistory {
  id            String   @id @default(uuid())
  key           String
  old_value     Json?
  new_value     Json
  changed_by_id String?
  created_at    DateTime @default(now())

  @@index([key, created_at])
  @@map("app_config_history")
}
```

`AppConfigHistory` gives an audit trail of who changed a price markup or a limit, and when. It is also how admins see what a value was before.

### 3.3 Initial AppConfig keys

| Key | Shape (Zod) | Seed |
|---|---|---|
| `pricing.markup_percent` | `number`, min 0, max 1000 | `0` |
| `pricing.model_overrides` | `Record<modelId, { input?, output?, cache_read?, input_audio?, output_audio?, per_minute? }>`. Token prices are USD per 1M tokens; `per_minute` is USD per audio minute, for models billed by duration | Seeded for the transcription models models.dev doesn't price (§4.7a) |
| `pricing.audio_tokens_per_minute` | `{ input: number, output: number }` | `{ input: 600, output: 1200 }` (verified, §4.5) |
| `pricing.sync` | `{ enabled: boolean, interval_hours: number, providers: string[] }` | `{ enabled: true, interval_hours: 12, providers: ["openai"] }` |
| `plans.definitions` | `Record<PlanKey, { limits: {...}, features: {...} }>` | §2.2 and §2.3 |
| `plans.stripe_prices` | `Record<PlanKey, { monthly?: string, yearly?: string, extra_seat?: string }>` | empty strings, filled per environment |
| `plans.topup_packs` | `Array<{ id, label_key, live_minutes, practice_minutes, stripe_price_id }>` | 2 packs (§2.4) |
| `coaching.digest` | `{ enabled: boolean, weekday: 0-6, hour_utc: 0-23, improved_threshold: number }` | `{ enabled: true, weekday: 1, hour_utc: 7, improved_threshold: 5 }` |
| `coaching.inactive_days` | `number`, min 1 | `7` |
| `analysis.visibility` | `Record<PlanKey, Record<AnalysisFeatureKey, boolean>>` | §9.2 |
| `ai.default_models` | `{ realtime, analysis, utility, voice, transcription, upload_transcription }` | the current text-model constants, with `voice = gpt-realtime-2.1` plus the new transcription models (§4.7a) |

`ai.default_models` keeps model selection configurable for admins (requirement 4: "keep the underlying model-selection functionality") without exposing it to users.

### 3.4 `Subscription`

```prisma
model Subscription {
  id                       String             @id @default(uuid())
  organisation_id          String             @unique
  plan                     PlanKey
  status                   SubscriptionStatus
  source                   SubscriptionSource @default(STRIPE)
  billing_interval         String?            // "month" | "year"
  extra_seats              Int                @default(0)
  stripe_customer_id       String?            @unique
  stripe_subscription_id   String?            @unique
  current_period_start     DateTime
  current_period_end       DateTime
  trial_ends_at            DateTime?
  cancel_at_period_end     Boolean            @default(false)
  manual_note              String?            // why an admin granted this plan
  created_at               DateTime           @default(now())
  updated_at               DateTime           @updatedAt

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}
```

### 3.5 `UsageCredit` (top-ups, rolling over)

Each purchase or grant is one row with a remaining balance. There is no expiry date. A row is either **team** credit (`user_id` is null, shared by the organisation) or **personal** credit (`user_id` set, usable only by that user in that organisation).

```prisma
model UsageCredit {
  id                        String   @id @default(uuid())
  organisation_id           String
  user_id                   String?  // null = team pool, set = personal to this user
  live_seconds_granted      Int      @default(0)
  practice_seconds_granted  Int      @default(0)
  live_seconds_remaining    Int      @default(0)
  practice_seconds_remaining Int     @default(0)
  stripe_payment_id         String?  @unique
  granted_by_id             String?  // admin grant
  note                      String?
  created_at                DateTime @default(now())

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)
  user         User?        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([organisation_id, created_at])
  @@index([organisation_id, user_id])
  @@map("usage_credits")
}

model UsageCreditConsumption {
  id              String   @id @default(uuid())
  credit_id       String
  call_id         String?
  live_seconds    Int      @default(0)
  practice_seconds Int     @default(0)
  created_at      DateTime @default(now())

  credit UsageCredit @relation(fields: [credit_id], references: [id], onDelete: Cascade)

  @@index([credit_id])
  @@index([call_id])
  @@map("usage_credit_consumptions")
}
```

`UsageCreditConsumption` records which call used which credit. This gives an audit trail, and lets a deleted or failed call's seconds be refunded.

**Draw-down** happens in `EntitlementsService.settleCall(callId)`, called when a call ends (live and practice) or an upload is transcribed:
1. Work out how much of the call fits inside what the caller was allowed from the plan pool (including team credits) and any per-member cap (§8.3a). The rest is the **overflow**.
2. In one transaction (`SELECT … FOR UPDATE`), deduct the overflow from the **caller's personal credits**, oldest first, and insert consumption rows.
3. Team credits are drawn down separately, as part of the pool: they are consumed once the plan allowance for the period is used up, oldest first, exactly as before.
4. If the personal credits don't cover the overflow either (a concurrent-call race), the shortfall is logged as a soft overrun and is not charged.

**Pool and cap accounting excludes personal minutes.** The per-user and per-org aggregates in §8.1 are computed as `Call.duration_seconds` minus the seconds that the call took from personal credits (the `UsageCreditConsumption` rows for that `call_id`). A student spending bought minutes therefore never reduces the shared pool and never counts against their cap. If a failed call's consumption is refunded, its seconds count back toward the pool.

### 3.6 `ModelPrice` (models.dev cache, not a hand-managed price list)

```prisma
model ModelPrice {
  model_id        String        @id         // e.g. "gpt-4.1-mini"
  provider        String                    // e.g. "openai"
  source          PricingSource
  resolved_from   String?                   // e.g. "vercel/openai/gpt-4o-transcribe"
  cost            Json                      // raw models.dev `cost` object, USD per 1M tokens
  is_reasoning    Boolean       @default(false)
  modalities      Json          @default("{}")
  fetched_at      DateTime

  @@map("model_prices")
}
```

This table only caches the last successful models.dev sync, so the app works offline and survives models.dev downtime. Nobody edits it by hand. The only manual mechanism is `pricing.model_overrides` in AppConfig, used for models models.dev does not list.

### 3.7 `UsageEvent` changes

```prisma
model UsageEvent {
  // existing fields ...
  cost_usd              Float    @default(0)   // KEEP: base provider cost (no markup)
  charged_cost_usd      Float    @default(0)   // NEW: cost incl. markup at time of event
  markup_percent        Float    @default(0)   // NEW: markup applied
  cached_input_tokens   Int      @default(0)   // NEW
  reasoning_tokens      Int      @default(0)   // NEW
  pricing_source        PricingSource?         // NEW
  unit_prices           Json?                  // NEW: snapshot of the per-1M prices used

  @@index([call_id])                           // NEW: cost per session
}
```

**Why store the markup per event:**
- Changing the markup in AppConfig affects new usage only. Historical costs shown to users stay stable.
- Admins can still see base versus charged cost.
- `unit_prices` makes every cost auditable and reproducible.

### 3.8 Relations to add

- `Organisation`: `subscription Subscription?`, `usage_credits UsageCredit[]`
- `User`: `app_config_updates AppConfig[]`, `usage_credits UsageCredit[]`, and a nullable `stripe_customer_id String? @unique` (the person's own Stripe customer, used for personal top-ups; it is separate from the organisation's subscription customer)

### 3.9 Migrations

Migrations follow the existing `YYYYMMDDHHMMSS_name` convention in `api/prisma/migrations/`:

1. `…_app_config`: `AppConfig` and `AppConfigHistory`.
2. `…_model_prices`: enum `PricingSource` and `ModelPrice`.
3. `…_usage_event_pricing`: the new `UsageEvent` columns and the `call_id` index. Backfill: `charged_cost_usd = cost_usd`, `markup_percent = 0`, `pricing_source = NULL` (historical estimates).
4. `…_subscriptions`: enums `PlanKey`, `SubscriptionStatus`, `SubscriptionSource`, plus `Subscription`, `UsageCredit` (with `user_id`) and `UsageCreditConsumption`, and the new `User.stripe_customer_id` column.
5. Data migration (a script, not SQL): every existing organisation gets a `Subscription` row with `plan = PRO`, `status = TRIALING`, `source = MANUAL`, `trial_ends_at = now + 30 days` and the period set to the same 30 days (decided in review). When the trial ends without a paid subscription, the org becomes read-only (§8.4).
6. Data migration: every `PracticeAgent` with `voice_provider = BROWSER` is set to `OPENAI_REALTIME`. If its `voice` isn't a valid OpenAI voice, it becomes `marin` (decided in review).

### 3.10 Seed

- `api/prisma/seed.ts` is a new, **idempotent** script. Wire it into `package.json` `prisma.seed`. It upserts each AppConfig key only if it is missing and never overwrites admin edits.
- `AppConfigService.onModuleInit()` also calls `ensureDefaults()`. This means a fresh environment works even if nobody ran the seed, and a newly added registry key appears automatically after deploy.
- `ModelPricingService` runs a sync on boot if `model_prices` is empty.

---

## 4. AI pricing via models.dev (requirement 1)

### 4.1 Data source (researched)

- **Endpoint**: `GET https://models.dev/api.json` (about 6 MB, 235 providers at time of writing). MIT licensed, with no API key.
- **Shape**: `{ [providerId]: { id, name, npm, env, doc, models: { [modelId]: Model } } }`
- **Model fields used**:
  - `id`, `name`, `reasoning`, `modalities`, `limit`, `status`, `type`
  - `cost`, all in **USD per 1M tokens**: `cost.input`, `cost.output` (required) and `cost.cache_read`, `cost.cache_write`, `cost.reasoning`, `cost.input_audio`, `cost.output_audio` (optional)
  - `experimental.modes.fast.cost` (priority tier, ignored for now)
  - `canonical_model_id`
- **Coverage check** (2026-11-01, provider `openai`):

| Model used by CallZen | Status in models.dev |
|---|---|
| `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, `gpt-4o-mini`, `gpt-5`, `gpt-5-mini` | Listed under `openai`, prices match today's hardcoded values |
| `gpt-realtime` (practice voice) | Not listed under `openai`. **Deprecated by OpenAI, shutdown 2027-01-20.** Replacement `gpt-realtime-2.1` **is** listed under `openai` (input 4 / output 24 / cache_read 0.4 / input_audio 32 / output_audio 64) |
| `gpt-4o-transcribe` (live transcription) | Not under `openai`; only `vercel/openai/gpt-4o-transcribe`. **Deprecated, shutdown 2027-02-26** |
| `gpt-4o-transcribe-diarize` (uploads) | Not listed anywhere. **Deprecated, shutdown 2027-02-26** |
| `gpt-live-transcribe`, `gpt-transcribe` (OpenAI's named replacements) | Only via `llmgateway` with cost `0/0`, which is unusable, so they need `pricing.model_overrides` (§4.7a) |
| `text-embedding-3-small` (knowledge) | To verify during Phase 2 |

So the fallback chain in §4.4 is required, not optional.

### 4.2 `ModelPricingService` (new, `api/src/integrations/ai/services/model-pricing.service.ts`)

Responsibilities:
1. **Sync**:
   - Fetch `api.json`, with a timeout and an ETag / `If-Modified-Since` header if supported.
   - Validate with a lenient Zod schema. Unknown fields are ignored; a malformed model is skipped, not fatal.
   - Keep only providers in `pricing.sync.providers`, plus the secondary providers used for aliases.
   - Upsert `ModelPrice` rows for models CallZen uses: the curated catalog (§4.6) plus `ai.default_models`.
   - On failure, keep the last good snapshot and log a warning.
2. **Schedule**: a BullMQ repeatable job (`model-pricing-sync`) every `pricing.sync.interval_hours`, a boot-time sync if the table is empty, and a manual "Sync now" from the admin page.
3. **In-memory cache**: `Map<modelId, ResolvedPrice>`, refreshed after each sync. `estimate*()` calls are synchronous and never hit the network or the database on the hot path.
4. **Resolve**: `resolvePrice(modelId): ResolvedPrice` (§4.4).
5. **Estimate**:
   - `estimateTokenCost({ model, inputTokens, cachedInputTokens, outputTokens, reasoningTokens })`
   - `estimateAudioCost({ model, inputSeconds, outputSeconds })`
   - Both return `{ baseCostUsd, unitPrices, source }`.

### 4.3 Cost formulas

Token calls (all AI SDK `generateText` / `generateObject` / `streamText` calls via `AiService`):

```
uncachedInput = inputTokens - cachedInputTokens
base = ( uncachedInput     * cost.input
       + cachedInputTokens * (cost.cache_read ?? cost.input)
       + outputTokens      * cost.output
       + (cost.reasoning ? reasoningTokens * cost.reasoning : 0) ) / 1_000_000
```

OpenAI already includes reasoning tokens in `outputTokens`. `cost.reasoning` only applies when models.dev prices reasoning separately and the provider reports reasoning tokens outside the output count. The resolver handles this per provider to avoid double-counting.

AI SDK 7 provides `usage.inputTokens`, `usage.outputTokens`, `usage.cachedInputTokens` and `usage.reasoningTokens`. `AiService.withModelFallback` / `toResult` already receive token counts and just need to pass the extra two through.

Audio (realtime transcription, practice voice, upload transcription):

```
inputAudioTokens  = inputSeconds  / 60 * pricing.audio_tokens_per_minute.input
outputAudioTokens = outputSeconds / 60 * pricing.audio_tokens_per_minute.output
base = ( inputAudioTokens  * (cost.input_audio  ?? cost.input)
       + outputAudioTokens * (cost.output_audio ?? cost.output) ) / 1_000_000
```

The charged cost is:

```
charged = base * (1 + markup_percent / 100)
```

`markup_percent` is read from AppConfig at event time and stored on the event.

### 4.4 Price resolution fallback chain

For `modelId` (e.g. `gpt-4o-transcribe`):

1. `openai.models[modelId]` gives `MODELS_DEV`.
2. Alias resolution gives `MODELS_DEV_ALIAS`, trying in order:
   - Strip a dated snapshot suffix (`gpt-4o-2024-11-20` → `gpt-4o`).
   - A secondary provider that lists OpenAI models under `openai/<id>`. Vercel is first; the list is configurable in `pricing.sync`.
   - A small code-level alias map for known families, e.g. `gpt-4o-transcribe-diarize` → `gpt-4o-transcribe`, and `gpt-realtime` → `gpt-realtime-2.1`. The second one only prices historical or in-flight sessions; new sessions use `gpt-realtime-2.1` directly (§4.7a).
   - A secondary-provider entry with `cost.input == 0 && cost.output == 0` is treated as **not found**, so gateway placeholder prices are never used.
3. `pricing.model_overrides[modelId]` in AppConfig gives `ADMIN_OVERRIDE`. Overrides win over aliases (but not over a direct models.dev hit), so an admin can correct a bad alias.
4. If nothing matches, the result is `UNPRICED`:
   - The cost is recorded as `0` with `pricing_source = UNPRICED`.
   - A warning is logged once per model per process.
   - The model appears in the admin page's "Unpriced models" list with a button to add an override.
   - The feature itself never fails. This follows the existing rule: "Usage tracking must never break the feature that produced it."

### 4.5 Audio token rates

- OpenAI bills audio by audio tokens, but the realtime session runs browser-to-OpenAI over WebRTC. The server only knows durations, not token counts.
- The rates for converting minutes to tokens live in `pricing.audio_tokens_per_minute`.
  - **Verified**: OpenAI's realtime cost guide bills user audio at 1 token per 100 ms (**600 tokens/min**) and assistant audio at 1 token per 50 ms (**1,200 tokens/min**). These are the seed values.
  - They aren't hardcoded, so they can be tuned without a deploy.
  - **Worked example, `gpt-realtime-2.1` practice**: for 1 minute of the user and 1 minute of the prospect speaking, cost = 600 × $32/1M + 1,200 × $64/1M ≈ **$0.096**. This excludes the cached-context and text tokens that build up over a session, so treat it as a lower bound.
- For models priced by duration (`per_minute` override), cost = minutes × `per_minute`, and the token conversion is skipped.
- **Optional, later**: the client reports the `usage` from realtime `response.done` events when the call ends, and the server uses it when it is plausible against the duration. The client is untrusted, so the result is clamped to a range derived from the duration. This is not in this scope.

### 4.6 What happens to `ai-models.config.ts`

- `AI_MODEL_CATALOG` stays as the **curated allowlist**: which models CallZen supports, plus product metadata (`label`, `speed`, `quality`, `realtime_suitable`, `description`). This keeps the internal model-selection capability.
- Removed: `input_per_million`, `output_per_million` and `relative_cost` (the latter is now derived from the resolved price if still needed).
- `is_reasoning` is read from models.dev `reasoning` when available, with the catalog value as fallback.
- `estimateTokenCost()` is deleted. Callers use `ModelPricingService`.
- `RECOMMENDED_*` / `UTILITY_MODEL` / `REALTIME_*` constants become **fallbacks** behind `AppConfigService.get('ai.default_models')`.
- `voice-providers.config.ts`: `cost_per_minute_usd` and `TRANSCRIPTION_COST_PER_MINUTE_USD` are removed. Audio cost comes from `estimateAudioCost()`.

### 4.7a Required audio model migration (found while researching pricing)

OpenAI's deprecations page (checked 2026-11-01) lists hard shutdown dates for every audio model CallZen uses:

| Current model | Used for | Shutdown | Replacement | Pricing source after migration |
|---|---|---|---|---|
| `gpt-realtime` (`REALTIME_VOICE_MODEL`) | Practice prospect voice, and the realtime transcription session host model | **2027-01-20** | `gpt-realtime-2.1` | models.dev `openai` (direct hit) |
| `gpt-4o-transcribe` (`REALTIME_TRANSCRIPTION_MODEL`) | Live call transcription | **2027-02-26** | `gpt-live-transcribe` | `pricing.model_overrides` `per_minute` |
| `gpt-4o-transcribe-diarize` (`UPLOAD_TRANSCRIPTION_MODEL`) | Uploaded recordings | **2027-02-26** | `gpt-transcribe` | `pricing.model_overrides` `per_minute` |

- **Seed overrides**: third-party sources quote about `$0.017/min` for `gpt-live-transcribe` and `$0.0045/min` for `gpt-transcribe`. These are **unverified**. Confirm them on OpenAI's pricing page when implementing, and correct them in the admin UI if needed.
- **Risks to test** before switching defaults:
  - `gpt-realtime-2.1` has configurable reasoning effort. Use `minimal` or `low` to keep latency down for the prospect voice.
  - Prompt and voice behaviour may differ, so run a regression pass on the practice templates.
  - It's unconfirmed whether `gpt-transcribe` supports **speaker diarization**, which uploads rely on to split user and prospect. If it doesn't, uploads need a fallback (e.g. transcribe, then attribute speakers with the analysis model).
- **Rollout**: because the models are read from `ai.default_models`, the switch is a config change after code support lands. Old models stay in the curated catalog as fallbacks until their shutdown dates.
- **Why this is in this plan**: without the migration, practice voice stops working on 2027-01-20 and transcription on 2027-02-26, and models.dev can't price the current audio models anyway. It is scheduled at the start of Phase 2.

### 4.7 Call sites to update

| File | Change |
|---|---|
| `integrations/ai/services/ai.service.ts` | `toResult()` uses `ModelPricingService` and returns `{ baseCostUsd, unitPrices, source, cachedInputTokens, reasoningTokens }`. `temperatureFor` / `providerOptionsFor` use the resolved `is_reasoning`. |
| `integrations/ai/interfaces/ai.interface.ts` | `usage` gains the new fields. |
| `modules/usage/usage.service.ts` | `record()` computes `charged_cost_usd` from the markup (read from the cached AppConfig) and stores the new fields. |
| `modules/calls/services/calls.service.ts` (`recordAudioUsage`) | Audio cost goes through `estimateAudioCost()` for the practice voice model and the transcription model. |
| `modules/calls/services/call-transcription.service.ts` | Upload transcription cost goes through `estimateAudioCost()`. |
| All `UsageKind.*` record sites (analysis, suggestion, ask, generation, practice turn) | Pass through the new usage fields. No logic change. |

---

## 5. AppConfig backend (requirement 2)

### 5.1 Module layout (`api/src/modules/app-config/`)

```
app-config/
  app-config.module.ts          // @Global so any service can read config
  app-config.controller.ts      // admin endpoints
  app-config.service.ts
  registry/
    app-config.registry.ts      // key -> { schema, default, category, description, public }
    pricing.keys.ts
    plans.keys.ts
    analysis.keys.ts
    ai.keys.ts
  dto/
    update-app-config.schema.ts
```

### 5.2 Registry pattern

```ts
export const APP_CONFIG_REGISTRY = {
  'pricing.markup_percent': {
    schema: z.number().min(0).max(1000),
    default: 0,
    category: 'pricing',
    public: false,
  },
  'plans.definitions': {
    schema: PlanDefinitionsSchema,
    default: DEFAULT_PLAN_DEFINITIONS,
    category: 'plans',
    public: true,
  },
  // ...
} as const satisfies Record<string, AppConfigDefinition>;

export type AppConfigKey = keyof typeof APP_CONFIG_REGISTRY;
export type AppConfigValue<K extends AppConfigKey> = z.infer<(typeof APP_CONFIG_REGISTRY)[K]['schema']>;
```

- `get<K>(key): AppConfigValue<K>` is typed and served from the cache. If the stored value fails validation (e.g. after a schema change), it returns the registry default and logs an error.
- `set<K>(key, value, userId, expectedVersion)` validates the value, writes the row and the history entry in one transaction, bumps the version, and invalidates the cache.
- **Cache**: in-process, plus Redis pub/sub (or a short TTL of about 30s) so every API instance sees updates quickly. Plan enforcement reads through this cache, so an admin change applies within seconds (requirement 3: "changes are reflected in enforcement").
- **Schema evolution**: when a new limit key is added to `PlanDefinitionsSchema`, `ensureDefaults()` deep-merges the missing fields into the stored value, keeping existing admin values.

### 5.3 Endpoints

| Method | Path | Guard | Purpose |
|---|---|---|---|
| GET | `/admin/app-config` | `JwtGuard`, `RolesGuard(ADMIN, SUPER_ADMIN)` | Every key with its value, version, default, category, `updated_by` and `updated_at` |
| PUT | `/admin/app-config/:key` | same | Updates one key. Body is `{ value, version }`, and the server returns 409 on a version mismatch |
| POST | `/admin/app-config/:key/reset` | same | Resets the key to its registry default |
| GET | `/admin/app-config/:key/history` | same | Audit trail |
| GET | `/admin/model-pricing` | same | Resolved prices, source, `fetched_at`, unpriced models, last sync status |
| POST | `/admin/model-pricing/sync` | same | Triggers a sync |
| GET | `/admin/organisations` | same | Org list with plan and status, for manual plan assignment |
| PUT | `/admin/organisations/:id/subscription` | same | Assigns a MANUAL plan, extra seats and a note |
| POST | `/admin/organisations/:id/credits` | same | Grants top-up minutes to the team pool, or to one member with an optional `user_id` |
| GET | `/plans` | `JwtGuard` | Public (`public: true`) plan limits and features, for the pricing and upgrade UI |

`SUPPORT` gets **no access** to these pages for now (decided in review). Only `ADMIN` / `SUPER_ADMIN` can use them.

---

## 6. Simplified dashboard (requirement 4)

The principle is that **regular users see less, while the backend and platform admins keep everything**. Here "regular users" means everyone without `AuthRole.ADMIN` / `SUPER_ADMIN`, including org owners and coaches.

**Cost visibility (decided in review)**: only platform `ADMIN` / `SUPER_ADMIN` ever see money amounts for AI usage. Everyone else sees **minutes and counts only**. All costs are in **USD**.

### 6.1 Usage page for regular users (`app/src/pages/settings/pages/usage/index.tsx`)

| Element | Change |
|---|---|
| Total estimated cost | **Remove** for users |
| Plan usage meters | **New**: live, practice and upload minutes used out of the included amount (for coach students: their personal cap and the shared pool), their own bought-minutes balance (rolling), the team balance if any, the period reset date, and an upgrade or **Buy minutes** button available to every member |
| Minutes per session | **New**: a sortable table of recent sessions (title, date, kind, duration in minutes) linking to the call, plus the average session length |
| Live and practice minutes, call, analysis and suggestion counts | **Keep** |
| Coach orgs, with `usage.view` | Per-member minutes table (live and practice minutes per student this period) |
| `by_kind` breakdown | **Hide** |
| `by_model` breakdown | **Hide** |
| AI model and voice price list | **Hide** |

### 6.2 Cost views for platform admins

- **Same usage page, admin mode**: when the viewer is a platform admin, the page also shows the total cost (charged and base), the average cost per session, a cost column in the sessions table, and the `by_kind` / `by_model` breakdowns.
- **Admin Subscriptions page** (`/admin/subscriptions`, §11b; earlier drafts called it the Organisations page): per org, the period's charged cost, base cost, margin against plan price, minutes used, and cost per session. Sortable, so you can find unprofitable orgs.
- **Call detail**: "Session cost" (charged and base) is shown only to platform admins.

### 6.2a API

- **`UsageService.summary`**: for non-admins, **every** money field (`estimated_cost_usd`, `cost_usd`, `by_kind`, `by_model`) is **omitted from the response**, not just hidden in the UI.
- **Minutes per session** come from `Call.duration_seconds`, available to everyone.
- **Cost per session** (`cost_per_session: { average_usd, sessions: [...] }`) is built by grouping `UsageEvent` by `call_id` and is **admin-only**. Events without a `call_id` (e.g. co-pilot generation) count toward the total only.
- **`GET /calls/:id`** includes `session_cost` only for platform admins.
- **New `GET /usage/plan`** returns entitlements plus consumption (in minutes) for the meters.
- **New `GET /admin/organisations/:id/usage`** returns the full cost breakdown for one org.

### 6.3 Model selection hidden

| Location | Change |
|---|---|
| `pages/assistant-agents/pages/editor/components/sections/models-section.tsx` | Rendered only for platform admins. For users, new co-pilots get `null` models in the DTO, and the server fills them from `ai.default_models` |
| `rerun-analysis-dialog.tsx` | The model picker is removed for users, and the rerun uses the co-pilot or default analysis model |
| `GET /catalog` | `ai_models`, `recommended_*` and voice price fields are returned only to platform admins |
| Model names in the UI (e.g. suggestion `model`, analysis `model`) | Not rendered for users |
| `AssistantAgent.realtime_model` / `analysis_model` | **Unchanged** in the schema and validation (`isKnownAiModel` against the curated catalog) |

**Model default resolution** (used at runtime, not just at creation):
- Use the agent's model if set.
- Otherwise use `ai.default_models.*`.
- Otherwise fall back to the code constant.

Existing co-pilots keep their stored model. An optional admin action, "Reset all co-pilots to default models", can be added later.

### 6.4 Browser voice hidden

- `voice-picker.tsx` shows only OpenAI Realtime voices to users. The provider selector is hidden.
- New prospects are always `OPENAI_REALTIME`, and `practice-agents.service` forces it for non-admin DTOs.
- **Existing `BROWSER` prospects** are migrated to `OPENAI_REALTIME` (§3.9 step 6, decided in review).
- `VoiceProvider.BROWSER`, `use-practice-voice.ts` browser paths and the catalog entry **remain in code** and stay available to platform admins.
- The privacy page's `data_processors` list drops the "Your browser" entry for users.

### 6.5 i18n

Every new or changed user-visible string (meters, cost-per-session, upgrade prompts, locked analysis teasers, plan names, limit errors and the admin pages) is added to **all 12 locales** (`en, el, de, es, fr, it, nl, pl, pt, ro, sv, tr`) with real translations, in the same change. This follows AGENTS.md. Unused keys (price list, by-kind and by-model labels) are kept for now because the admin view reuses them.

---

## 7. Data retention (requirement 5)

- **No automatic expiry.** Nothing deletes sessions, transcripts, analyses, recordings or usage events on a schedule. This is already true today; the plan removes the earlier "30 days / 1 year" plan rows.
- **No plan-based retention.** Downgrading or cancelling never deletes data. On `CANCELED`, the org becomes read-only for creation (no new calls or practice) but can still view all history. Analysis visibility follows the current plan (§9).
- **Account deletion is unchanged**: `UsersService.remove()` with sole-owned org cleanup and recording removal.
- **User-initiated per-item deletes stay**: deleting a call, recording or transcript, the per-call `keep_recording`, and deleting an organisation. These are manual actions, not automatic expiry, so they don't conflict with requirement 5 (confirmed in review).
- **Guard for future work**: a note goes in `AGENTS.md` / the API rules ("no scheduled deletion of user data"), so a future change doesn't add expiry by accident.

---

## 8. Subscriptions, entitlements and enforcement (requirement 3)

### 8.1 `EntitlementsService` (`api/src/modules/billing/services/entitlements.service.ts`)

```ts
getEntitlements(organisationId): Promise<Entitlements>
// = plans.definitions[subscription.plan]
//   + seats_included + subscription.extra_seats
//   + sum(UsageCredit *_seconds_remaining)  (rolling, no expiry)
//   + effective status (TRIALING/ACTIVE/PAST_DUE grace/CANCELED)
getConsumption(organisationId, period): Promise<Consumption>
// live/practice minutes from Call.duration_seconds by kind & started_at in period,
// uploads count, per-member live AND practice seconds (split owner / non-owner),
// copilots/prospects counts
```

- Results are cached in Redis for 60 seconds. The cache is invalidated on Stripe webhooks, manual plan changes, `plans.*` AppConfig updates, and the end of a call.
- **Period**: `[current_period_start, current_period_end)` from `Subscription`. For a yearly subscription, monthly windows are derived from the anchor day. For `TRIAL`, the period is the trial lifetime.

### 8.2 `PlanLimitService` – assert helpers

| Check | Where it is called | Behaviour when over the limit |
|---|---|---|
| `assertCanCreateCopilot(ctx)` | `assistant-agents.service.create` and every duplicate or generate path | `403 { code: 'PLAN_LIMIT_REACHED', limit: 'copilots_max', current, max }` |
| `assertCanCreatePracticeProspect(ctx)` | `practice-agents.service` create, random, generate, recreate-from-call and "harder" | same, with `practice_prospects_max` |
| `assertCanStartCall(ctx, kind)` | `calls.service` start (live, practice) and `realtime-session` token creation | 403 if no minutes are left. Otherwise returns `max_duration_seconds` |
| `assertCanUpload(ctx)` | the upload call endpoint | 403 when `uploads_per_period` is reached, or when the file duration exceeds the remaining minutes (checked after probing the duration) |
| `assertCanInvite(ctx)` | invitations create and resend | 403 when members plus pending invites are at or above the seats |
| `assertFeature(ctx, key)` | a `@RequiresFeature('knowledge_document_import')` decorator plus guard on the controller | 403 `{ code: 'PLAN_FEATURE_LOCKED', feature }` |

**Counting rules (proposed):**
- Archived co-pilots and prospects do **not** count toward `*_max`.
- The auto-created default co-pilot **does** count.
- When a limit is lowered below current usage, existing items keep working, but no new ones can be created until the count drops. Nothing is auto-archived.

### 8.3 Minutes enforcement during calls

- **At call start**, the server returns `max_duration_seconds`, the minimum of the caller's available pool minutes (§8.3a), their remaining per-member cap (non-owners, live or practice), and the existing prospect `time_limit_minutes`.
- **During the call**, the live and practice pages show a countdown in the last 2 minutes and auto-end with the existing `CallEndReason.TIME_LIMIT`.
- **Server backstop**: when suggestion, ask and transcript-ingest endpoints receive a request past `started_at + max_duration + grace (60s)`, they stop serving co-pilot suggestions and return `CALL_TIME_LIMIT`. Realtime client secrets are short-lived and are not re-issued past the limit.
- **Accounting (decided)**: consumption counts **exact seconds** from `Call.duration_seconds`, which is already stored. There is no per-call rounding, so a short or aborted call costs the user nothing extra and pooled Coach usage stays fair.
  - Calls under 5 seconds (misclicks or failed connections) are not counted.
  - The UI shows minutes with one decimal.
  - Limits are configured in minutes and compared in seconds internally.

### 8.3a Pool, owner reserve and per-member caps

Applies separately to live and practice minutes. Notation, for one kind and one period:
- `P` = pool for the period (plan allowance, plus rolling top-up credits only once the allowance is used up)
- `R` = owner reserve (`*_reserved_for_owner_per_period`, 0 if null)
- `U_o` = seconds used by `OWNER` members combined
- `U_n` = seconds used by everyone else
- `C` = per-member cap (`*_per_member_per_period`), `u_m` = seconds already used by this member

| Caller | Minutes available to start a call |
|---|---|
| Owner | `P − U_o − U_n` |
| Non-owner | `min( P − max(R, U_o) − U_n , C − u_m )` (the cap term is skipped when `C` is null) |
| Anyone, with personal credits | The row above, **plus** the caller's remaining personal credit minutes for that kind |

How this works:
- Owners can always spend their reserve, because non-owners are held to `P − R`.
- Owners can also spend any unused shared minutes, so the reserve is a guarantee, not a limit.
- If an owner uses more than `R`, the extra reduces what students have left (`max(R, U_o)`).
- When there are several owners they share one reserve.
- Org `ADMIN` and `MEMBER` roles are non-owners and are bound by the caps and the reserve.
- With `R` and `C` both null (every non-Coach plan), the formulas reduce to the plain pool check.

Messages and codes, so people know whom to ask:
- **Pool exhausted**: `PLAN_LIMIT_REACHED` with `limit: 'live_minutes_per_period'`. Everyone, students included, gets a **Buy minutes** button that opens a personal top-up (§11). Owners also get the "For the team" option.
- **Personal cap reached**: `PLAN_LIMIT_REACHED` with `limit: 'live_minutes_per_member_per_period'` (or the practice equivalent). The message says they've used their share of the plan for this period, with the same **Buy minutes** button.
- **Owner reserve in use**: a student never sees the reserve. The student meter shows `P − R` as their total.

**Personal credits (§3.5) are an escape hatch for a person, not a change to the pool:**
- A student whose pool share is empty, or who has reached their personal cap, can keep going on personal credits. Nothing else about the pool, the reserve or the cap changes, and the coach is never involved.
- Personal minutes are spent only after the pool and cap allowance for that call is used up, and they are excluded from `U_o`, `U_n` and `u_m` (§3.5 accounting).
- `max_duration_seconds` at call start is therefore `min(pool and cap minutes, prospect time limit)` extended by the caller's personal credit seconds: the call can run through the allowance and then continue on the bought minutes, up to the prospect's time limit.
- **Team credits** (bought by the owner) are different: they add to the shared pool, raise what everyone can use, and leave the reserve unchanged.
- A per-member cap is a limit on the plan's shared minutes, not on what a person pays for. Personal credits are never capped.

Per-member usage is already derivable from `Call.duration_seconds` grouped by `user_id`, `kind` and period, so no new tables are needed. The aggregates are cached with the entitlements (§8.1).

### 8.4 Status handling

| Status | Behaviour |
|---|---|
| `TRIALING` | TRIAL plan limits, or a paid plan's limits during a paid-plan trial |
| `ACTIVE` | Full plan |
| `PAST_DUE` | 7-day grace period (configurable later), then treated as `CANCELED` |
| `CANCELED` / no subscription | Read-only: browse history and analyses. Creating calls, prospects or co-pilots returns `SUBSCRIPTION_REQUIRED` |

### 8.5 Trial abuse

- Each owner user gets one `TRIAL` across all orgs they create. A user creating a second organisation is offered a paid plan instead.
- Students invited into a Coach org use the Coach org's pool, not a trial.

### 8.6 Frontend

- **`features/billing`**: hooks `usePlans`, `useEntitlements`, `useSubscription`, `useCheckout` and `useTopup`.
- **`<PlanGate feature|limit>`**: a component that shows locked UI with an upgrade call-to-action.
- **Global error handling** for `PLAN_LIMIT_REACHED`, `PLAN_FEATURE_LOCKED` and `SUBSCRIPTION_REQUIRED` opens an upgrade dialog showing the limit and the next plan.
- **Billing page**: `/settings/billing`, fully specified in §11a (plan, invoices, payments, upgrade, cancel, resume, seats and buying minutes).
- **Pricing page**: public on the landing page and in-app. It reads `GET /plans` for limits and features, and Stripe for amounts.

---

## 9. Post-call analysis visibility by plan (requirement 6)

### 9.1 Principle

- `CallAnalysisService` is **unchanged**. It always runs the full analysis with the same prompt and schema, and stores every field in `CallAnalysis`, for every plan.
- Visibility is applied **only when serving data**, in the API layer, so locked data never reaches the browser.
- Upgrading reveals past analyses instantly, with no reprocessing. Downgrading hides them again without deleting anything.

### 9.2 Feature keys and seed matrix

| `AnalysisFeatureKey` | Stored field(s) | UI component | TRIAL | STARTER | PRO | COACH |
|---|---|---|---|---|---|---|
| `overview` | `overall_score`, `verdict`, `summary` | `analysis-overview.tsx` | ✓ | ✓ | ✓ | ✓ |
| `category_scores` | `category_scores` | overview / skills | ✓ | ✓ | ✓ | ✓ |
| `moments` | `mistakes`, `strengths` (timeline-linked) | `analysis-moments.tsx`, `call-timeline.tsx` markers | ✓ | ✗ | ✓ | ✓ |
| `improvements` | `improvements` | overview | ✓ | ✗ | ✓ | ✓ |
| `metrics` | `metrics` (talk ratio, pace, fillers, interruptions, objections) | `analysis-metrics.tsx` | ✓ | ✗ | ✓ | ✓ |
| `prospect_insights` | `prospect_insights` | `analysis-insights.tsx` | ✓ | ✗ | ✓ | ✓ |
| `next_steps` | `next_steps` | overview | ✓ | ✓ | ✓ | ✓ |
| `follow_up_draft` | `follow_up_draft` | `follow-up-card.tsx` | ✓ | ✗ | ✓ | ✓ |
| `practice_reveal` | `practice_result` | `practice-reveal.tsx` | ✓ | ✓ | ✓ | ✓ |
| `copilot_usage` | `suggestion_usage` | `copilot-usage.tsx` | ✓ | ✗ | ✓ | ✓ |
| `suggested_practice` | `suggested_practice` | `suggested-practice-card.tsx`, dashboard "recommended practice" | ✓ | ✗ | ✓ | ✓ |

TRIAL shows everything so trial users see the full value. Starter is "basic score" as originally proposed. Admins can change any cell.

### 9.3 Backend

- **`AnalysisVisibilityService.filter(analysis, plan)`**:
  - Returns the analysis with locked fields **removed**.
  - Adds `locked_features: AnalysisFeatureKey[]` plus teaser metadata, such as counts only (`{ moments: { mistakes: 4, strengths: 3 } }`), so the UI can say "4 mistakes found – upgrade to see them" without leaking content.
- **Applied in**:
  - `CallsService.findOne` (`analysis: true` include)
  - Any WebSocket event that pushes analysis results (analysis completed / status updates)
  - **Dashboard aggregates** (`dashboard.service.ts`), which use the same keys:
    - `recurring_mistakes` needs `moments`.
    - The skills / category trend needs `category_scores`.
    - Recommended practice needs `suggested_practice`.
    - Each locked card returns `{ locked: true }` instead of data.
  - The cohort dashboard (§10.1) follows the same rules.
- **Plan used**: the plan of the **organisation that owns the call**, so a coach viewing a student's call uses the Coach org plan.
- **Platform admins** bypass the filter, for support.

### 9.4 Frontend

- Each analysis component is wrapped in `<AnalysisSection feature="metrics">`. When the feature is locked, it renders a blurred placeholder card with the teaser count and an "Unlock with Pro" call-to-action instead of the content.
- Timeline mistake and strength markers are hidden when `moments` is locked.

---

## 10. Kept from the earlier proposal

### 10.1 Coach / cohort features (gated by `cohort_dashboard`, `view_all_member_calls`, `org_invitations`, `org_roles_permissions`)

- **Invite students into the coach org.** This already exists and is now seat-limited.
- **Shared co-pilots and prospects.** Already org-scoped, so no change.
- **Cohort dashboard** (new `dashboard/cohort` endpoint and page):
  - Per-student score trend, sessions, practice minutes, last activity.
  - Leaderboard by average score and practice minutes.
  - Per-student recurring mistakes, subject to `moments` visibility.
  - "Students who haven't practised in 7 days".
- **Per-member caps** (`live_minutes_per_member_per_period`, `practice_minutes_per_member_per_period`): the cohort page shows each student's used and remaining minutes against the caps, plus the pool and the owner reserve remaining.
- **Students' own meters** show their personal cap and the shared pool without the reserve (§8.3a).

### 10.1a Coach tools: overview

Added in review, on top of the cohort dashboard. Everything here is Coach-plan only (feature flags in §2.3) and uses data that already exists, with no extra AI cost.

| # | Tool | Where it lives |
|---|---|---|
| 1 | **Student page** | `/students/:userId`, opened from the cohort dashboard, the member list or a call |
| 2 | **Practice assignments** | `/assignments` for the coach, "Assigned to me" for students |
| 3 | **Coach comments** on calls | The call detail page, with a timestamp that jumps to the recording |
| 4 | **Weekly report, inside the app** | `/coaching/reports`, plus a notification. **No email** |
| 5 | **CSV export** | Buttons on the cohort and student pages |
| 6 | **Per-student access** to co-pilots and prospects, with students' own private prospects | "Who can use this" in the editors and an Access section on the student page (§10.1h) |
| – | **Notifications** (needed by 2, 3, 4 and 6) | A bell in the header for everyone, and `/notifications` |

**Navigation.** A new "Coaching" sidebar group, shown only to people with `coaching.view` on a plan with the flags on:
- Cohort (the existing cohort dashboard, with the student table)
- Assignments
- Weekly reports

The student page has no menu entry of its own; it's reached by clicking a student anywhere. Students see none of this group. They see an "Assigned to me" card on their dashboard and Practice page, comments on their calls, and the bell.

**New permissions** (added to `PERMISSION_CATALOG` in a new "Coaching" group, so owners can edit them per role like the others):

| Key | Allows | Implies | ADMIN preset | MEMBER preset |
|---|---|---|---|---|
| `coaching.view` | Cohort page, student pages, weekly reports | `calls.view_all`, `members.view` | on | off |
| `coaching.manage` | Create assignments, write comments on other members' calls | `coaching.view` | on | off |
| `coaching.export` | CSV export | `coaching.view` | on | off |

Owners hold all three. Plan limits still apply on top: on a plan without the flag, the permission does nothing.

**New feature flags** (seed, all `false` except Coach):

| Feature key | TRIAL | STARTER | PRO | COACH |
|---|---|---|---|---|
| `student_pages` | false | false | false | true |
| `practice_assignments` | false | false | false | true |
| `call_comments` | false | false | false | true |
| `coach_reports` | false | false | false | true |
| `student_export` | false | false | false | true |

**Privacy notice.** When someone accepts an invitation to a Coach organisation, the accept screen says, in their own language: "Your coach will be able to see your calls, recordings, analyses and practice results". It reuses the existing consent pattern (`consent_acknowledged_at`) and needs all 12 locales.

**Migration** `…_coaching`: `Call.assignment_id` plus the tables below, in one migration.

### 10.1b Student page

- **Route and API**: `/students/:userId`, `GET /coaching/students/:userId` (`coaching.view`, target must be a member of the active organisation).
- **Contents**:
  - Header: name, email, role, joined date, last active.
  - KPIs: average score and trend, live and practice sessions, minutes this period against their caps (§8.3a). Bought personal minutes are **never** shown.
  - Score trend and category skills.
  - Recurring mistakes, subject to the `moments` visibility key (full on Coach).
  - Recent calls, linking to the call detail page.
  - Their assignments with status.
  - Recent comments.
  - Actions: **Assign practice** (student prefilled), export their calls (CSV), and a link to the member row for role changes and removal.
- **Reuse**: `DashboardService` already computes score trends, skills and recurring mistakes for an organisation or a single user. It gets a `userId` filter parameter instead of a new set of queries. The visibility filter (§9) is applied the same way.
- Students never see this page. They keep their normal dashboard.

### 10.1c Practice assignments

Data model:

```prisma
model PracticeAssignment {
  id                    String    @id @default(uuid())
  organisation_id       String
  created_by_id         String?
  practice_agent_id     String?                 // the prospect to practise with
  practice_agent_name   String                  // snapshot, survives prospect deletion
  title                 String
  instructions          String?
  due_at                DateTime?
  target_score          Int?                    // a passing score, optional
  required_attempts     Int       @default(1)
  all_members           Boolean   @default(false) // also applies to people who join later
  archived_at           DateTime?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  organisation   Organisation  @relation(fields: [organisation_id], references: [id], onDelete: Cascade)
  created_by     User?         @relation(fields: [created_by_id], references: [id], onDelete: SetNull)
  practice_agent PracticeAgent? @relation(fields: [practice_agent_id], references: [id], onDelete: SetNull)
  targets        AssignmentTarget[]
  calls          Call[]

  @@index([organisation_id, archived_at])
  @@map("practice_assignments")
}

model AssignmentTarget {
  id               String    @id @default(uuid())
  assignment_id    String
  user_id          String
  attempts_count   Int       @default(0)
  best_score       Int?
  last_attempt_at  DateTime?
  completed_at     DateTime?
  created_at       DateTime  @default(now())

  assignment PracticeAssignment @relation(fields: [assignment_id], references: [id], onDelete: Cascade)
  user       User               @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([assignment_id, user_id])
  @@index([user_id, completed_at])
  @@map("assignment_targets")
}
```

`Call` gains `assignment_id String?` (indexed, `onDelete: SetNull`), set when a practice session is started from an assignment.

Behaviour:
- **Creating**: the coach picks a prospect (existing or generated), title, optional instructions, due date, target score and attempts needed. Then chooses students, or "everyone". With `all_members` on, members who join later get the assignment too.
- **Student side**: an "Assigned to me" card on the dashboard and Practice page, listing open assignments with due date and status. **Start** opens the practice session with the assignment attached.
- **Completion** is automatic, in a post-step after `CallAnalysisService` finishes a practice call that carries an `assignment_id` (the analysis itself is unchanged):
  - `attempts_count` goes up and `best_score` is updated from the stored overall score.
  - The target is completed when attempts ≥ `required_attempts` and, if set, `best_score` ≥ `target_score`.
  - Calls that never produced an analysis don't count.
- **Status** is derived, not stored: `open`, `completed`, `overdue` (`due_at` passed and not completed).
- **Coach view** (`/assignments`): a table with progress per student, filters for open, overdue and completed, and a detail page with each student's attempts linking to the calls. Assignments can be edited (not the prospect), archived, or deleted.
- **Plan limits still apply**: assignment practice uses the student's normal pool, cap and personal credits (§8.3a). If a student is out of minutes, they get the usual Buy minutes prompt.
- **Notifications**: students get `ASSIGNMENT_NEW`, and a `ASSIGNMENT_DUE_SOON` 24 hours before the due date if still open. The coach gets `ASSIGNMENT_COMPLETED` per student, grouped so a class-wide assignment doesn't send 30 separate ones in a minute (§10.1f).
- **Endpoints** (`coaching.manage` to write, members read their own): `POST/GET/PATCH/DELETE /coaching/assignments`, `GET /coaching/assignments/:id`, `GET /assignments/mine`, and `POST /calls/practice/start` accepting `assignment_id`.

### 10.1d Coach comments on calls

```prisma
model CallComment {
  id              String    @id @default(uuid())
  call_id         String
  organisation_id String
  author_id       String?
  parent_id       String?                 // one level of replies
  at_ms           Int?                    // optional position in the recording
  body            String
  edited_at       DateTime?
  deleted_at      DateTime?
  created_at      DateTime  @default(now())

  call   Call         @relation(fields: [call_id], references: [id], onDelete: Cascade)
  author User?        @relation(fields: [author_id], references: [id], onDelete: SetNull)
  parent CallComment? @relation("CommentReplies", fields: [parent_id], references: [id], onDelete: Cascade)
  replies CallComment[] @relation("CommentReplies")

  @@index([call_id, created_at])
  @@map("call_comments")
}
```

- **Who can write**: people with `coaching.manage` on any call in the organisation, and the call's owner on their own call. Replies are one level deep. A student can reply in a thread on their own call, and can't start a thread on someone else's.
- **Who can read**: the call's owner and anyone who can already view that call (`calls.view_all`).
- **UI**: a "Coach notes" card on the call detail page. A comment can be pinned to the moment being played (`at_ms`), and clicking it jumps the recording and the synced transcript there, using the existing seek handler.
- **Editing and deleting**: authors can edit (the comment shows "edited") and delete their own. Deleting is soft, so a thread isn't broken; `calls.manage_all` can remove any comment.
- **Notifications**: `COMMENT_NEW` to the call owner, and `COMMENT_REPLY` to the author of the thread being replied to.
- **Limits**: 2,000 characters per comment, and a rate limit per user.
- **Data**: comments are kept with the call and removed with it. Like all other data, they are never expired automatically.
- **Endpoints**: `GET /calls/:id/comments`, `POST /calls/:id/comments`, `PATCH` and `DELETE /calls/:id/comments/:commentId`.

### 10.1e Weekly report (in the app, no email)

```prisma
model CoachDigest {
  id              String   @id @default(uuid())
  organisation_id String
  period_start    DateTime
  period_end      DateTime
  data            Json                         // numbers and ids only, no generated text
  created_at      DateTime @default(now())

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)

  @@unique([organisation_id, period_start])
  @@index([organisation_id, period_end])
  @@map("coach_digests")
}
```

- **Generation**: a BullMQ repeatable job runs once a week for every organisation on a plan with `coach_reports`. The weekday and hour (UTC) come from AppConfig `coaching.digest` (§3.3), seeded Monday 07:00. The unique `(organisation_id, period_start)` makes it safe to run twice.
- **Content** is computed straight from the database, so it has **no AI cost** and nothing to translate on the server. `data` holds per-student numbers and ids, and the page turns them into sentences with i18n keys:
  - Sessions and practice minutes this week against last week.
  - **Improved**: students whose average score rose by at least the configured threshold.
  - **Needs attention**: students whose scores fell, or who've been inactive for `coaching.inactive_days` (7 by default).
  - **Assignments**: completed this week, overdue now, due in the next 7 days.
  - Top three by average score and by practice minutes.
  - Pool usage: minutes used so far and the owner reserve left.
- **Where**: `/coaching/reports` lists past weeks, newest first, with the latest opened by default. Each name links to the student page.
- **Alert**: a `COACH_REPORT` notification (bell) goes to every member with `coaching.view`. There is **no email**.
- **Empty weeks**: if nothing happened, the report still exists and says so, so the weekly rhythm isn't broken.
- **New organisations**: the first report appears after their first full week.
- **Endpoint**: `GET /coaching/reports` and `GET /coaching/reports/:id` (`coaching.view`).
- **Data**: reports are kept indefinitely.

### 10.1f Notifications (in-app)

```prisma
enum NotificationType {
  ASSIGNMENT_NEW
  ASSIGNMENT_DUE_SOON
  ASSIGNMENT_COMPLETED
  COMMENT_NEW
  COMMENT_REPLY
  COACH_REPORT
  AGENT_SHARED
  BILLING_ALERT      // params.kind: PAYMENT_FAILED, TRIAL_ENDING, PAYMENT_ACTION_REQUIRED, PLAN_CANCELED
}

model Notification {
  id              String           @id @default(uuid())
  organisation_id String
  user_id         String
  type            NotificationType
  params          Json             @default("{}")   // ids and numbers, never display text
  dedupe_key      String?
  read_at         DateTime?
  created_at      DateTime         @default(now())

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, dedupe_key])
  @@index([user_id, read_at, created_at])
  @@map("notifications")
}
```

- **No display text is stored.** A notification holds a type and parameters, and the app renders it with i18n keys in the reader's language (which also satisfies the 12-locale rule).
- **Bell**: a header icon with an unread count and a dropdown of the latest items, plus a `/notifications` page with all of them. Clicking an item marks it read and opens its target (a call with the comment pinned, an assignment, a report).
- **Delivery**: the API has no WebSocket server, so the app polls the unread count every 60 seconds and on window focus (React Query). That's enough for these events, and a push channel can come later.
- **Grouping**: when one action would create many notifications for the same person (for example an assignment for 30 students), the coach gets one `ASSIGNMENT_COMPLETED` per assignment per day with a count, using `dedupe_key`.
- **Scope**: notifications are per organisation, and the bell shows the active organisation's items with a small indicator when another organisation has unread ones.
- **Endpoints**: `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`.
- **Data**: kept indefinitely like everything else. The list is paginated.

### 10.1g CSV export

- **Two files** (`coaching.export`, plan flag `student_export`):
  - `GET /coaching/export/students.csv`: one row per student with name, email, role, joined, last active, live and practice sessions, minutes this period, average score, assignments completed and overdue.
  - `GET /coaching/export/calls.csv?from=&to=&user_id=`: one row per call with date, student, kind, outcome, duration in minutes and overall score.
- **Buttons** on the cohort page (both files) and on a student page (that student's calls).
- **Safe output**: UTF-8 with a BOM so Excel opens it correctly, and any cell starting with `=`, `+`, `-` or `@` is prefixed to stop spreadsheet formula injection. A cap of 50,000 rows and a per-user rate limit.
- **What's left out**: no AI costs or money amounts of any kind, no transcripts, and no personal bought-minutes balances.
- **Streamed** from the database in batches, so a big export doesn't load into memory.

### 10.1h Per-student access to co-pilots and prospects

**Today** (checked in the code): co-pilots and practice prospects belong to the organisation, and every member sees all of them. Prospect editing is checked by organisation, not by owner, so a member with the default `prospects.manage` permission can edit or delete any prospect in the org, including the coach's. This section fixes that and adds per-student sharing.

**Rules**
1. Every co-pilot and prospect has an **access setting**: `ORGANISATION` (everyone, today's behaviour and the default) or `SELECTED` (only chosen members).
2. A member sees and can use an item if it is `ORGANISATION`, **or** they authored it, **or** they are on its access list.
3. **Full visibility** for people who manage or oversee the org: anyone with `agents.manage` sees all co-pilots; anyone with `calls.view_all` sees all prospects. Both coach and student can therefore open what's been shared, and the coach can open everything.
4. **Assigning practice grants access.** Creating an assignment (§10.1c) for a `SELECTED` prospect adds the students to its access list in the same transaction. For "everyone" assignments, members who join later are added too. Access is **kept** after the assignment is archived or deleted, so a student's history doesn't suddenly lose its prospect. The coach can revoke it manually.
5. **Students manage only their own prospects.** `prospects.manage` now means "create and manage the ones you authored". A new permission, `prospects.manage_all`, covers editing any member's prospects.
6. **Students can create their own private prospects**, for scenarios they want to practise. These are `SELECTED` with an empty list, so they are visible to the author, plus the coach through rule 3. Students can't share them with other students; only `prospects.manage_all` holders can change the access of someone else's prospect.
7. **A prospect's linked co-pilot** can be used inside that prospect's practice session even if the student has no direct access to the co-pilot. It still doesn't appear in their co-pilot list.
8. **History is unaffected by access changes.** Calls keep their snapshot of the co-pilot or prospect (`agent_snapshot`, `practice_snapshot`), so removing access later never breaks a student's past calls or analyses.

**Permissions** (added to `PERMISSION_CATALOG`, group "Co-pilots & practice"):

| Key | Allows | Implies | ADMIN preset | MEMBER preset |
|---|---|---|---|---|
| `prospects.manage` | Create, edit and delete **your own** prospects (description reworded) | – | on | on |
| `prospects.manage_all` | Edit, delete and change access of **any** member's prospects | `prospects.manage` | on | off |

Owners hold both. The existing `agents.manage` / `agents.view` keep their meaning, and co-pilot access is edited by `agents.manage`.

**Plan controls**
- New feature flag `agent_access_control`: `true` on COACH, `false` elsewhere. When off, the access picker is hidden and new items are `ORGANISATION`. **Existing restrictions are still enforced** after a downgrade, so nothing becomes visible by accident.
- New limit `practice_prospects_per_member_max` (non-owner members; counts non-archived prospects they authored): COACH `15`, others `null`. It stops one student creating unlimited AI-generated prospects. Org-wide `copilots_max` and `practice_prospects_max` still count every item whatever its access.

**Data model**

```prisma
enum AgentVisibility {
  ORGANISATION
  SELECTED
}

// AssistantAgent and PracticeAgent each gain:
//   visibility AgentVisibility @default(ORGANISATION)
//   access_list  <relation to the table below>

model AssistantAgentAccess {
  id                 String   @id @default(uuid())
  assistant_agent_id String
  user_id            String
  granted_by_id      String?
  created_at         DateTime @default(now())

  assistant_agent AssistantAgent @relation(fields: [assistant_agent_id], references: [id], onDelete: Cascade)
  user            User           @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([assistant_agent_id, user_id])
  @@index([user_id])
  @@map("assistant_agent_access")
}

model PracticeAgentAccess {
  id                String   @id @default(uuid())
  practice_agent_id String
  user_id           String
  granted_by_id     String?
  created_at        DateTime @default(now())

  practice_agent PracticeAgent @relation(fields: [practice_agent_id], references: [id], onDelete: Cascade)
  user           User          @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([practice_agent_id, user_id])
  @@index([user_id])
  @@map("practice_agent_access")
}
```

**Migration** `…_agent_access`: the enum, the two columns (everything existing becomes `ORGANISATION`, so nothing changes on day one) and the two tables. A data step adds `prospects.manage_all` to every existing organisation's `ADMIN` role permissions, so current admins keep the ability they have now. Members lose only the ability to edit **other people's** prospects.

**Server enforcement** (one `AgentAccessService`, used everywhere so no path is forgotten):
- **Lists and detail** for co-pilots and prospects filter by the rules above. A detail request for something you can't see returns **404**, not 403, so existence isn't leaked.
- **Starting a call or practice** with a co-pilot or prospect, creating a realtime session, and starting from an assignment all check access.
- **Dashboard and catalog data** that mentions prospects (for example recommended practice and suggested practice) only returns ones the viewer can access.
- **Editing and deleting** check ownership or `manage_all` (prospects) and `agents.manage` (co-pilots).
- **Card stats** keep showing the viewer's own numbers unless they have `calls.view_all`, as the prospect stats do today.

**Endpoints**
- `PUT /assistant-agents/:id/access` and `PUT /practice-agents/:id/access` with `{ visibility, user_ids }`: replaces the access list in one call. Requires `agents.manage` / `prospects.manage_all`, and `agent_access_control`.
- `GET` of both returns `visibility` and, to managers, the list of member ids.
- `GET /coaching/students/:userId/access` and `PUT` of the same: the per-student view below.

**UI**
- **Editors**: a "Who can use this" section in the co-pilot and prospect editors: "Everyone in the organisation" or "Selected students" with a searchable member picker.
- **Lists**: badges such as "Shared with 5" and "Private". Students see only what's available to them, and a co-pilot list with nothing shows "Your coach hasn't shared a co-pilot yet".
- **Student page** (§10.1b): a new "Access" section listing every co-pilot and prospect with a toggle for this student, so the coach can set one student up without opening each item. It also shows which items are private to the student.
- **Bulk action**: "Share with…" on a selection of items.
- **Students' own prospects** carry a label saying who can see them ("Only you and your coach").
- **Notifications**: a new `AGENT_SHARED` type (§10.1f) goes to the student when something is shared with them. Sharing with many students at once is grouped (`dedupe_key`).
- All text in the 12 locales.

### 10.2 Margin check (do before finalising seed numbers)

With models.dev prices synced, use the new admin pricing page to compute the following, then adjust the seeds if any plan's worst case exceeds about 40% of its price:
- Cost per live minute: transcription (×2 channels for online meetings) plus suggestions.
- Cost per practice minute: realtime voice input and output audio plus transcription.
- Cost per analysis and per upload minute.
- Worst-case cost per plan at full usage.

### 10.3 Go-to-market items (non-code, unchanged)

- Recruit 5–10 coaches with free access via **MANUAL** subscriptions (§5.3).
- Collect case studies.

Affiliate or commission tracking is part of Extras and is out of scope (§12).

---

## 11. Stripe billing (kept from the proposal)

Built on the existing `api/src/integrations/stripe/` scaffold.

**Products and prices**, created per environment in the Stripe dashboard. Their IDs are stored in `plans.stripe_prices` / `plans.topup_packs`:
- `STARTER`, `PRO`, `COACH`: monthly and yearly prices each.
- `COACH_EXTRA_SEAT`: a per-seat price, monthly and yearly.
- Top-up packs: one-time prices.

**Checkout**:
- `POST /billing/checkout` with `{ plan, interval, extra_seats? }` creates a Checkout Session (subscription mode) and creates the Stripe customer on first use.
- Only org `OWNER` (or an `ADMIN` with a new `billing.manage` permission) can call it.

**Portal**: `POST /billing/portal` returns a Customer Portal URL for **payment method and billing details only**. Cancelling and switching plans are done in the app (§11a), not in the portal.

**Top-ups**: `POST /billing/topup` with `{ pack_id, scope: 'personal' | 'team' }` creates a Checkout Session in payment mode.
- `personal` can be called by **any member** of an organisation whose plan has `topup_purchases` and whose status is not `CANCELED`. It uses the buyer's own Stripe customer (`User.stripe_customer_id`, created on first use), never the organisation's customer, so a student's card and invoices stay theirs and the coach sees nothing.
- `team` requires org `OWNER` or an `ADMIN` with `billing.manage`, and uses the organisation's customer.
- The Checkout Session metadata carries `organisation_id`, `user_id` (personal only), `pack_id` and `scope`. The webhook trusts only this metadata and the verified session, never client input.
- A member of several organisations buys for the organisation they are currently in, and the credit is valid only there.

**Webhooks**: `POST /billing/webhook` uses a raw body and signature verification. It is idempotent: the Stripe event id is stored in a `StripeEvent` table, or Redis `SETNX`.

| Event | Action |
|---|---|
| `checkout.session.completed` | Link the customer and subscription; for a top-up, create a `UsageCredit` (with `user_id` for `personal`, null for `team`). `stripe_payment_id` is unique, so a replayed event can't grant twice |
| `customer.subscription.created/updated` | Upsert `Subscription` (plan from the price ID, status, period, seats quantity, `cancel_at_period_end`) |
| `customer.subscription.deleted` | Set status `CANCELED` |
| `invoice.paid` | Refresh the period and clear `PAST_DUE` |
| `invoice.payment_failed` | Set `PAST_DUE` and email the owner (via existing Resend) |

**Permissions**: add `billing.view` / `billing.manage` to `permissions.config.ts`. They are OWNER-only by default and can be granted to Admin.

**Organisation deletion and account deletion** cancel the Stripe subscription immediately (prorated per Stripe settings) before deleting data.

### 11a. Billing page for users (`/settings/billing`)

The existing Stripe scaffold already has the building blocks: `getInvoices`, `getPayments`, `getPaymentMethods`, `setDefaultPaymentMethod` and `createBillingPortalSession`. The page is built in the app, and Stripe's Customer Portal is used **only** for card and billing details, so entitlements stay under our control.

**Who sees what**
- **Organisation billing**: people with `billing.view` (owners by default, grantable to admins). The page shows the **active organisation**, and the org switcher changes it.
- **My purchases**: every member, including students. It lists their own personal top-ups and receipts, since those were paid on their own Stripe customer (§11).
- A member without `billing.view` sees a read-only "Your plan" card (plan name, status, renewal date) and a "ask the account owner" note for anything else. Personal top-up buying (§11) stays available to them.
- Navigation: a "Billing" entry in the Settings navigation, shown to anyone with `billing.view`, and "My purchases" inside the Usage page for everyone else.

**Sections, top to bottom**
1. **Plan card**
   - Plan name, status badge (Trial, Active, Past due, Cancelling, Canceled), price and interval, the next charge date and amount, and trial end.
   - Coach: seats used out of seats paid for, and the extra seat price.
   - A scheduled change shows as a notice: "Switches to Pro on 12 Dec", with an undo.
   - Plans granted by hand (`source = MANUAL`) show "Set up by our team" with no payment details, and a **Subscribe** button that starts Checkout (§11 step "Moving MANUAL subscriptions to Stripe").
2. **Actions** (`billing.manage`)
   - **Upgrade or change plan**: a plan picker with a monthly/yearly toggle and, for Coach, the number of extra seats. It shows a **price preview before anything is charged** ("You'll be charged $X today, then $Y on 12 Dec"), then a confirm button.
   - **Switch monthly ⇄ yearly**, **add or remove seats** (Coach): same picker.
   - **Cancel plan**: a confirmation dialog that says what happens (below), with an optional reason (a short list plus a free-text box). The plan runs to the end of the paid period.
   - **Resume**: appears while a cancellation is scheduled, and removes it.
   - **Update payment method and billing details**: opens the Stripe portal and returns to this page.
3. **Payment method**: card brand, last four digits and expiry, with a warning if it is expired or the last payment failed.
4. **Invoices and payments** (a table, newest first, paginated):
   - Date, description (for example "Pro, monthly", "Extra seats ×3", "Top-up: 100 live minutes"), amount, status (paid, open, failed, refunded, void), and **Download** (Stripe's PDF) or **View** (the hosted page).
   - Open or failed invoices have a **Pay now** button linking to the hosted invoice page.
   - Descriptions are built from a stored `kind` and parameters, so they are translated in the viewer's language rather than showing Stripe's English text.
5. **Plan history**: a timeline of changes (started, upgraded, cancel scheduled, resumed, payment failed, refunded) from `SubscriptionEvent`.
6. **Minutes**: the balance of the team pool and the buyer's own, with the **Buy minutes** packs (§11). A link to the Usage page.

**Rules for changes**

| Change | When it takes effect | Charge |
|---|---|---|
| Upgrade (a higher plan) | **Immediately** | The prorated difference is invoiced now |
| Downgrade (a lower plan) | **At the end of the current period** | None; a scheduled change is stored and shown |
| Monthly → yearly | Immediately | Prorated, invoiced now |
| Yearly → monthly | At the end of the period | None |
| Add seats | Immediately | Prorated, invoiced now |
| Remove seats | At the end of the period | None |
| Cancel | At the end of the period (`cancel_at_period_end`) | None |
| Resume | Immediately, until the period ends | None |

- **Downgrade checks**: leaving Coach is blocked while the org has more members (plus pending invitations) than the new plan's seats. The dialog lists what has to be fixed first. Co-pilots and prospects above the new plan's maximum are not removed; they keep working, and only creating new ones is blocked (§8.2).
- **What cancelling means**, shown in the dialog: the plan stays active until the end date, then the org becomes read-only (§8.4). **All data is kept, and bought minutes are kept** for when the plan is resumed.
- **Immediate cancel and refunds are not self-service.** They go through an admin (§11b).
- **Stripe mechanics**: upgrades use a subscription update with `proration_behavior: always_invoice`. Downgrades and yearly → monthly use a **subscription schedule** (the current phase runs to the period end, then the next price). The preview uses Stripe's invoice preview. The Customer Portal is configured **per environment** to allow only payment methods and billing details, with cancellation and plan switching switched off there.
- **Idempotency**: every change request carries an idempotency key, so a double click never double-charges.
- **No card on file** (a trial or manual plan): the change goes through Stripe Checkout instead.
- **Failed payment on an upgrade**: the change is **not** applied. The user sees the error and stays on the old plan.

**Banners and alerts**
- **Past due**: a banner across the app for people with `billing.view`, with the 7-day grace period countdown and an **Update payment method** button.
- **Payment needs action** (3-D Secure): a banner linking to the hosted invoice page.
- **Trial ending**: three days before, an in-app alert (`BILLING_ALERT`, §10.1f) and an email.
- **Payment failed**: an email to the owner (already planned in §11) and the bell alert.
- Stripe's own successful-payment receipt emails are switched on in the Stripe dashboard.

**Data model**

```prisma
enum BillingInvoiceKind {
  SUBSCRIPTION
  SEATS
  TOPUP_TEAM
  TOPUP_PERSONAL
  OTHER
}

model BillingInvoice {
  id                  String             @id            // the Stripe invoice id
  organisation_id     String
  user_id             String?                           // set for personal top-ups
  stripe_customer_id  String
  subscription_id     String?
  kind                BillingInvoiceKind
  params              Json               @default("{}") // plan, interval, seats, pack id, for translated descriptions
  number              String?
  status              String                            // draft, open, paid, void, uncollectible
  amount_due_cents    Int
  amount_paid_cents   Int                @default(0)
  amount_refunded_cents Int              @default(0)
  currency            String             @default("usd")
  period_start        DateTime?
  period_end          DateTime?
  hosted_invoice_url  String?
  invoice_pdf_url     String?
  attempt_count       Int                @default(0)
  last_error          String?
  created_at          DateTime
  paid_at             DateTime?
  updated_at          DateTime           @updatedAt

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)

  @@index([organisation_id, created_at])
  @@index([user_id, created_at])
  @@index([status])
  @@map("billing_invoices")
}

enum SubscriptionEventType {
  STARTED
  PLAN_CHANGED
  CHANGE_SCHEDULED
  CHANGE_CANCELED
  SEATS_CHANGED
  CANCEL_SCHEDULED
  CANCEL_REVOKED
  CANCELED
  REACTIVATED
  TRIAL_STARTED
  TRIAL_ENDED
  TRIAL_EXTENDED
  PAYMENT_SUCCEEDED
  PAYMENT_FAILED
  REFUNDED
  CREDITS_GRANTED
  MANUAL_ASSIGNED
  DISCOUNT_APPLIED
  SYNCED
}

model SubscriptionEvent {
  id              String                @id @default(uuid())
  organisation_id String
  type            SubscriptionEventType
  from_plan       PlanKey?
  to_plan         PlanKey?
  actor_kind      String                // USER, ADMIN, STRIPE, SYSTEM
  actor_id        String?
  note            String?
  data            Json                  @default("{}") // reason, amounts, ids; never display text
  created_at      DateTime              @default(now())

  organisation Organisation @relation(fields: [organisation_id], references: [id], onDelete: Cascade)

  @@index([organisation_id, created_at])
  @@map("subscription_events")
}
```

`Subscription` (§3.4) also gains: `unit_amount_cents Int?` and `currency String @default("usd")` (a snapshot of what is being paid, for revenue figures), `pending_plan PlanKey?`, `pending_interval String?`, `pending_change_at DateTime?`, `canceled_at DateTime?`, `cancel_reason String?`, and `last_synced_at DateTime?`.

- Money is stored as **integer cents in USD**.
- Invoices are **mirrored from Stripe webhooks** into `BillingInvoice`, so the page and the admin lists are fast and don't call Stripe on every view. The PDF and hosted page are always Stripe's own links, so no PDFs are stored.
- Top-up Checkout Sessions are created with `invoice_creation: { enabled: true }`, so a top-up also produces an invoice to download.
- Invoices and events are kept indefinitely like all other data, and are removed only with the organisation or the account.

**Endpoints** (`billing.view` to read, `billing.manage` to change)

| Method | Path | Purpose |
|---|---|---|
| GET | `/billing/overview` | Plan, status, price, next charge, pending change, payment method summary, seats |
| GET | `/billing/invoices?cursor=` | Invoices and payments for the active organisation |
| GET | `/billing/events` | Plan history |
| POST | `/billing/preview-change` | Proration preview for `{ plan, interval, extra_seats }` |
| POST | `/billing/change-plan` | Applies an upgrade now, or schedules a downgrade; falls back to Checkout if there is no card |
| POST | `/billing/cancel` | Schedules cancellation, with `{ reason?, comment? }` |
| POST | `/billing/resume` | Removes a scheduled cancellation or scheduled change |
| POST | `/billing/portal` | Stripe portal URL for card and billing details (§11) |
| GET | `/billing/me/purchases` | The caller's own personal top-ups and receipts (any member) |

**Extra webhook events** (added to the table in §11):

| Event | Action |
|---|---|
| `invoice.created`, `invoice.finalized`, `invoice.voided`, `invoice.marked_uncollectible`, `invoice.updated` | Upsert `BillingInvoice` |
| `invoice.payment_action_required` | Mark the invoice and show the banner |
| `customer.subscription.trial_will_end` | `BILLING_ALERT` plus an email |
| `subscription_schedule.updated` / `.completed` | Set or clear `pending_*` on the subscription |
| `customer.updated`, `payment_method.attached` / `.detached` / `.updated` | Refresh the payment method summary |
| `charge.refunded` | Update `amount_refunded_cents`, zero any matching `UsageCredit` (§11) and add a `REFUNDED` event |

**Safety net**: a nightly BullMQ job, `billing-reconcile`, compares each Stripe subscription with its database row and fixes drift (a missed webhook). Every fix adds a `SYNCED` event and shows on the admin detail page.

### 11b. Admin: all subscriptions (`/admin/subscriptions`)

This is the "Organisations" admin page mentioned in §5.3 and §6.2. Those mentions mean this page; the endpoints already listed under `/admin/organisations/:id/...` keep their paths, and the new list and detail endpoints are under `/admin/subscriptions`. It is available to `ADMIN` and `SUPER_ADMIN` only (not `SUPPORT`, §13 item 9) and is added to the Admin sidebar group.

**Page 1: list, with three tabs**

*Tab: Subscriptions.*
- **Summary tiles**: active subscriptions by plan, **MRR** (monthly-normalised from `unit_amount_cents`, with yearly plans divided by 12) and ARR, trials running, past-due count and the amount at risk, cancellations scheduled, and churn this month (cancelled over the start-of-month count).
- **Table** (one row per organisation; sortable):
  - Organisation and owner (name and email), plan, status, source (Stripe or Manual), interval.
  - Seats used out of total, price per month, next renewal, trial end, and a "cancelling" flag.
  - Minutes used as a percent of the pool, **AI cost this period (charged and base), and margin** (revenue minus base cost; AI costs are visible to admins only, §6).
  - Failed payments count, created date, and an "out of sync" badge when the reconcile job found drift.
- **Filters**: plan, status, source, cancelling, past due, trial ending in the next N days, no subscription, margin below a threshold, and a search over organisation, owner email and Stripe ids.
- **Export**: a CSV of the filtered list (no card or personal data beyond the owner's name and email).

*Tab: Payments.* Every invoice and payment across all customers (`BillingInvoice`), with date, organisation or buyer, kind, amount, status and links to the hosted invoice and to Stripe. Filters: failed, open, refunded and date range. Totals for the filtered range (collected, refunded, failed). Top-up revenue is included and labelled team or personal.

*Tab: Failed and at risk.* The same table pre-filtered to past-due subscriptions and failed or open invoices, newest failure first, with attempt counts and the last error, so a failing card is found in one click.

**Page 2: subscription detail** (`/admin/subscriptions/:organisationId`)

| Section | Content |
|---|---|
| Summary | Organisation, owner and members, plan, status, source, interval, price, period, trial, scheduled change or cancellation, Stripe customer and subscription ids with **Open in Stripe** links |
| Effective limits | The plan's limits and features after AppConfig, with the usage consumed this period (§8.3a: pool, reserve, per-member) |
| Credits | Team balance, and the total of members' personal balances. Individual personal balances are visible to admins only here |
| Usage and margin | The last 6 periods: minutes, charged cost, base cost and revenue; the existing cost breakdown by kind and model (§6.2) |
| Invoices and payments | All of this organisation's invoices with status, and a **Refund** action |
| Members | Roles, minutes this period, and caps, linking to the student page view an owner would see |
| Timeline | All `SubscriptionEvent` rows with actor (user, admin, Stripe or system), filterable by type |
| Notes | The internal `manual_note` and a log of notes, visible to admins only |

**Admin actions** (every one is written to `SubscriptionEvent` with the admin as actor, and the destructive ones ask the admin to type the organisation name)

| Action | Who | Effect |
|---|---|---|
| Assign or change a **manual** plan | `ADMIN`+ | Plan, extra seats, period end and a required note (§5.3) |
| Extend trial | `ADMIN`+ | Adds N days and records `TRIAL_EXTENDED` |
| Grant minutes | `ADMIN`+ | Team pool, or one member (§5.3) |
| Apply a discount | `ADMIN`+ | Attaches a Stripe coupon to the subscription, using the existing coupons service |
| Cancel at period end, resume | `ADMIN`+ | Same as the user action |
| Re-sync from Stripe | `ADMIN`+ | Re-pulls the subscription and invoices and records `SYNCED` |
| **Refund** an invoice (full or partial) | `SUPER_ADMIN` only | A Stripe refund; zeroes the matching top-up credit; records `REFUNDED` |
| **Cancel immediately** | `SUPER_ADMIN` only | Cancels in Stripe now, with an optional prorated refund; the org turns read-only straight away |

**Endpoints** (`ADMIN` / `SUPER_ADMIN`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/subscriptions` | The list, filters, pagination and summary tiles |
| GET | `/admin/subscriptions/export.csv` | CSV of the filtered list |
| GET | `/admin/subscriptions/:organisationId` | The detail page data |
| GET | `/admin/payments` | The Payments tab and the Failed tab (by filter) |
| POST | `/admin/subscriptions/:organisationId/extend-trial` | Extend a trial |
| POST | `/admin/subscriptions/:organisationId/discount` | Apply a coupon |
| POST | `/admin/subscriptions/:organisationId/cancel` | `at_period_end` for admins, `immediate` for super admins |
| POST | `/admin/subscriptions/:organisationId/resume` | Resume |
| POST | `/admin/subscriptions/:organisationId/sync` | Re-sync from Stripe |
| POST | `/admin/billing-invoices/:id/refund` | Refund (`SUPER_ADMIN`) |

The assign-plan and grant-credits endpoints keep their §5.3 paths.

**Build order**: the list, the detail page and the manual-plan actions come first, in Phase 4, working from `Subscription` and the usage data alone. Phase 7 adds the Stripe data: the Payments and Failed tabs, MRR and churn, refunds, discounts, re-sync and the reconcile job.

**Edge cases**
- A webhook arrives out of order (an invoice update before its creation): upserts are keyed by the Stripe id and ignore older `updated_at`/event timestamps.
- An organisation with no Stripe customer (manual or trial): the Stripe links and the invoices are hidden, and MRR counts 0 for it.
- A plan price changes in Stripe: existing subscribers keep their `unit_amount_cents` snapshot until their subscription updates, so MRR matches what is actually billed.
- Currency: USD only (§13 item 7). An invoice in another currency is stored as-is and flagged on the admin page, but is excluded from MRR.
- A refund on a top-up whose minutes were already used: the remaining balance goes to zero, and the used minutes are not clawed back (§11). The admin sees the amounts before confirming.
- An admin changes the plan of a Stripe-managed subscription: not offered. Stripe-managed plans are changed by the owner or by cancel and re-assign, so the database and Stripe never disagree.
- Large data: all list endpoints are cursor-paginated and indexed on the filter columns above.
- Account deletion: the owner's invoices go with the organisation. Stripe keeps its own records, and the confirmation says that invoices can still be fetched from Stripe on request.

---

## 12. Out of scope

- **Extras**: custom branding, priority support, affiliate/commission tracking and white-label.
- Any automatic data retention or expiry.
- Language restrictions per plan.
- Client-reported realtime token usage (§4.5, a later improvement).
- Tax handling beyond Stripe Tax defaults (decide separately).

---

## 13. Decisions

### Resolved in review (2026-11-01)

1. **Existing organisations** go on PRO `TRIALING` for 30 days (§3.9 step 5).
2. **Existing `BROWSER` voice prospects** are migrated to OpenAI Realtime (§3.9 step 6).
3. **User-initiated deletes** (call, recording, transcript, `keep_recording`) are kept (§7).
4. **Top-up minutes** never expire and roll over until used (§2.4, §3.5).
5. **Build order**: the coach cohort features (Phase 6) come before Stripe billing (Phase 7) (§15).

6. **Minute accounting**: exact seconds, no rounding; calls under 5 seconds are not counted (§8.3).
7. **Currency**: USD only.
8. **Cost visibility**: only platform `ADMIN` / `SUPER_ADMIN` see AI costs. Everyone else sees usage minutes (§6).
9. **`SUPPORT` role**: no access to the new admin pages for now (§5.3).
10. **Realtime voice pricing**: `gpt-realtime` is deprecated (shutdown 2027-01-20). Switch to `gpt-realtime-2.1`, which models.dev prices directly. The transcription models are deprecated too, so they also migrate (§4.7a).
11. **Buying more minutes**: every member of a paid org buys their own personal minutes, with no coach involvement or approval. Only owners (and billing admins) buy team-pool minutes (§2.4, §3.5, §11).

12. **Coach tools**: student page, practice assignments, comments on calls, weekly report (in the app, not by email), CSV export, and in-app notifications (§10.1a–g).

13. **Per-student co-pilots and prospects**: access setting on each (everyone or selected students), shared items visible to both coach and student, assignments grant access, students manage only their own prospects and may create private ones the coach can see (§10.1h).

14. **Billing screens**: a user billing page (plan, invoices and payments, upgrade, downgrade, cancel, resume, seats, buy minutes) and an admin subscriptions page with Payments and Failed tabs and a detail page. Upgrades apply immediately and downgrades and cancellations at the end of the period. Card and billing details go through Stripe's portal; everything else stays in the app. Refunds and immediate cancellation are `SUPER_ADMIN` only (§11a, §11b).

### Still open

- Confirm the `gpt-live-transcribe` and `gpt-transcribe` prices on OpenAI's pricing page, and whether `gpt-transcribe` supports diarization (§4.7a). Both will be checked at the start of Phase 2. No decision is needed from you unless diarization is missing.

---

## 14. Edge cases and considerations

- **models.dev unavailable or changed schema**: last-good snapshot in `ModelPrice`, lenient parsing, never blocking. The admin page shows "last synced X hours ago" and a warning after 48h.
- **Model removed from models.dev**: the cached row is kept (it is marked stale, not deleted), so the cost stays known until an override is added.
- **Price change upstream**: only new events use the new price. Historical events keep their `unit_prices` snapshot.
- **Markup changes**: apply to new events only (stored per event).
- **Concurrent admin edits**: optimistic `version` check, with a 409 telling the admin to reload.
- **Invalid config after a deploy**: the registry default is used and an error is logged. The admin page flags the key.
- **Limit lowered below current usage**: existing items stay and only creation is blocked (§8.2).
- **Plan downgrade mid-period**: the new limits apply immediately via the webhook. Minutes already used count against the new allowance, so the org may be at 0 until the next period. This is shown clearly in the meters.
- **Concurrent call starts racing the minute pool**: acceptable soft overrun, bounded by `max_duration` computed at start. A Redis lock per org is optional if abuse appears.
- **Reserve and caps edge cases**:
  - An admin sets `R` above the pool, or a cap of 0: rejected by validation on save.
  - Plan limits lowered below the reserve: the reserve is clamped to the pool, and the admin page warns.
  - A student is promoted to owner: they leave the capped group immediately, and their past usage counts toward `U_o`.
  - A student leaves or is removed mid-period: their past seconds stay in `U_n`, so the pool doesn't refill.
  - Two students start calls at the same moment near the cap: a bounded soft overrun (§8.3), because `max_duration_seconds` is fixed at start.
  - Org `ADMIN` with delegated permissions: still capped, since only `OWNER` gets the reserve.
- **Access control edge cases**:
  - A co-pilot or prospect is switched from `ORGANISATION` to `SELECTED` while students are mid-session: running sessions finish (they use the snapshot), and the next start is blocked.
  - The default co-pilot (`is_default`) is made `SELECTED`: allowed, but members without access fall back to no default, and the "Start call" screen asks them to pick from what they can see (or tells them none is shared).
  - A student has no co-pilot access at all: they can still practise (practice doesn't need a co-pilot) and can't start live calls with one, with a message saying nothing is shared yet.
  - A user is removed from the org: their access rows stay (cascade only on user deletion) and apply again if they rejoin.
  - A user is deleted: access rows and their authored private prospects follow the existing account-deletion rules; prospects with `user_id` set to null remain editable only by `manage_all`.
  - A coach deletes a prospect that is `SELECTED` and has history: history stays through snapshots, and active assignments show the "prospect removed" state (§14 coach tools).
  - Organisation-wide limits still count private student prospects, so a coach on a limited plan can't be blocked by a student without seeing why: the admin Organisations page lists counts.
  - Recreating a prospect from a live call (`source_call_id`) creates it private to the author, or to the coach's choice if the coach does it.
  - Cache and filters: every list query adds the access filter in the database (a join on the access table), not in memory, so pagination and counts stay correct.
- **Coach tools edge cases**:
  - A student is removed from the org: their assignment targets, comments and notifications stay (the coach's history stays complete), but the person can no longer open the org. Their open assignments stop counting as overdue in reports.
  - A prospect is deleted or archived while assignments use it: the assignment keeps the snapshot name, can't be started, and the coach is warned at delete time with a count of affected assignments.
  - A student completes the assignment's prospect without starting from the assignment: it doesn't count, since only calls started from the assignment carry `assignment_id`. The UI always routes through the assignment.
  - Practice call whose analysis fails: no attempt is counted. A successful re-run later counts once (completion is keyed by call id, not incremented blindly).
  - The coach downgrades or the plan is cancelled: assignments, comments and reports stay readable and are kept. Creating new ones needs the plan flags back.
  - A role loses `coaching.view`: it immediately stops seeing the pages and the API returns 403. Their notifications of coaching types are hidden.
  - The coach comments on a call whose analysis is hidden by plan visibility: the comment is independent of analysis and is always shown.
  - A student deletes the call being commented on: comments go with it (cascade), as does any assignment attempt link (`SetNull`) while the counted attempt stays.
  - Two coaches (owners) in one org: both see and can edit all assignments, and both get the weekly report.
  - A digest week with no data, a group assignment with 0 students (no members yet) or a due date in the past: all validated or handled with a clear message, never an error.
- **Personal credits**:
  - A student is removed from the org: their personal credits stay on their row but can't be spent until they rejoin that organisation. The remove-member confirmation tells the student about any remaining balance. An admin can issue a manual Stripe refund if needed.
  - The organisation is deleted: personal credits are deleted with it (cascade). The delete-organisation confirmation warns when members hold bought minutes.
  - A student buys minutes in a coach org, then the coach's subscription is `CANCELED`: the org is read-only, so the credits can't be spent until it resubscribes.
  - A student buys while the pool is not actually empty: allowed. Personal minutes sit unused until the pool and cap allowance are exhausted.
  - Chargebacks and refunds (`charge.refunded`): the matching `UsageCredit` remaining balance is zeroed. Seconds already consumed are not clawed back.
  - Personal credits are never visible to other members. The coach's cohort page shows only plan minutes (pool and caps), not who bought extra.
- **Rolling top-up credits**:
  - Credits survive downgrades, cancellation and plan changes.
  - A `CANCELED` org can't spend them, because creation is blocked, but they are kept for when it resubscribes.
  - Credits are deleted only with the organisation (cascade).
  - Deleting a call does **not** refund its consumed credits, to prevent abuse.
  - A call that failed before producing a transcript is refunded via `UsageCreditConsumption`.
- **Offline transcript queue** (an existing feature): segments uploaded after the call ends are still accepted, and enforcement only stops co-pilot suggestions.
- **Upload longer than remaining minutes**: rejected after the duration probe, before transcription costs are incurred.
- **Coach student in multiple orgs**: consumption is per org. A student practising in a personal org uses that org's plan.
- **Usage events on account deletion**: `UsageEvent` cascades with the user. Billing truth is in Stripe, so this is acceptable. Org-level totals for the remaining org change accordingly.
- **Float precision**: costs are tiny (around 1e-5). Keep `Float` for compatibility, but round only for display. Consider `Decimal(14,8)` if invoicing is ever based on these values, which is not planned.
- **Multiple API instances**: AppConfig and entitlement caches are invalidated via Redis.
- **i18n**: the 12 locales, plus plan and feature names translated (keys, not stored labels).

---

## 15. Implementation phases

Each phase is shippable on its own and leaves the app working.

### Phase 1 – AppConfig foundation
1. Prisma: `AppConfig` and `AppConfigHistory`, plus the migration.
2. `app-config` module: registry, service with cache and Redis invalidation, admin controller.
3. Seed script and `ensureDefaults()`. Initial keys: `pricing.markup_percent`, `ai.default_models`.
4. Admin UI: `/admin/config` route in `routes/index.tsx` and `routes.ts`, a sidebar entry in `AdminLayout`, and a generic page with tabs per category. Typed editors are planned for known keys (number input, plan matrix, visibility matrix), with a JSON editor fallback for the rest. Includes the history drawer.
5. i18n for the admin UI (12 locales).

### Phase 2 – models.dev pricing and markup
1. Audio model migration (§4.7a):
   - Add `gpt-realtime-2.1`, `gpt-live-transcribe` and `gpt-transcribe` to the curated catalog.
   - Confirm their prices and whether `gpt-transcribe` supports diarization.
   - Regression-test practice voice, live transcription and uploads.
   - Switch `ai.default_models` to the new models. The deadline is before 2027-01-20.
2. Prisma: `ModelPrice` and the `UsageEvent` pricing columns, plus the backfill.
3. `ModelPricingService`: sync, resolver chain, estimators, BullMQ repeatable job.
4. Refactor `AiService.toResult`, `UsageService.record`, `recordAudioUsage` and upload transcription to use it. Remove the hardcoded prices.
5. AppConfig keys: `pricing.model_overrides`, `pricing.audio_tokens_per_minute`, `pricing.sync`.
6. Admin "Pricing" tab: markup, synced prices table (source, `fetched_at`), unpriced models with "add override", "Sync now".
7. Tests: resolver chain, cost formulas (cache, reasoning, audio) and markup snapshotting.

### Phase 3 – User UI simplification
1. Usage API: strip every money field for non-admins. Add minutes per session for everyone, and `cost_per_session` for platform admins only.
2. Usage page: users see minutes only (no costs, price list or breakdowns). Platform admins see the cost mode (§6.2).
3. Session cost on the call detail page, platform admins only.
4. Hide model pickers (co-pilot editor, rerun dialog) and the model names. Make `/catalog` admin-aware. Resolve models at runtime from `ai.default_models`.
5. Hide browser voice, and run the `BROWSER` → `OPENAI_REALTIME` migration if confirmed.
6. i18n.

### Phase 4 – Plans, subscriptions and enforcement (no Stripe yet)
1. Prisma: `Subscription`, `UsageCredit` and the enums, plus the data migration for existing orgs.
2. AppConfig: `plans.definitions` with the seed values from §2.
3. `EntitlementsService` and `PlanLimitService`, wired into every create, start, upload and invite path. Add the `@RequiresFeature` guard.
4. Call-time limits: `max_duration_seconds`, client countdown and auto-end, server backstop. Includes the owner reserve and per-member caps (§8.3a), with tests for the formulas (owner vs non-owner, several owners, reserve exceeded, cap reached, top-ups).
5. Admin "Plans" tab (limits and features matrix) and the admin Subscriptions page (§11b): the list, the detail page, and the manual-plan, trial-extension and credit-grant actions, built first without Stripe data.
6. Frontend: `features/billing` hooks, plan meters on the usage page, `<PlanGate>`, upgrade dialog, error-code handling.
7. i18n.

**Security prerequisite (from §10.1h):** ship the prospect ownership fix in this phase, before any coach invites students. It adds `prospects.manage_all`, makes `prospects.manage` mean "your own", and migrates existing admins. Without it, a student can edit or delete the coach's prospects.

This phase lets you onboard the first coaches on MANUAL plans before payments exist. Admin credit grants (rolling `UsageCredit`) work here too. Paid top-ups arrive in Phase 7.

Phase 4 also includes the data migrations: existing orgs move to a 30-day PRO trial, and `BROWSER` prospects move to `OPENAI_REALTIME`. The voice migration can ship earlier, with Phase 3.

### Phase 5 – Analysis visibility
1. AppConfig `analysis.visibility` with the seed matrix.
2. `AnalysisVisibilityService`, applied in calls, WebSocket and dashboard aggregates.
3. `<AnalysisSection>` locked-state UI and timeline marker gating.
4. Admin "Analysis visibility" tab (plan × feature checkbox matrix).
5. i18n.

### Phase 6 – Coach features

All gated by the Coach feature flags and the new `coaching.*` permissions, using MANUAL Coach subscriptions from Phase 4. This needs no Stripe, so the first coaches get the full coach experience before payments exist. Each sub-phase ships on its own.

**6a. Foundations**
1. Migration `…_coaching`: `Call.assignment_id`, `PracticeAssignment`, `AssignmentTarget`, `CallComment`, `Notification`, `CoachDigest`.
2. The `coaching.*` permissions (catalog, presets, `sanitizePermissions` implications), the five feature flags, and the `coaching.digest` / `coaching.inactive_days` AppConfig keys.
3. Notifications (§10.1f): API, header bell, `/notifications` page, 60-second polling.
4. The privacy notice on the invitation accept screen.

**6b. Cohort dashboard and student page**
1. Cohort endpoint and page: leaderboard, inactive students, per-member caps, pool and reserve (§10.1).
2. `DashboardService` gets the `userId` filter, then the student page (§10.1b).
3. The "Coaching" sidebar group.

**6c. Practice assignments** (§10.1c): API, the completion post-step after analysis, the coach pages, the student "Assigned to me" card, due-soon job, and tests for completion rules and the all-members case.

**6d. Coach comments** (§10.1d): API, the call detail card with timestamps, notifications, and tests for who can read and write.

**6e. Weekly report and export** (§10.1e, §10.1g): the weekly job and `/coaching/reports`, then the CSV endpoints and buttons.

**6f. Per-student access** (§10.1h):
1. Migration `…_agent_access`, the `AgentAccessService` and its use on every list, detail, call-start and dashboard path.
2. The access endpoints, the "Who can use this" editor section, badges, and the Access section on the student page.
3. Students' own private prospects and the per-member prospect limit.
4. Assignment creation granting access, and the `AGENT_SHARED` notification.
5. Tests: a student can't see, open, start or edit what isn't shared; 404 rather than 403; the linked co-pilot works inside its prospect's session; downgrade keeps restrictions; history survives revoked access.

Each sub-phase includes i18n for all 12 locales: page text, notification types, status labels and permission names.

### Phase 7 – Stripe billing
1. Stripe products and prices per environment, and the `plans.stripe_prices` / `plans.topup_packs` keys.
2. Checkout, portal, top-up and webhook endpoints, plus idempotency and the `billing.*` permissions. Top-up purchases create rolling `UsageCredit` rows (§3.5), personal or team (§11). Add the per-user Stripe customer, the Buy minutes dialog for every member, the `charge.refunded` handling, and tests that a student can't buy a `team` top-up.
3. Pricing page (in-app and landing), with the annual toggle and seat quantity for Coach.
4. Moving MANUAL subscriptions to Stripe: when an org on a MANUAL plan completes checkout, the webhook switches `source` to `STRIPE` on the same row.
5. Org and account deletion cancel the subscription.
6. **User billing page** (§11a): migration for `BillingInvoice`, `SubscriptionEvent` and the new `Subscription` columns; the `/billing/*` endpoints (overview, invoices, events, preview, change, cancel, resume, my purchases); upgrade now and scheduled downgrades with Stripe schedules; the extra webhook events; the Stripe portal configured for payment methods only; the past-due, action-required and trial-ending banners and alerts; i18n in the 12 locales.
7. **Admin subscriptions, Stripe side** (§11b): the Payments and Failed tabs, MRR, ARR and churn tiles, refund, discount and re-sync actions, and the nightly `billing-reconcile` job.
8. End-to-end tests with the Stripe CLI (`stripe listen`) on staging (`.env.staging`), covering: upgrade with a failed card (not applied), downgrade scheduling and the seat check, cancel then resume, a webhook arriving twice or out of order, a refund of a top-up, and a student's personal purchase staying invisible to the coach.

### Phase 8 – Rollout
1. Margin check with real synced prices (§10.2), then adjust the seeds through the admin UI (no deploy needed).
2. Staging verification of each limit, visibility and webhook path.
3. Production: run migrations, seed, create the Stripe prices, fill the price IDs in AppConfig, enable checkout.
4. Add a note to `AGENTS.md`: limits and prices come from AppConfig and models.dev, never hardcode them, and don't schedule deletion of user data.

---

## 16. Dependencies

- **External**: models.dev `api.json` (no key, MIT), the Stripe account and products, and the OpenAI docs for audio token rates.
- **Internal, existing**: BullMQ and Redis (sync job, caches), the Stripe integration scaffold, Resend (payment-failed emails), `RolesGuard` and the `/admin` layout, the org permissions system.
- **No new npm packages** are expected.

---

## 17. Implementation notes (2026-11-06)

Where the build differs from, or adds to, the draft above:

- **Migrations** are generated with `prisma migrate diff` and live in `api/prisma/migrations/20261106100000_*` … `20261106100800_*` (app config, model prices, usage-event pricing, subscriptions, the two data migrations, coaching, agent access, billing). The data migrations (§3.9 steps 5–6) are SQL in their own migrations so they run with `migrate deploy`; owners of existing organisations are marked as having used their trial. The coaching migration also adds the `coaching.*` permissions to existing ADMIN roles.
- **Minute accounting** is settled once per call into `Call.counted_seconds` / `personal_credit_seconds` / `usage_settled_at` (`CreditsService.settleCall`), so pool and cap aggregates are a single `groupBy`. Historical calls are backfilled. Credit draw-down uses conditional decrements instead of `SELECT … FOR UPDATE`.
- **TRIAL** uses a new limit flag `practice_shares_live_pool` for "20 minutes shared by live and practice".
- **Costs** are computed in `UsageService.record` from raw token/audio usage (callers no longer pass a cost); practice voice is billed as user audio in / prospect audio out, split from the transcript timings.
- **Audio models**: `ai.default_models` seeds `gpt-realtime-2.1` (voice) and `gpt-live-transcribe` (live transcription). Uploads stay on `gpt-4o-transcribe-diarize` because diarization support of `gpt-transcribe` is still unconfirmed; switching is a config change, and models without diarization get speakers attributed by the utility model. The `gpt-live-transcribe` / `gpt-transcribe` per-minute overrides are third-party quotes — confirm them on OpenAI's pricing page.
- **Extra settings**: `billing.past_due_grace_days` (default 7) and `pricing.sync.alias_providers` (default `["vercel"]`).
- **Feature-gated permissions**: `calls.view_all` / `calls.manage_all` only take effect on plans with `view_all_member_calls` (applied in `OrgAccessService.effectivePermissions`, stored role permissions are untouched).
- **Knowledge document import** is client-side, so its plan gate is UI-only (typing knowledge is always allowed).
- **Coach-access notice**: accepting an invitation to a coach organisation records `Membership.coach_access_acknowledged_at`.

- **Public pricing**: `GET /plans/public` serves the same public catalog without a session (no Stripe ids, no costs); the landing page builds its plan points, prices and trial length from it, with static copy only as a fallback.

**Verification (2026-11-06)**, on a throwaway local Postgres 18 + Redis 7:
- All migrations apply from scratch (`migrate deploy`), the seed creates the 12 AppConfig keys, and `prisma migrate diff` shows no drift between the database and the schema.
- A live models.dev sync priced all 14 tracked models (direct, alias and admin-override sources as designed).
- An end-to-end HTTP smoke test (41 checks) covers: trial on sign-up and trial-once, plan limits (co-pilots, invitations), `max_duration_seconds`, minute settlement, money hidden from users, admin config (versioning, 409 conflicts, validation, history), manual Coach plan, team credit grants, admin subscriptions, coaching endpoints, analysis visibility on Starter and the public plan catalog.
- Signed Stripe webhook tests (7 checks): bad signatures rejected, personal top-up credited to the buyer, replayed events and repeated payments never grant twice, refunds zero the remaining credit.
- Browser checks of the landing pricing, usage, configuration and billing pages (no console errors). This found and fixed one bug (plan history dropped every event without a `scope`).
- 100 API unit tests, API and app production builds, lint clean on all changed files; every key present in all 12 locales.

**§10.2 margin check (2026-11-06, synced models.dev prices)** — reproducible worst-case estimates:

| Unit | Cost | Assumptions |
|---|---|---|
| Live minute (online meeting) | $0.042 | 2 × `gpt-live-transcribe` ($0.017/min) + ~4 suggestions/min on `gpt-4.1-mini` (3.5k in, half cached / 200 out) + analysis spread over a 15-min call |
| Practice minute | $0.166 | `gpt-realtime-2.1`, both sides speaking the whole minute (600/1,200 audio tokens) + 50% text/context overhead + user transcription |
| Upload minute | $0.009 | `gpt-4o-transcribe-diarize` $0.006/min + analysis |
| Analysis per call | $0.054 | `gpt-4.1`, ~15k in / 3k out |

| Plan (indicative price) | Worst case at full usage | Share of price |
|---|---|---|
| Starter ($29) | $10.08 | 35% ✓ |
| Pro ($59 / $79) | $75.35 | 128% / 95% ✗ |
| Coach ($149 base, 11 seats) | $229.97 | 154% ✗ (before extra-seat revenue) |

Within 40% at a 2:1 live:practice split: Pro $79 ≈ 250 live + 125 practice minutes; Coach $149 ≈ 475 live + 235 practice minutes. Practice voice dominates the cost. Decision (2026-11-06): lower the allowances. The seeds are now Pro 250 live + 125 practice minutes; Coach 475 live + 235 practice minutes pooled, owner reserve 95 live minutes, per-student caps 65 live / 35 practice minutes. Starter is unchanged (35%). Environments already seeded keep their stored values; change them on the admin Configuration page. Found during the check: models.dev prices `gpt-4o-transcribe(-diarize)` only through a gateway alias that works out ~4× too low, so both now have seeded per-minute overrides ($0.006/min).

**Per-environment setup still required** (Phase 8): create the Stripe products/prices and fill `plans.stripe_prices` and `plans.topup_packs[].stripe_price_id` in the admin Configuration page; set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PORTAL_CONFIGURATION_ID` (a portal configuration limited to payment methods and billing details); subscribe the webhook endpoint `/billing/webhook` to the events handled in `stripe-webhooks.service.ts`; run `migrate deploy` and `npm run seed:<env>`; then do the §10.2 margin check with synced prices and end-to-end Stripe tests (`stripe listen`) on staging.

