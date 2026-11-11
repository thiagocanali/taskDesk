-- DropIndex
DROP INDEX "Task_dueAt_idx";

-- DropIndex
DROP INDEX "Task_status_priority_idx";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "ownerId" UUID;

-- CreateIndex
CREATE INDEX "Task_ownerId_status_priority_idx" ON "Task"("ownerId", "status", "priority");

-- CreateIndex
CREATE INDEX "Task_ownerId_dueAt_idx" ON "Task"("ownerId", "dueAt");

-- Prisma is the only data access boundary. Deny direct Data API access by default.
-- The trusted server database role needs BYPASSRLS; do not give that role to clients.
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
