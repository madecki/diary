/**
 * Ensures every existing user has the default emotions and triggers.
 * Run once after deploy: pnpm db:ensure-defaults
 *
 * - Collects distinct ownerIds from entries, emotions, triggers, projects, tags
 *   (excludes null and 'UNASSIGNED').
 * - For each user with no emotions (or no triggers), inserts the default set
 *   with deterministic ids: ${ownerId}_${idSuffix}. Safe to re-run (skipDuplicates).
 */

import { DEFAULT_EMOTIONS, DEFAULT_TRIGGERS } from "@diary/shared";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const UNASSIGNED = "UNASSIGNED";

async function distinctOwnerIds(): Promise<string[]> {
  const [e, em, tr, p, t] = await Promise.all([
    prisma.entry.findMany({ where: { ownerId: { not: null } }, select: { ownerId: true }, distinct: ["ownerId"] }),
    prisma.emotion.findMany({ where: { ownerId: { not: UNASSIGNED } }, select: { ownerId: true }, distinct: ["ownerId"] }),
    prisma.trigger.findMany({ where: { ownerId: { not: UNASSIGNED } }, select: { ownerId: true }, distinct: ["ownerId"] }),
    prisma.project.findMany({ where: { ownerId: { not: UNASSIGNED } }, select: { ownerId: true }, distinct: ["ownerId"] }),
    prisma.tag.findMany({ where: { ownerId: { not: UNASSIGNED } }, select: { ownerId: true }, distinct: ["ownerId"] }),
  ]);
  const ids = new Set<string>();
  for (const row of [...e, ...em, ...tr, ...p, ...t]) {
    const id = (row as { ownerId: string }).ownerId;
    if (id) ids.add(id);
  }
  return [...ids];
}

async function main() {
  const ownerIds = await distinctOwnerIds();
  console.log(`Found ${ownerIds.length} distinct owner(s).`);

  let emotionsInserted = 0;
  let triggersInserted = 0;

  for (const ownerId of ownerIds) {
    const [emotionCount, triggerCount] = await Promise.all([
      prisma.emotion.count({ where: { ownerId } }),
      prisma.trigger.count({ where: { ownerId } }),
    ]);

    if (emotionCount === 0) {
      const data = DEFAULT_EMOTIONS.map((e) => ({
        id: `${ownerId}_${e.idSuffix}`,
        ownerId,
        label: e.label,
        type: e.type,
      }));
      const r = await prisma.emotion.createMany({ data, skipDuplicates: true });
      emotionsInserted += r.count;
    }

    if (triggerCount === 0) {
      const data = DEFAULT_TRIGGERS.map((t) => ({
        id: `${ownerId}_${t.idSuffix}`,
        ownerId,
        label: t.label,
        type: t.type,
      }));
      const r = await prisma.trigger.createMany({ data, skipDuplicates: true });
      triggersInserted += r.count;
    }
  }

  console.log(`Done. Inserted ${emotionsInserted} emotions, ${triggersInserted} triggers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
