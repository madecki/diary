-- Add ownerId to settings tables using 'UNASSIGNED' as a sentinel for pre-auth rows.
-- Run `pnpm db:assign-owner <userId>` after registering your account to claim these rows.

-- Emotions
ALTER TABLE "emotions" DROP CONSTRAINT IF EXISTS "emotions_label_key";
ALTER TABLE "emotions" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'UNASSIGNED';
CREATE UNIQUE INDEX "emotions_ownerId_label_key" ON "emotions"("ownerId", "label");
CREATE INDEX "emotions_ownerId_idx" ON "emotions"("ownerId");

-- Triggers
ALTER TABLE "triggers" DROP CONSTRAINT IF EXISTS "triggers_label_key";
ALTER TABLE "triggers" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'UNASSIGNED';
CREATE UNIQUE INDEX "triggers_ownerId_label_key" ON "triggers"("ownerId", "label");
CREATE INDEX "triggers_ownerId_idx" ON "triggers"("ownerId");

-- Projects
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_name_key";
ALTER TABLE "projects" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'UNASSIGNED';
CREATE UNIQUE INDEX "projects_ownerId_name_key" ON "projects"("ownerId", "name");
CREATE INDEX "projects_ownerId_idx" ON "projects"("ownerId");

-- Tags
ALTER TABLE "tags" DROP CONSTRAINT IF EXISTS "tags_name_key";
ALTER TABLE "tags" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT 'UNASSIGNED';
CREATE UNIQUE INDEX "tags_ownerId_name_key" ON "tags"("ownerId", "name");
CREATE INDEX "tags_ownerId_idx" ON "tags"("ownerId");
