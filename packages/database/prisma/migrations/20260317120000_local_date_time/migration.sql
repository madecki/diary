-- Rename localDate to localDateTime (store date + time, e.g. YYYY-MM-DDTHH:mm)
ALTER TABLE "entries" RENAME COLUMN "localDate" TO "localDateTime";

DROP INDEX IF EXISTS "entries_localDate_idx";
CREATE INDEX "entries_localDateTime_idx" ON "entries"("localDateTime");
