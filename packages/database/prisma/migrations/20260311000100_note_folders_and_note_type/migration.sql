-- Rename entry type from short_note to note (preserves existing rows)
ALTER TYPE "EntryType" RENAME VALUE 'short_note' TO 'note';

-- Add note folders hierarchy
CREATE TABLE "note_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "note_folders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "note_folders_path_key" ON "note_folders"("path");
CREATE INDEX "note_folders_parentId_idx" ON "note_folders"("parentId");

ALTER TABLE "note_folders"
ADD CONSTRAINT "note_folders_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "note_folders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Link notes to optional folder
ALTER TABLE "entries" ADD COLUMN "noteFolderId" TEXT;
CREATE INDEX "entries_noteFolderId_idx" ON "entries"("noteFolderId");

ALTER TABLE "entries"
ADD CONSTRAINT "entries_noteFolderId_fkey"
FOREIGN KEY ("noteFolderId") REFERENCES "note_folders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
