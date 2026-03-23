-- CreateTable: entry-tag links (tag IDs reference settings-service; no FK to tags)
CREATE TABLE "entry_tags" (
    "entryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "entry_tags_pkey" PRIMARY KEY ("entryId","tagId")
);

-- Migrate data from Prisma implicit M:M: "A" = entry id, "B" = tag id
INSERT INTO "entry_tags" ("entryId", "tagId")
SELECT "A", "B" FROM "_EntryTags";

-- CreateIndex
CREATE INDEX "entry_tags_entryId_idx" ON "entry_tags"("entryId");

-- CreateIndex
CREATE INDEX "entry_tags_tagId_idx" ON "entry_tags"("tagId");

-- AddForeignKey
ALTER TABLE "entry_tags" ADD CONSTRAINT "entry_tags_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old implicit join table
DROP TABLE "_EntryTags";

-- Drop FK from entries to projects (projectId becomes opaque string)
ALTER TABLE "entries" DROP CONSTRAINT IF EXISTS "entries_projectId_fkey";

-- Drop domain tables (now owned by settings-service)
DROP TABLE IF EXISTS "tags";
DROP TABLE IF EXISTS "projects";
