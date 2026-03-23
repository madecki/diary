import { z } from "zod";

export const EntryTypeSchema = z.enum(["checkin", "note"]);
export type EntryType = z.infer<typeof EntryTypeSchema>;

export const CheckInTypeSchema = z.enum(["morning", "evening", "basic"]);
export type CheckInType = z.infer<typeof CheckInTypeSchema>;

export const EntryResponseSchema = z.object({
  id: z.string(),
  type: EntryTypeSchema,
  localDateTime: z.string(), // YYYY-MM-DDTHH:mm
  createdAt: z.string(),
  updatedAt: z.string(),

  // Note fields: full note body when type is note; optional rich “note” on check-ins when set
  title: z.string().nullable(),
  contentJson: z.unknown().nullable(),
  plainText: z.string().nullable(),
  wordCount: z.number().int().nullable(),
  noteFolderId: z.string().nullable(),
  noteFolderPath: z.string().nullable(),
  /** Opaque ID in settings-service (no FK in diary DB). */
  projectId: z.string().nullable(),
  /** Tag IDs in settings-service (names resolved via /settings/tags in the client). */
  tagIds: z.array(z.string()),

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
