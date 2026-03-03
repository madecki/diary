-- Restore mood, emotions, triggers to check-ins
ALTER TABLE "entries" ADD COLUMN "mood"     INTEGER;
ALTER TABLE "entries" ADD COLUMN "emotions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entries" ADD COLUMN "triggers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
