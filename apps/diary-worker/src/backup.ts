import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DiaryEventPayload } from "@diary/shared";
import { config } from "./config.js";

/**
 * Writes Markdown backup files for diary entries.
 * Called directly from OutboxPublisher after each successful NATS publish,
 * so backup is always in sync with the event stream.
 */
export class MarkdownBackup {
  async handleEvent(payload: DiaryEventPayload): Promise<void> {
    const id = payload.aggregate.id;
    const type = payload.aggregate.type;
    const localDate = payload.data.derived.localDate;

    try {
      if (payload.eventName === "diary.entry.deleted") {
        await this.moveToDeleted(localDate, type, id);
        console.log(`[MarkdownBackup] Moved deleted entry ${id} to _deleted/`);
        return;
      }

      const markdown =
        type === "checkin"
          ? renderCheckin(payload.data.entrySnapshot, payload.data.derived)
          : renderShortNote(payload.data.entrySnapshot);

      await this.writeFile(localDate, type, id, markdown);
      console.log(`[MarkdownBackup] Backed up ${payload.eventName} ${id}`);
    } catch (err) {
      console.error(`[MarkdownBackup] Failed to back up ${id}:`, err);
    }
  }

  private async writeFile(
    localDate: string,
    type: string,
    id: string,
    content: string,
  ): Promise<void> {
    const parts = localDate.split("-");
    const dir = join(config.backupDir, parts[0] ?? "", parts[1] ?? "");
    await mkdir(dir, { recursive: true });
    const filename = `${localDate}_${type}_${id}.md`;
    await writeFile(join(dir, filename), content, "utf-8");
  }

  private async moveToDeleted(localDate: string, type: string, id: string): Promise<void> {
    const parts = localDate.split("-");
    const srcDir = join(config.backupDir, parts[0] ?? "", parts[1] ?? "");
    const destDir = join(config.backupDir, "_deleted");
    await mkdir(destDir, { recursive: true });
    const filename = `${localDate}_${type}_${id}.md`;
    try {
      await rename(join(srcDir, filename), join(destDir, filename));
    } catch {
      // File may not exist if backup was never written for this entry
    }
  }
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function renderShortNote(snapshot: Record<string, unknown>): string {
  const title = (snapshot.title as string | null) ?? "Untitled";
  const plainText = (snapshot.plainText as string | null) ?? "";
  const wordCount = snapshot.wordCount as number | null;
  const createdAt = snapshot.createdAt as string;
  const updatedAt = snapshot.updatedAt as string;
  const localDate = snapshot.localDate as string;
  const id = snapshot.id as string;

  const frontmatter = buildFrontmatter({
    id,
    type: "short_note",
    date: localDate,
    title,
    word_count: wordCount,
    created_at: createdAt,
    updated_at: updatedAt,
  });

  return `${frontmatter}\n# ${title}\n\n${plainText}\n`;
}

function renderCheckin(
  snapshot: Record<string, unknown>,
  derived: DiaryEventPayload["data"]["derived"],
): string {
  const id = snapshot.id as string;
  const localDate = derived.localDate;
  const checkInType = derived.checkInType;
  const mood = derived.mood;
  const emotions = derived.emotions ?? [];
  const triggers = derived.triggers ?? [];
  const whatImGratefulFor = derived.whatImGratefulFor ?? [];
  const whatWouldMakeDayGreat = derived.whatWouldMakeDayGreat ?? [];
  const dailyAffirmation = derived.dailyAffirmation;
  const highlightsOfTheDay = derived.highlightsOfTheDay ?? [];
  const whatDidILearnToday = derived.whatDidILearnToday;
  const createdAt = snapshot.createdAt as string;
  const updatedAt = snapshot.updatedAt as string;

  const typeLabel = checkInType === "morning" ? "Morning" : "Evening";
  const title = `${typeLabel} Check-in — ${localDate}`;

  const frontmatter = buildFrontmatter({
    id,
    type: "checkin",
    check_in_type: checkInType,
    date: localDate,
    mood,
    emotions: emotions.length > 0 ? emotions : undefined,
    triggers: triggers.length > 0 ? triggers : undefined,
    created_at: createdAt,
    updated_at: updatedAt,
  });

  const sections: string[] = [`${frontmatter}\n# ${title}\n`];

  if (mood !== null) {
    sections.push(`## Mood\n${mood}/10`);
  }
  if (emotions.length > 0) {
    sections.push(`## Emotions\n${emotions.map((e) => `- ${e}`).join("\n")}`);
  }
  if (triggers.length > 0) {
    sections.push(`## Triggers\n${triggers.map((t) => `- ${t}`).join("\n")}`);
  }
  if (whatImGratefulFor.length > 0) {
    sections.push(
      `## What I'm Grateful For\n${whatImGratefulFor.map((v) => `- ${v}`).join("\n")}`,
    );
  }
  if (whatWouldMakeDayGreat.length > 0) {
    sections.push(
      `## What Would Make Today Great\n${whatWouldMakeDayGreat.map((v) => `- ${v}`).join("\n")}`,
    );
  }
  if (dailyAffirmation) {
    sections.push(`## Daily Affirmation\n${dailyAffirmation}`);
  }
  if (highlightsOfTheDay.length > 0) {
    sections.push(
      `## Highlights of the Day\n${highlightsOfTheDay.map((v) => `- ${v}`).join("\n")}`,
    );
  }
  if (whatDidILearnToday) {
    sections.push(`## What Did I Learn Today\n${whatDidILearnToday}`);
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
