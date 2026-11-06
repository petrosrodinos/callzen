-- Data migration (decided in review): browser voice is no longer offered to users, so existing BROWSER
-- prospects move to OpenAI Realtime. Voices that are not OpenAI voices fall back to "marin".
UPDATE "practice_agents"
SET "voice_provider" = 'OPENAI_REALTIME',
    "voice" = CASE
        WHEN "voice" IN ('marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse') THEN "voice"
        ELSE 'marin'
    END
WHERE "voice_provider" = 'BROWSER';
