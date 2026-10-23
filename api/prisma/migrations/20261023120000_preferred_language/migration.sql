-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferred_language" TEXT NOT NULL DEFAULT 'en';

-- Existing accounts start on English
UPDATE "users" SET "preferred_language" = 'en';
