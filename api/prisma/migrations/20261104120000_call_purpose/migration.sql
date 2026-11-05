-- CreateEnum
CREATE TYPE "CallPurpose" AS ENUM ('SALES', 'COLD_CALL');

-- AlterTable
ALTER TABLE "calls" ADD COLUMN "purpose" "CallPurpose" NOT NULL DEFAULT 'SALES';
