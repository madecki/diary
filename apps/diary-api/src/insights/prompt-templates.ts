import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CheckInType, Entry } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function promptsDir(): string {
  const fromEnv = process.env.DIARY_PROMPTS_DIR?.trim();
  if (fromEnv) return fromEnv;
  return join(__dirname, "../../../../prompts");
}

let dailyTemplate: string | null = null;
let weeklyTemplate: string | null = null;

function loadDailyTemplate(): string {
  if (dailyTemplate === null) {
    const path = join(promptsDir(), "daily-insight-prompt.md");
    dailyTemplate = readFileSync(path, "utf8");
  }
  return dailyTemplate;
}

function loadWeeklyTemplate(): string {
  if (weeklyTemplate === null) {
    const path = join(promptsDir(), "weekly-insight-prompt.md");
    weeklyTemplate = readFileSync(path, "utf8");
  }
  return weeklyTemplate;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatContextDate(d: Date): { weekday: string; date: string } {
  const weekday = WEEKDAYS[d.getUTCDay()] ?? "Monday";
  const date = d.toISOString().slice(0, 10);
  return { weekday, date };
}

function substituteSystemTemplate(template: string, now: Date, userContext: string): string {
  const { weekday, date } = formatContextDate(now);
  return template
    .replaceAll("{weekday}", weekday)
    .replaceAll("{date}", date)
    .replaceAll("{user_context}", userContext);
}

type CheckInPayload = {
  wellbeing: number | null;
  type: CheckInType;
  intentions: string[];
  gratitude: string[];
  highlights: string[];
  note: string;
  created_at: string;
};

function truncateNote(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

const MAX_NOTE_CHARS = 2000;
const WEEKLY_MAX_CHECKINS = 40;
const MAX_JSON_CHARS = 24_000;

function entryToCheckInPayload(entry: Entry): CheckInPayload | null {
  if (entry.type !== "checkin") return null;
  const type = entry.checkInType ?? "basic";
  return {
    wellbeing: entry.mood ?? null,
    type,
    intentions: entry.whatWouldMakeDayGreat ?? [],
    gratitude: entry.whatImGratefulFor ?? [],
    highlights: entry.highlightsOfTheDay ?? [],
    note: truncateNote(entry.plainText ?? "", MAX_NOTE_CHARS),
    created_at: entry.localDateTime,
  };
}

function sortByLocalDateTimeAsc(a: Entry, b: Entry): number {
  return a.localDateTime.localeCompare(b.localDateTime);
}

function sortByLocalDateTimeDesc(a: Entry, b: Entry): number {
  return b.localDateTime.localeCompare(a.localDateTime);
}

function sortCheckInsAsc(a: CheckInPayload, b: CheckInPayload): number {
  return a.created_at.localeCompare(b.created_at);
}

function sortCheckInsDesc(a: CheckInPayload, b: CheckInPayload): number {
  return b.created_at.localeCompare(a.created_at);
}

function fitWeeklyCheckins(entries: Entry[]): CheckInPayload[] {
  const checkins = entries
    .map(entryToCheckInPayload)
    .filter((x): x is CheckInPayload => x !== null);
  const sorted = [...checkins].sort(sortCheckInsDesc);
  let picked = sorted.slice(0, WEEKLY_MAX_CHECKINS);
  let body = JSON.stringify(picked);
  while (body.length > MAX_JSON_CHARS && picked.length > 1) {
    picked = picked.slice(0, -1);
    body = JSON.stringify(picked);
  }
  if (body.length > MAX_JSON_CHARS && picked.length === 1 && picked[0]) {
    picked = [{ ...picked[0], note: truncateNote(picked[0].note, 200) }];
  }
  return picked.sort(sortCheckInsAsc);
}

export type InsightPromptParts = {
  systemPrompt: string;
  userPrompt: string;
};

export function buildDailyPrompt(entries: Entry[], now = new Date()): InsightPromptParts {
  const checkins = [...entries]
    .map(entryToCheckInPayload)
    .filter((x): x is CheckInPayload => x !== null)
    .sort(sortCheckInsAsc);
  const userPrompt = JSON.stringify(checkins);
  const systemPrompt = substituteSystemTemplate(loadDailyTemplate(), now, "");
  return { systemPrompt, userPrompt };
}

export function buildWeeklyPrompt(entries: Entry[], now = new Date()): InsightPromptParts {
  const checkins = fitWeeklyCheckins(entries);
  const userPrompt = JSON.stringify(checkins);
  const systemPrompt = substituteSystemTemplate(loadWeeklyTemplate(), now, "");
  return { systemPrompt, userPrompt };
}

export function hashInsightRequest(parts: InsightPromptParts): string {
  return createHash("sha256")
    .update(`${parts.systemPrompt}\n\n${parts.userPrompt}`, "utf8")
    .digest("hex");
}
