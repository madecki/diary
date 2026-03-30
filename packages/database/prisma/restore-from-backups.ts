import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { type CheckInType, type Prisma, PrismaClient } from "@prisma/client";
import { config } from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const backupDir = resolve(process.env.BACKUP_DIR ?? resolve(__dirname, "../../../diary-backups"));
const includeDeleted = process.env.RESTORE_INCLUDE_DELETED === "true";

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const files = await collectMarkdownFiles(backupDir);
  const selected = includeDeleted
    ? files
    : files.filter((f) => !f.includes(`${join("", "_deleted")}`));

  let restored = 0;
  let skipped = 0;

  for (const file of selected) {
    const raw = await readFile(file, "utf-8");
    const parsed = parseBackupFile(raw);
    if (!parsed) {
      skipped++;
      continue;
    }

    const typeRaw = String(parsed.frontmatter["type"] ?? "");
    if (typeRaw !== "checkin") {
      skipped++;
      continue;
    }

    const id = String(parsed.frontmatter["id"] ?? "").trim();
    if (!id) {
      skipped++;
      continue;
    }

    const dateRaw = String(parsed.frontmatter["date"] ?? "").trim();
    if (!dateRaw) {
      skipped++;
      continue;
    }
    const localDateTime = dateRaw.includes("T") ? dateRaw : `${dateRaw}T00:00`;

    const createdAt = toDate(String(parsed.frontmatter["created_at"] ?? ""));
    const updatedAt = toDate(String(parsed.frontmatter["updated_at"] ?? ""));

    const checkInTypeRaw = toStringOrNull(parsed.frontmatter["check_in_type"]);
    const checkInType: CheckInType | null =
      checkInTypeRaw === "morning" || checkInTypeRaw === "evening" || checkInTypeRaw === "basic"
        ? checkInTypeRaw
        : null;

    const baseData: Prisma.EntryUncheckedCreateInput = {
      id,
      type: "checkin",
      localDateTime,
      createdAt: createdAt ?? new Date(),
      updatedAt: updatedAt ?? new Date(),
      contentJson: null,
      plainText: null,
      wordCount: null,
      mood: toIntOrNull(parsed.frontmatter["mood"]),
      emotions: toStringArray(parsed.frontmatter["emotions"]),
      triggers: toStringArray(parsed.frontmatter["triggers"]),
      checkInType,
      whatImGratefulFor: extractListSection(parsed.body, "What I'm Grateful For"),
      whatWouldMakeDayGreat: extractListSection(parsed.body, "What Would Make Today Great"),
      dailyAffirmation: extractTextSection(parsed.body, "Daily Affirmation"),
      highlightsOfTheDay: extractListSection(parsed.body, "Highlights of the Day"),
      whatDidILearnToday: extractTextSection(parsed.body, "What Did I Learn Today"),
    };

    const noteSection = extractMultilineSection(parsed.body, "Note");
    if (noteSection) {
      baseData.plainText = noteSection;
      baseData.wordCount = countWords(noteSection);
      baseData.contentJson = {
        blocks: noteSection
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => ({
            type: "paragraph",
            content: [{ type: "text", text: line }],
          })),
      } as Prisma.InputJsonValue;
    }

    await prisma.entry.upsert({
      where: { id },
      create: baseData,
      update: baseData,
    });
    restored++;
  }

  console.log(
    `Restore finished. Restored ${restored} entries, skipped ${skipped}. Source: ${relative(process.cwd(), backupDir)}`,
  );
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdownFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function parseBackupFile(
  content: string,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const lines = content.split("\n");
  if (lines[0] !== "---") return null;
  const endIdx = lines.indexOf("---", 1);
  if (endIdx < 0) return null;

  const frontmatter: Record<string, unknown> = {};
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i] ?? "";
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (value.length === 0) {
      const arr: string[] = [];
      let j = i + 1;
      while (j < endIdx) {
        const arrLine = lines[j] ?? "";
        if (!arrLine.startsWith("  - ")) break;
        arr.push(unquote(arrLine.slice(4).trim()));
        j++;
      }
      frontmatter[key] = arr;
      i = j - 1;
      continue;
    }
    frontmatter[key] = unquote(value);
  }

  return {
    frontmatter,
    body: lines
      .slice(endIdx + 1)
      .join("\n")
      .trim(),
  };
}

function extractListSection(body: string, heading: string): string[] {
  const lines = body.split("\n");
  const idx = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (idx < 0) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) out.push(line.slice(2).trim());
  }
  return out;
}

function extractTextSection(body: string, heading: string): string | null {
  const lines = body.split("\n");
  const idx = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (idx < 0) return null;
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) break;
    if (line.trim().length === 0) continue;
    out.push(line);
  }
  return out.length > 0 ? out.join("\n").trim() : null;
}

function extractMultilineSection(body: string, heading: string): string | null {
  const lines = body.split("\n");
  const idx = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (idx < 0) return null;
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("## ")) break;
    out.push(line);
  }
  const text = out.join("\n").trim();
  return text.length > 0 ? text : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v)) : [];
}

function toIntOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return value;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
