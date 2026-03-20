-- DropIndex
DROP INDEX "emotions_label_key";

-- DropIndex
DROP INDEX "projects_name_key";

-- DropIndex
DROP INDEX "tags_name_key";

-- DropIndex
DROP INDEX "triggers_label_key";

-- AlterTable
ALTER TABLE "emotions" ALTER COLUMN "ownerId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'primary',
ALTER COLUMN "ownerId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "ownerId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "triggers" ALTER COLUMN "ownerId" DROP DEFAULT;
