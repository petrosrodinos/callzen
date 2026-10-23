-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "analysis_error" TEXT,
ADD COLUMN     "script_progress" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "suggestions" ADD COLUMN     "info_card" JSONB;
