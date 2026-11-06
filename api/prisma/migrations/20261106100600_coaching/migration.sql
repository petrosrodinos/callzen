-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT_NEW', 'ASSIGNMENT_DUE_SOON', 'ASSIGNMENT_COMPLETED', 'COMMENT_NEW', 'COMMENT_REPLY', 'COACH_REPORT', 'AGENT_SHARED', 'BILLING_ALERT');

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "assignment_id" TEXT;

-- CreateTable
CREATE TABLE "practice_assignments" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "practice_agent_id" TEXT,
    "practice_agent_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "due_at" TIMESTAMP(3),
    "target_score" INTEGER,
    "required_attempts" INTEGER NOT NULL DEFAULT 1,
    "all_members" BOOLEAN NOT NULL DEFAULT false,
    "due_soon_notified_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_targets" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER,
    "last_attempt_at" TIMESTAMP(3),
    "counted_call_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_comments" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "author_id" TEXT,
    "parent_id" TEXT,
    "at_ms" INTEGER,
    "body" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_digests" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "dedupe_key" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_assignments_organisation_id_archived_at_idx" ON "practice_assignments"("organisation_id", "archived_at");

-- CreateIndex
CREATE INDEX "practice_assignments_due_at_idx" ON "practice_assignments"("due_at");

-- CreateIndex
CREATE INDEX "assignment_targets_user_id_completed_at_idx" ON "assignment_targets"("user_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_targets_assignment_id_user_id_key" ON "assignment_targets"("assignment_id", "user_id");

-- CreateIndex
CREATE INDEX "call_comments_call_id_created_at_idx" ON "call_comments"("call_id", "created_at");

-- CreateIndex
CREATE INDEX "coach_digests_organisation_id_period_end_idx" ON "coach_digests"("organisation_id", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "coach_digests_organisation_id_period_start_key" ON "coach_digests"("organisation_id", "period_start");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_organisation_id_created_at_idx" ON "notifications"("user_id", "organisation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "calls_assignment_id_idx" ON "calls"("assignment_id");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "practice_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_assignments" ADD CONSTRAINT "practice_assignments_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_assignments" ADD CONSTRAINT "practice_assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_assignments" ADD CONSTRAINT "practice_assignments_practice_agent_id_fkey" FOREIGN KEY ("practice_agent_id") REFERENCES "practice_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "practice_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_targets" ADD CONSTRAINT "assignment_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_comments" ADD CONSTRAINT "call_comments_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_comments" ADD CONSTRAINT "call_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_comments" ADD CONSTRAINT "call_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "call_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_digests" ADD CONSTRAINT "coach_digests_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN "coach_access_acknowledged_at" TIMESTAMP(3);

-- Data step: the coaching permissions are on in the ADMIN preset (§10.1a); existing organisations get them too.
UPDATE "role_permissions"
SET "permissions" = ARRAY(SELECT DISTINCT unnest("permissions" || ARRAY['coaching.view', 'coaching.manage', 'coaching.export', 'calls.view_all', 'members.view']))
WHERE "role" = 'ADMIN';
