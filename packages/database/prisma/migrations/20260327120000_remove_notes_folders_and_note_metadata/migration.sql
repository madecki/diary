-- Remove standalone notes, note folders, and per-entry tag/project links (Notepad owns those concerns).

DELETE FROM "outbox_events"
WHERE "aggregateId" IN (SELECT "id" FROM "entries" WHERE "type" = 'note');

DELETE FROM "entries" WHERE "type" = 'note';

DROP TABLE IF EXISTS "entry_tags";

ALTER TABLE "entries" DROP CONSTRAINT IF EXISTS "entries_noteFolderId_fkey";

DROP INDEX IF EXISTS "entries_noteFolderId_idx";

ALTER TABLE "entries" DROP COLUMN IF EXISTS "noteFolderId";

DROP INDEX IF EXISTS "entries_projectId_idx";

ALTER TABLE "entries" DROP COLUMN IF EXISTS "projectId";

ALTER TABLE "entries" DROP COLUMN IF EXISTS "title";

DROP TABLE IF EXISTS "note_folders";

CREATE TYPE "EntryType_new" AS ENUM ('checkin');

ALTER TABLE "entries" ALTER COLUMN "type" TYPE "EntryType_new" USING ("type"::text::"EntryType_new");

DROP TYPE "EntryType";

ALTER TYPE "EntryType_new" RENAME TO "EntryType";
