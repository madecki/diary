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

const emotions = [
  { id: "emo_diff_01", label: "sad", type: "difficult" as const },
  { id: "emo_diff_02", label: "anxious", type: "difficult" as const },
  { id: "emo_diff_03", label: "angry", type: "difficult" as const },
  { id: "emo_diff_04", label: "frustrated", type: "difficult" as const },
  { id: "emo_neut_01", label: "calm", type: "neutral" as const },
  { id: "emo_neut_02", label: "bored", type: "neutral" as const },
  { id: "emo_neut_03", label: "tired", type: "neutral" as const },
  { id: "emo_neut_04", label: "confused", type: "neutral" as const },
  { id: "emo_plea_01", label: "happy", type: "pleasant" as const },
  { id: "emo_plea_02", label: "grateful", type: "pleasant" as const },
  { id: "emo_plea_03", label: "excited", type: "pleasant" as const },
  { id: "emo_plea_04", label: "hopeful", type: "pleasant" as const },
];

const triggers = [
  { id: "tri_diff_01", label: "work stress", type: "difficult" as const },
  { id: "tri_diff_02", label: "conflict", type: "difficult" as const },
  { id: "tri_diff_03", label: "lack of sleep", type: "difficult" as const },
  { id: "tri_diff_04", label: "health issues", type: "difficult" as const },
  { id: "tri_neut_01", label: "weather", type: "neutral" as const },
  { id: "tri_neut_02", label: "routine", type: "neutral" as const },
  { id: "tri_neut_03", label: "change", type: "neutral" as const },
  { id: "tri_neut_04", label: "social media", type: "neutral" as const },
  { id: "tri_plea_01", label: "exercise", type: "pleasant" as const },
  { id: "tri_plea_02", label: "nature", type: "pleasant" as const },
  { id: "tri_plea_03", label: "music", type: "pleasant" as const },
  { id: "tri_plea_04", label: "friends", type: "pleasant" as const },
];

async function main() {
  const emotionsResult = await prisma.emotion.createMany({
    data: emotions,
    skipDuplicates: true,
  });

  const triggersResult = await prisma.trigger.createMany({
    data: triggers,
    skipDuplicates: true,
  });

  console.log(
    `Seeded ${emotionsResult.count} emotions, ${triggersResult.count} triggers`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
