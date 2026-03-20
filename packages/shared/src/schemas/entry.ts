import { z } from "zod";
import { ProjectColorSchema } from "./reference.js";

export const EntryTypeSchema = z.enum(["checkin", "note"]);
export type EntryType = z.infer<typeof EntryTypeSchema>;

export const CheckInTypeSchema = z.enum(["morning", "evening"]);
export type CheckInType = z.infer<typeof CheckInTypeSchema>;

export const EntryProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: ProjectColorSchema,
});
export type EntryProject = z.infer<typeof EntryProjectSchema>;

export const EntryTagSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type EntryTag = z.infer<typeof EntryTagSchema>;

export const EntryResponseSchema = z.object({
  id: z.string(),
  type: EntryTypeSchema,
  localDateTime: z.string(), // YYYY-MM-DDTHH:mm
  createdAt: z.string(),
  updatedAt: z.string(),

  // Note fields (null for check-ins)
  title: z.string().nullable(),
  contentJson: z.unknown().nullable(),
  plainText: z.string().nullable(),
  wordCount: z.number().int().nullable(),
  noteFolderId: z.string().nullable(),
  noteFolderPath: z.string().nullable(),
  projectId: z.string().nullable(),
  project: EntryProjectSchema.nullable(),
  tags: z.array(EntryTagSchema),

  // Check-in fields (null / empty arrays for notes)
  mood: z.number().int().min(1).max(10).nullable(),
  emotions: z.array(z.string()),
  triggers: z.array(z.string()),
  checkInType: CheckInTypeSchema.nullable(),
  whatImGratefulFor: z.array(z.string()),
  whatWouldMakeDayGreat: z.array(z.string()),
  dailyAffirmation: z.string().nullable(),
  highlightsOfTheDay: z.array(z.string()),
  whatDidILearnToday: z.string().nullable(),
});
export type EntryResponse = z.infer<typeof EntryResponseSchema>;

export const ListEntriesResponseSchema = z.object({
  entries: z.array(EntryResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListEntriesResponse = z.infer<typeof ListEntriesResponseSchema>;
