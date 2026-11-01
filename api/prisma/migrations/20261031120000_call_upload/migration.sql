-- AlterEnum
ALTER TYPE "CallStatus" ADD VALUE 'QUEUED';
ALTER TYPE "CallStatus" ADD VALUE 'TRANSCRIBING';
ALTER TYPE "CallStatus" ADD VALUE 'TRANSCRIPTION_FAILED';

-- AlterEnum
ALTER TYPE "CallType" ADD VALUE 'UPLOAD';

-- AlterTable
ALTER TABLE "calls" ADD COLUMN "transcription_error" TEXT,
ADD COLUMN "source_filename" TEXT,
ADD COLUMN "clean_transcript" BOOLEAN NOT NULL DEFAULT false;
