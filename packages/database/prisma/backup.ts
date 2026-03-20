import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Entry } from "@prisma/client";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const backupDir = resolve(process.env.BACKUP_DIR ?? resolve(__dirname, "../../../diary-backups"));

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const entries = await prisma.entry.findMany({ orderBy: { localDateTime: "asc" } });
  console.log(`Found ${entries.length} entries to back up…`);

  let count = 0;
  for (const entry of entries) {
    const markdown = entry.type === "checkin" ? renderCheckin(entry) : renderNote(entry);
    await writeEntryFile(entry.localDateTime, entry.type, entry.id, markdown);
    count++;
  }

  console.log(`Done. Backed up ${count} entries to ${backupDir}`);
}

async function writeEntryFile(localDateTime: string, type: string, id: string, content: string) {
  const datePart = localDateTime.slice(0, 10);
  const [year, month] = datePart.split("-");
  const dir = join(backupDir, year, month);
  await mkdir(dir, { recursive: true });
  const safeDateTime = localDateTime.replace(":", "-");
  const filename = `${safeDateTime}_${type}_${id}.md`;
  await writeFile(join(dir, filename), content, "utf-8");
}

function renderNote(entry: Entry): string {
  const title = entry.title ?? "Untitled";
  const plainText = entry.plainText ?? "";
  const frontmatter = buildFrontmatter({
    id: entry.id,
    type: "note",
    date: entry.localDateTime,
    title,
    folder_id: entry.noteFolderId,
    word_count: entry.wordCount,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  });
  return `${frontmatter}\n# ${title}\n\n${plainText}\n`;
}

function renderCheckin(entry: Entry): string {
  const typeLabel = entry.checkInType === "morning" ? "Morning" : "Evening";
  const title = `${typeLabel} Check-in — ${entry.localDateTime.replace("T", " ")}`;

  const frontmatter = buildFrontmatter({
    id: entry.id,
    type: "checkin",
    check_in_type: entry.checkInType,
    date: entry.localDateTime,
    mood: entry.mood,
    emotions: entry.emotions.length > 0 ? entry.emotions : undefined,
    triggers: entry.triggers.length > 0 ? entry.triggers : undefined,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  });

  const sections: string[] = [`${frontmatter}\n# ${title}\n`];

  if (entry.mood !== null) {
    sections.push(`## Mood\n${entry.mood}/10`);
  }
  if (entry.emotions.length > 0) {
    sections.push(`## Emotions\n${entry.emotions.map((e) => `- ${e}`).join("\n")}`);
  }
  if (entry.triggers.length > 0) {
    sections.push(`## Triggers\n${entry.triggers.map((t) => `- ${t}`).join("\n")}`);
  }
  if (entry.whatImGratefulFor.length > 0) {
    sections.push(`## What I'm Grateful For\n${entry.whatImGratefulFor.map((v) => `- ${v}`).join("\n")}`);
  }
  if (entry.whatWouldMakeDayGreat.length > 0) {
    sections.push(`## What Would Make Today Great\n${entry.whatWouldMakeDayGreat.map((v) => `- ${v}`).join("\n")}`);
  }
  if (entry.dailyAffirmation) {
    sections.push(`## Daily Affirmation\n${entry.dailyAffirmation}`);
  }
  if (entry.highlightsOfTheDay.length > 0) {
    sections.push(`## Highlights of the Day\n${entry.highlightsOfTheDay.map((v) => `- ${v}`).join("\n")}`);
  }
  if (entry.whatDidILearnToday) {
    sections.push(`## What Did I Learn Today\n${entry.whatDidILearnToday}`);
  }

  return sections.join("\n\n") + "\n";
}

// ─── Minimal YAML frontmatter builder ─────────────────────────────────────────

type YamlValue = string | number | null | undefined | string[];

function buildFrontmatter(fields: Record<string, YamlValue>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${yamlString(item)}`);
      }
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${yamlString(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}

function yamlString(value: string): string {
  if (/[:#\[\]{}&*!|>'"%@`]/.test(value) || value.startsWith(" ") || value.endsWith(" ")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
