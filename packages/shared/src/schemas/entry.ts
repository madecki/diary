import { z } from "zod";

export const EntryTypeSchema = z.literal("checkin");
export type EntryType = z.infer<typeof EntryTypeSchema>;

export const CheckInTypeSchema = z.enum(["morning", "evening", "basic"]);
export type CheckInType = z.infer<typeof CheckInTypeSchema>;

export const EntryResponseSchema = z.object({
  id: z.string(),
  type: EntryTypeSchema,
  localDateTime: z.string(), // YYYY-MM-DDTHH:mm
  createdAt: z.string(),
  updatedAt: z.string(),

  /** BlockNote JSON; optional on morning/evening; set for basic and optional rich note on others */
  contentJson: z.unknown().nullable(),
  plainText: z.string().nullable(),
  wordCount: z.number().int().nullable(),

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
