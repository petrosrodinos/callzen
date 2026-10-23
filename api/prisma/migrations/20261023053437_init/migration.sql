-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LOGO', 'BANNER', 'IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "OutputLanguageMode" AS ENUM ('CONVERSATION', 'INTERFACE');

-- CreateEnum
CREATE TYPE "SuggestionFrequency" AS ENUM ('OBJECTIONS_ONLY', 'BALANCED', 'CONSTANT');

-- CreateEnum
CREATE TYPE "SuggestionLength" AS ENUM ('SHORT', 'MEDIUM');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('COLD', 'WARM');

-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('OPENAI_REALTIME', 'BROWSER');

-- CreateEnum
CREATE TYPE "CallKind" AS ENUM ('LIVE', 'PRACTICE');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('ONLINE_MEETING', 'MICROPHONE', 'PRACTICE');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('IN_PROGRESS', 'ANALYZING', 'ANALYZED', 'ANALYSIS_FAILED', 'ENDED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('MEETING_BOOKED', 'DEAL_WON', 'FOLLOW_UP', 'LOST', 'NO_DECISION', 'GATEKEEPER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CallEndReason" AS ENUM ('USER', 'PROSPECT_HUNG_UP', 'TIME_LIMIT', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('USER', 'PROSPECT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('OPENER', 'DISCOVERY_QUESTION', 'OBJECTION_RESPONSE', 'VALUE_STATEMENT', 'BUYING_SIGNAL', 'NEXT_STEP', 'REMINDER', 'WARNING', 'CONSENT', 'ANSWER');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('SHOWN', 'DISMISSED', 'PINNED');

-- CreateEnum
CREATE TYPE "SuggestionFeedback" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('SUGGESTION', 'ASK', 'ANALYSIS', 'PRACTICE_TURN', 'PRACTICE_VOICE', 'TRANSCRIPTION', 'GENERATION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "AuthRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "interface_language" TEXT NOT NULL DEFAULT 'en',
    "output_language_mode" "OutputLanguageMode" NOT NULL DEFAULT 'CONVERSATION',
    "consent_line" TEXT,
    "keep_recordings" BOOLEAN NOT NULL DEFAULT true,
    "consent_acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "user_uuid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'LOGO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "call_goal" TEXT,
    "script" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT,
    "knowledge" TEXT,
    "objection_library" JSONB NOT NULL DEFAULT '[]',
    "methodology" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tone" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "suggestion_frequency" "SuggestionFrequency" NOT NULL DEFAULT 'BALANCED',
    "suggestion_length" "SuggestionLength" NOT NULL DEFAULT 'SHORT',
    "alternatives_count" INTEGER NOT NULL DEFAULT 1,
    "realtime_model" TEXT NOT NULL,
    "analysis_model" TEXT NOT NULL,
    "analysis_criteria" JSONB NOT NULL DEFAULT '[]',
    "consent_line" TEXT,
    "suggest_consent_line" BOOLEAN NOT NULL DEFAULT false,
    "template_key" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prospect_name" TEXT,
    "role_prompt" TEXT NOT NULL,
    "scenario_context" TEXT,
    "scenario_type" TEXT NOT NULL DEFAULT 'COLD_CALL',
    "selling_product" TEXT,
    "linked_assistant_agent_id" TEXT,
    "user_objective" TEXT,
    "lead_temperature" "LeadTemperature" NOT NULL DEFAULT 'COLD',
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "personality" TEXT,
    "mood" TEXT,
    "communication_style" TEXT,
    "decision_authority" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "current_solution" TEXT,
    "pain_points" JSONB NOT NULL DEFAULT '[]',
    "objections" JSONB NOT NULL DEFAULT '[]',
    "hidden_information" JSONB NOT NULL DEFAULT '[]',
    "conversion_conditions" JSONB NOT NULL DEFAULT '[]',
    "patience" INTEGER NOT NULL DEFAULT 3,
    "language" TEXT NOT NULL DEFAULT 'en',
    "accent" TEXT,
    "industry" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "age_range" TEXT,
    "background_story" TEXT,
    "briefing" TEXT,
    "voice_provider" "VoiceProvider" NOT NULL DEFAULT 'OPENAI_REALTIME',
    "voice" TEXT NOT NULL DEFAULT 'marin',
    "time_limit_minutes" INTEGER,
    "source_call_id" TEXT,
    "template_key" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "CallKind" NOT NULL,
    "call_type" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "assistant_agent_id" TEXT,
    "practice_agent_id" TEXT,
    "copilot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT,
    "prospect_name" TEXT,
    "prospect_company" TEXT,
    "prospect_role" TEXT,
    "context_notes" TEXT,
    "goal" TEXT,
    "prior_call_id" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "ended_reason" "CallEndReason",
    "outcome" "CallOutcome",
    "custom_outcome" TEXT,
    "objective_achieved" BOOLEAN,
    "keep_recording" BOOLEAN NOT NULL DEFAULT true,
    "recording_path" TEXT,
    "recording_mime" TEXT,
    "recording_size" INTEGER,
    "user_notes" TEXT,
    "agent_snapshot" JSONB,
    "practice_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "client_id" TEXT,
    "speaker" "Speaker" NOT NULL,
    "text" TEXT NOT NULL,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "at_ms" INTEGER NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'SHOWN',
    "feedback" "SuggestionFeedback",
    "model" TEXT,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "at_ms" INTEGER NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_analyses" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL,
    "category_scores" JSONB NOT NULL DEFAULT '[]',
    "mistakes" JSONB NOT NULL DEFAULT '[]',
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "prospect_insights" JSONB NOT NULL DEFAULT '{}',
    "summary" TEXT NOT NULL,
    "next_steps" JSONB NOT NULL DEFAULT '[]',
    "follow_up_draft" TEXT,
    "suggested_practice" JSONB NOT NULL DEFAULT '[]',
    "practice_result" JSONB,
    "suggestion_usage" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "call_id" TEXT,
    "kind" "UsageKind" NOT NULL,
    "model" TEXT,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "audio_seconds" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_id_idx" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_uuid_idx" ON "password_reset_tokens"("user_uuid");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "documents_user_uuid_idx" ON "documents"("user_uuid");

-- CreateIndex
CREATE INDEX "documents_id_idx" ON "documents"("id");

-- CreateIndex
CREATE INDEX "assistant_agents_user_id_idx" ON "assistant_agents"("user_id");

-- CreateIndex
CREATE INDEX "practice_agents_user_id_idx" ON "practice_agents"("user_id");

-- CreateIndex
CREATE INDEX "calls_user_id_started_at_idx" ON "calls"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "calls_assistant_agent_id_idx" ON "calls"("assistant_agent_id");

-- CreateIndex
CREATE INDEX "calls_practice_agent_id_idx" ON "calls"("practice_agent_id");

-- CreateIndex
CREATE INDEX "transcript_segments_call_id_start_ms_idx" ON "transcript_segments"("call_id", "start_ms");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_segments_call_id_client_id_key" ON "transcript_segments"("call_id", "client_id");

-- CreateIndex
CREATE INDEX "suggestions_call_id_at_ms_idx" ON "suggestions"("call_id", "at_ms");

-- CreateIndex
CREATE INDEX "bookmarks_call_id_idx" ON "bookmarks"("call_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_analyses_call_id_key" ON "call_analyses"("call_id");

-- CreateIndex
CREATE INDEX "usage_events_user_id_created_at_idx" ON "usage_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_uuid_fkey" FOREIGN KEY ("user_uuid") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_agents" ADD CONSTRAINT "assistant_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agents" ADD CONSTRAINT "practice_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agents" ADD CONSTRAINT "practice_agents_linked_assistant_agent_id_fkey" FOREIGN KEY ("linked_assistant_agent_id") REFERENCES "assistant_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_assistant_agent_id_fkey" FOREIGN KEY ("assistant_agent_id") REFERENCES "assistant_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_practice_agent_id_fkey" FOREIGN KEY ("practice_agent_id") REFERENCES "practice_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_analyses" ADD CONSTRAINT "call_analyses_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
