-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('read', 'write', 'both');

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "ownerId" TEXT;

-- CreateTable
CREATE TABLE "access_list" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_list_entryId_idx" ON "access_list"("entryId");

-- CreateIndex
CREATE INDEX "access_list_userId_idx" ON "access_list"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "access_list_entryId_userId_key" ON "access_list"("entryId", "userId");

-- CreateIndex
CREATE INDEX "entries_ownerId_idx" ON "entries"("ownerId");

-- AddForeignKey
ALTER TABLE "access_list" ADD CONSTRAINT "access_list_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
