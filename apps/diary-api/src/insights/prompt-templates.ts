import { createHash } from "node:crypto";
import type { Entry } from "@prisma/client";

export const SYSTEM_PROMPT = `You are a compassionate and insightful personal wellbeing assistant.
You analyze mood check-ins and journal entries to provide brief,
actionable insights. Your tone is warm, supportive, and direct —
like a thoughtful friend, not a therapist. Keep responses concise
(3-5 sentences). Never diagnose conditions or prescribe treatments.
Focus on patterns, gentle suggestions, and validation.`;

const MAX_PLAIN_TEXT = 500;
/** Rough char budget for user prompt body (~3000 tokens). */
const MAX_PROMPT_CHARS = 10_000;
const WEEKLY_MAX_ENTRIES = 20;

function truncatePlain(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  const t = text.trim();
  return t.length <= MAX_PLAIN_TEXT ? t : `${t.slice(0, MAX_PLAIN_TEXT)}…`;
}

function formatCheckInSlot(entry: Entry): string {
  const datePart = entry.localDateTime.slice(0, 10);
  const timePart = entry.localDateTime.length > 10 ? entry.localDateTime.slice(11) : "";
  const slot = timePart ? `${datePart} ${timePart}` : datePart;
  const mood = entry.mood != null ? `${entry.mood}/10` : "?";
  const emotions = (entry.emotions ?? []).join(", ") || "—";
  const triggers = (entry.triggers ?? []).join(", ") || "—";
  const journal = truncatePlain(entry.plainText);
  const journalLine = journal ? `\nJournal: ${journal}` : "";
  return `[${slot}] Mood: ${mood} | Emotions: ${emotions} | Triggers: ${triggers}${journalLine}`;
}

function formatNote(entry: Entry): string {
  const datePart = entry.localDateTime.slice(0, 10);
  const title = entry.title?.trim() || "Untitled";
  const body = truncatePlain(entry.plainText);
  return `[${datePart}] Note: ${title}\n${body}`;
}

export function formatEntryForPrompt(entry: Entry): string {
  if (entry.type === "checkin") {
    return `**Check-in:**\n\n${formatCheckInSlot(entry)}`;
  }
  return `**Note:**\n\n${formatNote(entry)}`;
}

function sortByLocalDateTimeDesc(a: Entry, b: Entry): number {
  return b.localDateTime.localeCompare(a.localDateTime);
}

function fitWeeklyEntries(entries: Entry[]): Entry[] {
  const sorted = [...entries].sort(sortByLocalDateTimeDesc);
  let picked = sorted.slice(0, WEEKLY_MAX_ENTRIES);
  let body = picked.map(formatEntryForPrompt).join("\n\n");

  while (body.length > MAX_PROMPT_CHARS && picked.length > 1) {
    picked = picked.slice(0, -1);
    body = picked.map(formatEntryForPrompt).join("\n\n");
  }

  while (body.length > MAX_PROMPT_CHARS && picked.length === 1) {
    const only = picked[0];
    if (!only) break;
    const shortened = { ...only, plainText: (only.plainText ?? "").slice(0, 200) };
    picked = [shortened];
    body = formatEntryForPrompt(shortened);
    if (body.length <= MAX_PROMPT_CHARS) break;
    break;
  }

  return picked;
}

export function buildDailyPrompt(entries: Entry[]): string {
  const sorted = [...entries].sort(sortByLocalDateTimeDesc);
  const blocks = sorted.map(formatEntryForPrompt).join("\n\n");
  return `Here are today's diary entries:

${blocks}

Based on these entries, provide a brief daily insight:
- How is the person feeling overall today?
- One specific, actionable suggestion for the rest of the day
- A brief word of encouragement or validation

Keep it to 3-5 sentences. Be warm and direct.`;
}

export function buildWeeklyPrompt(entries: Entry[]): string {
  const picked = fitWeeklyEntries(entries);
  const blocks = picked.map(formatEntryForPrompt).join("\n\n");
  return `Here are diary entries from the last 7 days:

${blocks}

Based on this week's entries, provide a brief weekly insight:
- What patterns do you notice in mood and energy across the week?
- Are there recurring triggers (positive or negative)?
- One actionable suggestion for the coming week
- A brief reflection on progress or resilience

Keep it to 4-6 sentences. Be warm and direct.`;
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}
