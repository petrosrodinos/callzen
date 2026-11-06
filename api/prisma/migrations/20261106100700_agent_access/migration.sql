-- CreateEnum
CREATE TYPE "AgentVisibility" AS ENUM ('ORGANISATION', 'SELECTED');

-- AlterTable
ALTER TABLE "assistant_agents" ADD COLUMN     "visibility" "AgentVisibility" NOT NULL DEFAULT 'ORGANISATION';

-- AlterTable
ALTER TABLE "practice_agents" ADD COLUMN     "visibility" "AgentVisibility" NOT NULL DEFAULT 'ORGANISATION';

-- CreateTable
CREATE TABLE "assistant_agent_access" (
    "id" TEXT NOT NULL,
    "assistant_agent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_agent_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_agent_access" (
    "id" TEXT NOT NULL,
    "practice_agent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_agent_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_agent_access_user_id_idx" ON "assistant_agent_access"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_agent_access_assistant_agent_id_user_id_key" ON "assistant_agent_access"("assistant_agent_id", "user_id");

-- CreateIndex
CREATE INDEX "practice_agent_access_user_id_idx" ON "practice_agent_access"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_agent_access_practice_agent_id_user_id_key" ON "practice_agent_access"("practice_agent_id", "user_id");

-- AddForeignKey
ALTER TABLE "assistant_agent_access" ADD CONSTRAINT "assistant_agent_access_assistant_agent_id_fkey" FOREIGN KEY ("assistant_agent_id") REFERENCES "assistant_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_agent_access" ADD CONSTRAINT "assistant_agent_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agent_access" ADD CONSTRAINT "practice_agent_access_practice_agent_id_fkey" FOREIGN KEY ("practice_agent_id") REFERENCES "practice_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_agent_access" ADD CONSTRAINT "practice_agent_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data step: "prospects.manage" now means "your own prospects". Existing admins keep the ability to manage
-- everyone's prospects through the new "prospects.manage_all" permission.
UPDATE "role_permissions"
SET "permissions" = array_append("permissions", 'prospects.manage_all')
WHERE "role" = 'ADMIN' AND NOT ('prospects.manage_all' = ANY("permissions"));
