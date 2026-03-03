-- Blow up all existing entry data (incompatible with new model)
TRUNCATE TABLE "entries" CASCADE;
TRUNCATE TABLE "outbox_events" CASCADE;

-- Drop old columns from entries
ALTER TABLE "entries" DROP COLUMN "mood";
ALTER TABLE "entries" DROP COLUMN "emotions";
ALTER TABLE "entries" DROP COLUMN "triggers";
ALTER TABLE "entries" DROP COLUMN "timeOfDay";

-- Make contentJson, plainText, wordCount nullable (used by short_notes only)
ALTER TABLE "entries" ALTER COLUMN "contentJson" DROP NOT NULL;
ALTER TABLE "entries" ALTER COLUMN "plainText" DROP NOT NULL;
ALTER TABLE "entries" ALTER COLUMN "wordCount" DROP NOT NULL;

-- Create new CheckInType enum
CREATE TYPE "CheckInType" AS ENUM ('morning', 'evening');

-- Add new check-in specific columns
ALTER TABLE "entries" ADD COLUMN "checkInType" "CheckInType";
ALTER TABLE "entries" ADD COLUMN "whatImGratefulFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entries" ADD COLUMN "whatWouldMakeDayGreat" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entries" ADD COLUMN "dailyAffirmation" TEXT;
ALTER TABLE "entries" ADD COLUMN "highlightsOfTheDay" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entries" ADD COLUMN "whatDidILearnToday" TEXT;

-- Drop old TimeOfDay enum (no longer needed)
DROP TYPE "TimeOfDay";
