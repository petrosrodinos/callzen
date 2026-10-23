-- AlterTable
ALTER TABLE "assistant_agents" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "practice_agents" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: every existing agent speaks its primary language.
UPDATE "assistant_agents" SET "languages" = ARRAY["language"] WHERE cardinality("languages") = 0;
UPDATE "practice_agents" SET "languages" = ARRAY["language"] WHERE cardinality("languages") = 0;
