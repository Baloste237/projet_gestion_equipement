-- Colonnes ajoutées précédemment via `prisma db push` (idempotent)
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "expectedReturnDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "handoverCondition" TEXT DEFAULT 'GOOD';

-- CreateEnum
CREATE TYPE "AssigneeType" AS ENUM ('USER', 'DEPARTMENT', 'POSITION');

-- Affectation polymorphique : userId -> (assigneeType, assigneeId), en conservant les données existantes
ALTER TABLE "Assignment" ADD COLUMN "assigneeType" "AssigneeType",
ADD COLUMN "assigneeId" TEXT;

UPDATE "Assignment" SET "assigneeType" = 'USER', "assigneeId" = "userId";

ALTER TABLE "Assignment" ALTER COLUMN "assigneeType" SET NOT NULL,
ALTER COLUMN "assigneeId" SET NOT NULL,
DROP COLUMN "userId";

-- CreateIndex
CREATE INDEX "Assignment_assigneeType_assigneeId_idx" ON "Assignment"("assigneeType", "assigneeId");
