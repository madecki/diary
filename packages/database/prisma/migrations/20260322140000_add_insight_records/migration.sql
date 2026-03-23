-- CreateTable
CREATE TABLE "insight_records" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "content" TEXT,
    "promptHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "insight_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insight_records_ownerId_type_date_idx" ON "insight_records"("ownerId", "type", "date");

-- CreateIndex
CREATE INDEX "insight_records_status_idx" ON "insight_records"("status");

-- CreateIndex
CREATE INDEX "insight_records_jobId_idx" ON "insight_records"("jobId");

-- CreateIndex
CREATE INDEX "insight_records_ownerId_idx" ON "insight_records"("ownerId");
