-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('checkin', 'short_note');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('morning', 'evening');

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "title" TEXT,
    "contentJson" JSONB NOT NULL,
    "plainText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "mood" INTEGER,
    "emotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeOfDay" "TimeOfDay",
    "localDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "globalSequence" BIGSERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastPublishError" TEXT,
    "lastPublishAttemptAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("globalSequence")
);

-- CreateIndex
CREATE INDEX "entries_type_idx" ON "entries"("type");

-- CreateIndex
CREATE INDEX "entries_createdAt_idx" ON "entries"("createdAt");

-- CreateIndex
CREATE INDEX "entries_localDate_idx" ON "entries"("localDate");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "outbox_events"("eventId");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateId_aggregateVersion_idx" ON "outbox_events"("aggregateId", "aggregateVersion");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_globalSequence_idx" ON "outbox_events"("publishedAt", "globalSequence");

-- CreateIndex
CREATE INDEX "outbox_events_eventName_occurredAt_idx" ON "outbox_events"("eventName", "occurredAt");
