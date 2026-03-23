import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { type APIRequestContext, expect, test } from "@playwright/test";
import { resetDatabase } from "../db";
import { E2E_BACKUP_DIR } from "../global-setup";
import { API_URL } from "../playwright.config";

const TODAY_DATETIME = new Date().toISOString().slice(0, 16);
const todayParts = TODAY_DATETIME.slice(0, 10).split("-");
const year = todayParts[0] ?? "";
const month = todayParts[1] ?? "";

async function waitForBackupFile(
  entryId: string,
  type: string,
  localDateTime: string,
  timeoutMs = 30_000,
): Promise<string | null> {
  const dir = join(E2E_BACKUP_DIR, year, month);
  const safeDateTime = localDateTime.replace(":", "-");
  const expected = `${safeDateTime}_${type}_${entryId}.md`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (existsSync(join(dir, expected))) {
      return join(dir, expected);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function ensureBackupPipelineReady(request: APIRequestContext): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: `Warmup ${Date.now()}`,
        wordCount: 2,
        localDateTime: TODAY_DATETIME,
      },
    });

    if (res.status() !== 201) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const entry = await res.json();
    const filePath = await waitForBackupFile(entry.id, "note", entry.localDateTime, 10_000);
    if (filePath) return;
  }

  throw new Error("Backup pipeline was not ready in time");
}

test.describe("Markdown Backup", () => {
  test.beforeEach(async ({ request }) => {
    await resetDatabase();
    await ensureBackupPipelineReady(request);
    await resetDatabase();
  });

  test("creates a .md backup file when a note is saved", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Backup Test Note",
        contentJson: { blocks: [] },
        plainText: "This should appear in the backup file.",
        wordCount: 7,
        localDateTime: TODAY_DATETIME,
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    const filePath = await waitForBackupFile(entry.id, "note", entry.localDateTime);
    expect(filePath).not.toBeNull();

    const content = readFileSync(filePath as string, "utf-8");

    expect(content).toContain(`id: ${entry.id}`);
    expect(content).toContain("type: note");
    expect(content).toContain(entry.localDateTime);
    expect(content).toContain("title: Backup Test Note");
    expect(content).toContain("# Backup Test Note");
    expect(content).toContain("This should appear in the backup file.");
  });

  test("creates a .md backup file when a check-in is saved", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 8,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Finish work", "", ""],
        dailyAffirmation: "I am focused",
        localDateTime: TODAY_DATETIME,
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    const filePath = await waitForBackupFile(entry.id, "checkin", entry.localDateTime, 30_000);
    expect(filePath).not.toBeNull();

    const content = readFileSync(filePath as string, "utf-8");

    expect(content).toContain(`id: ${entry.id}`);
    expect(content).toContain("type: checkin");
    expect(content).toContain("check_in_type: morning");
    expect(content).toContain("mood: 8");
    expect(content).toContain("- happy");
    expect(content).toContain("- exercise");
    expect(content).toContain("# Morning Check-in");
    expect(content).toContain("## Mood");
    expect(content).toContain("8/10");
    expect(content).toContain("## Daily Affirmation");
    expect(content).toContain("I am focused");
  });

  test("overwrites the backup file when an entry is updated", async ({ request }) => {
    const create = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 5,
        emotions: ["calm"],
        triggers: ["routine"],
        whatImGratefulFor: ["Coffee", "", ""],
        whatWouldMakeDayGreat: ["Good meeting", "", ""],
        dailyAffirmation: "First version",
        localDateTime: TODAY_DATETIME,
      },
    });
    const entry = await create.json();

    await waitForBackupFile(entry.id, "checkin", entry.localDateTime);

    const update = await request.patch(`${API_URL}/entries/${entry.id}`, {
      data: { checkInType: "morning", dailyAffirmation: "Updated version", mood: 9 },
    });
    expect(update.status()).toBe(200);

    // Poll until the file reflects the updated content
    const safeDateTime = entry.localDateTime.replace(":", "-");
    const deadline = Date.now() + 10_000;
    let content = "";
    while (Date.now() < deadline) {
      const filePath = join(E2E_BACKUP_DIR, year, month, `${safeDateTime}_checkin_${entry.id}.md`);
      if (existsSync(filePath)) {
        content = readFileSync(filePath, "utf-8");
        if (content.includes("Updated version")) break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    expect(content).toContain("Updated version");
    expect(content).toContain("mood: 9");
  });

  test("moves backup to _deleted/ when entry is deleted", async ({ request }) => {
    const create = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "To be deleted.",
        wordCount: 3,
        localDateTime: TODAY_DATETIME,
      },
    });
    const entry = await create.json();

    // Wait for initial backup
    const filePath = await waitForBackupFile(entry.id, "note", entry.localDateTime, 30_000);
    expect(filePath).not.toBeNull();

    // Delete the entry
    const del = await request.delete(`${API_URL}/entries/${entry.id}`);
    expect(del.status()).toBe(204);

    // Wait for file to move to _deleted/
    const safeDateTime = entry.localDateTime.replace(":", "-");
    const deletedPath = join(E2E_BACKUP_DIR, "_deleted", `${safeDateTime}_note_${entry.id}.md`);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (existsSync(deletedPath)) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    expect(existsSync(deletedPath)).toBe(true);
    // Original location should no longer exist
    expect(existsSync(filePath as string)).toBe(false);
  });

  test("backup dir is organised by year/month", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "Directory structure test.",
        wordCount: 3,
        localDateTime: TODAY_DATETIME,
      },
    });
    const entry = await res.json();

    const filePath = await waitForBackupFile(entry.id, "note", entry.localDateTime, 30_000);
    expect(filePath).not.toBeNull();

    const dir = join(E2E_BACKUP_DIR, year, month);
    expect(existsSync(dir)).toBe(true);

    const files = readdirSync(dir);
    expect(files.some((f) => f.includes(entry.id))).toBe(true);
  });
});
