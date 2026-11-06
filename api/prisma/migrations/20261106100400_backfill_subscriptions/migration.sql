-- Data migration (decided in review): every existing organisation gets a 30-day PRO trial, assigned manually.
-- When it ends without a paid subscription the organisation becomes read-only.
INSERT INTO "subscriptions" (
    "id", "organisation_id", "plan", "status", "source",
    "current_period_start", "current_period_end", "trial_ends_at", "manual_note", "updated_at"
)
SELECT
    gen_random_uuid()::text, o."id", 'PRO', 'TRIALING', 'MANUAL',
    NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days',
    'Existing organisation: 30-day Pro trial at launch of paid plans', NOW()
FROM "organisations" o
WHERE NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."organisation_id" = o."id");

-- Owners of those organisations have now had their one trial.
UPDATE "users" u SET "trial_used_at" = NOW()
WHERE u."trial_used_at" IS NULL
  AND EXISTS (SELECT 1 FROM "memberships" m WHERE m."user_id" = u."id" AND m."role" = 'OWNER');
