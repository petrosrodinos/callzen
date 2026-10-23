/*
  Warnings:

  - Added the required column `organisation_id` to the `assistant_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `calls` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `practice_agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisation_id` to the `usage_events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "assistant_agents" DROP CONSTRAINT "assistant_agents_user_id_fkey";

-- DropForeignKey
ALTER TABLE "practice_agents" DROP CONSTRAINT "practice_agents_user_id_fkey";

-- AlterTable
ALTER TABLE "assistant_agents" ADD COLUMN     "organisation_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "organisation_id" TEXT;

-- AlterTable
ALTER TABLE "practice_agents" ADD COLUMN     "organisation_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "usage_events" ADD COLUMN     "organisation_id" TEXT;

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "permissions" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "send_count" INTEGER NOT NULL DEFAULT 1,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_id" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_organisation_id_user_id_key" ON "memberships"("organisation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_organisation_id_role_key" ON "role_permissions"("organisation_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organisation_id_status_idx" ON "invitations"("organisation_id", "status");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- CreateIndex
CREATE INDEX "assistant_agents_organisation_id_idx" ON "assistant_agents"("organisation_id");

-- CreateIndex
CREATE INDEX "calls_organisation_id_started_at_idx" ON "calls"("organisation_id", "started_at");

-- CreateIndex
CREATE INDEX "practice_agents_organisation_id_idx" ON "practice_agents"("organisation_id");

-- CreateIndex
CREATE INDEX "usage_events_organisation_id_created_at_idx" ON "usage_events"("organisation_id", "created_at");

-- AddForeignKey
ALTER TABLE "assistant_agents" ADD CONSTRAINT "assistant_agents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_agents" ADD CONSTRAINT "assistant_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agents" ADD CONSTRAINT "practice_agents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agents" ADD CONSTRAINT "practice_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing user becomes the owner of a personal organisation that owns their data.
CREATE TEMP TABLE _user_org AS
SELECT "id" AS user_id,
       gen_random_uuid()::text AS org_id,
       COALESCE(NULLIF(TRIM("full_name"), ''), split_part("email", '@', 1)) || '''s workspace' AS org_name
FROM "users";

INSERT INTO "organisations" ("id", "name", "created_at", "updated_at")
SELECT org_id, org_name, NOW(), NOW() FROM _user_org;

INSERT INTO "memberships" ("id", "organisation_id", "user_id", "role", "created_at", "updated_at")
SELECT gen_random_uuid()::text, org_id, user_id, 'OWNER', NOW(), NOW() FROM _user_org;

UPDATE "assistant_agents" t SET "organisation_id" = m.org_id FROM _user_org m WHERE t."user_id" = m.user_id;
UPDATE "practice_agents" t SET "organisation_id" = m.org_id FROM _user_org m WHERE t."user_id" = m.user_id;
UPDATE "calls" t SET "organisation_id" = m.org_id FROM _user_org m WHERE t."user_id" = m.user_id;
UPDATE "usage_events" t SET "organisation_id" = m.org_id FROM _user_org m WHERE t."user_id" = m.user_id;

ALTER TABLE "assistant_agents" ALTER COLUMN "organisation_id" SET NOT NULL;
ALTER TABLE "practice_agents" ALTER COLUMN "organisation_id" SET NOT NULL;
ALTER TABLE "calls" ALTER COLUMN "organisation_id" SET NOT NULL;
ALTER TABLE "usage_events" ALTER COLUMN "organisation_id" SET NOT NULL;
