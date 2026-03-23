import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_EMOTIONS, DEFAULT_TRIGGERS } from "@diary/shared";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const UNASSIGNED = "UNASSIGNED";

async function main() {
  const emotionsData = DEFAULT_EMOTIONS.map((e) => ({
    id: `${UNASSIGNED}_${e.idSuffix}`,
    ownerId: UNASSIGNED,
    label: e.label,
    type: e.type,
  }));

  const triggersData = DEFAULT_TRIGGERS.map((t) => ({
    id: `${UNASSIGNED}_${t.idSuffix}`,
    ownerId: UNASSIGNED,
    label: t.label,
    type: t.type,
  }));

  const emotionsResult = await prisma.emotion.createMany({
    data: emotionsData,
    skipDuplicates: true,
  });

  const triggersResult = await prisma.trigger.createMany({
    data: triggersData,
    skipDuplicates: true,
  });

  console.log(
    `Seeded ${emotionsResult.count} emotions, ${triggersResult.count} triggers (ownerId=${UNASSIGNED}). Run pnpm db:assign-owner <userId> to claim them.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
