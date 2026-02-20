import { z } from "zod";

export const EntryTypeSchema = z.enum(["checkin", "short_note"]);
export type EntryType = z.infer<typeof EntryTypeSchema>;

export const TimeOfDaySchema = z.enum(["morning", "evening"]);
export type TimeOfDay = z.infer<typeof TimeOfDaySchema>;

export const EntryResponseSchema = z.object({
  id: z.string(),
  type: EntryTypeSchema,
  contentJson: z.unknown(),
  plainText: z.string(),
  wordCount: z.number().int(),
  mood: z.number().int().min(1).max(10).nullable(),
  emotions: z.array(z.string()),
  triggers: z.array(z.string()),
  timeOfDay: TimeOfDaySchema.nullable(),
  title: z.string().nullable(),
  localDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EntryResponse = z.infer<typeof EntryResponseSchema>;

export const ListEntriesResponseSchema = z.object({
  entries: z.array(EntryResponseSchema),
  nextCursor: z.string().nullable(),
});
export type ListEntriesResponse = z.infer<typeof ListEntriesResponseSchema>;
