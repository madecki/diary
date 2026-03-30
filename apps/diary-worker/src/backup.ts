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
    const localDateTime = payload.data.derived.localDateTime;

    if (type !== "checkin") {
      return;
    }

    try {
      if (payload.eventName === "diary.entry.deleted") {
        await this.moveToDeleted(localDateTime, type, id);
        console.log(`[MarkdownBackup] Moved deleted entry ${id} to _deleted/`);
        return;
      }

      const markdown = renderCheckin(payload.data.entrySnapshot, payload.data.derived);
      await this.writeFile(localDateTime, type, id, markdown);
      console.log(`[MarkdownBackup] Backed up ${payload.eventName} ${id}`);
    } catch (err) {
      console.error(`[MarkdownBackup] Failed to back up ${id}:`, err);
    }
  }

  private async writeFile(
    localDateTime: string,
    type: string,
    id: string,
    content: string,
  ): Promise<void> {
    const datePart = localDateTime.slice(0, 10);
    const [year, month] = datePart.split("-");
    const dir = join(config.backupDir, year ?? "", month ?? "");
    await mkdir(dir, { recursive: true });
    const safeDateTime = localDateTime.replace(":", "-");
    const filename = `${safeDateTime}_${type}_${id}.md`;
    await writeFile(join(dir, filename), content, "utf-8");
  }

  private async moveToDeleted(localDateTime: string, type: string, id: string): Promise<void> {
    const datePart = localDateTime.slice(0, 10);
    const [year, month] = datePart.split("-");
    const srcDir = join(config.backupDir, year ?? "", month ?? "");
    const destDir = join(config.backupDir, "_deleted");
    await mkdir(destDir, { recursive: true });
    const safeDateTime = localDateTime.replace(":", "-");
    const filename = `${safeDateTime}_${type}_${id}.md`;
    try {
      await rename(join(srcDir, filename), join(destDir, filename));
    } catch {
      // File may not exist if backup was never written for this entry
    }
  }
}

function renderCheckin(
  snapshot: Record<string, unknown>,
  derived: DiaryEventPayload["data"]["derived"],
): string {
  const id = snapshot.id as string;
  const localDateTime = derived.localDateTime;
  const checkInType = derived.checkInType;
  const mood = derived.mood;
  const emotions = derived.emotions ?? [];
  const triggers = derived.triggers ?? [];
  const whatImGratefulFor = derived.whatImGratefulFor ?? [];
  const whatWouldMakeDayGreat = derived.whatWouldMakeDayGreat ?? [];
  const dailyAffirmation = derived.dailyAffirmation;
  const highlightsOfTheDay = derived.highlightsOfTheDay ?? [];
  const whatDidILearnToday = derived.whatDidILearnToday;
  const checkInNotePlainText = derived.checkInNotePlainText;
  const createdAt = snapshot.createdAt as string;
  const updatedAt = snapshot.updatedAt as string;

  const typeLabel =
    checkInType === "morning" ? "Morning" : checkInType === "evening" ? "Evening" : "Basic";
  const title = `${typeLabel} Check-in — ${localDateTime.replace("T", " ")}`;

  const frontmatter = buildFrontmatter({
    id,
    type: "checkin",
    check_in_type: checkInType,
    date: localDateTime,
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
    sections.push(`## What I'm Grateful For\n${whatImGratefulFor.map((v) => `- ${v}`).join("\n")}`);
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
  if (checkInNotePlainText?.trim()) {
    sections.push(`## Note\n\n${checkInNotePlainText}`);
  }

  return sections.join("\n\n") + "\n";
}

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
