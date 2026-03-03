import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────────────

const atLeastOneNonEmpty = (arr: string[]) => arr.some((s) => s.trim().length > 0);

const ThreeTextsSchema = z
  .array(z.string())
  .length(3)
  .refine(atLeastOneNonEmpty, { message: "At least one item is required" });

const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

// Common check-in fields (mood + emotions + triggers)
const CheckinCommonSchema = z.object({
  mood: z.number({ required_error: "Mood is required" }).int().min(1).max(10),
  emotions: z.array(z.string().min(1).max(50)).min(1, "Add at least one emotion").max(5),
  triggers: z.array(z.string().min(1).max(50)).min(1, "Add at least one trigger").max(5),
  localDate: localDateSchema,
});

// ── CheckIn Create ──────────────────────────────────────────────────

const MorningCheckinSchema = CheckinCommonSchema.extend({
  checkInType: z.literal("morning"),
  whatImGratefulFor: ThreeTextsSchema,
  whatWouldMakeDayGreat: ThreeTextsSchema,
  dailyAffirmation: z.string().trim().min(1, "Daily affirmation is required"),
});

const EveningCheckinSchema = CheckinCommonSchema.extend({
  checkInType: z.literal("evening"),
  highlightsOfTheDay: ThreeTextsSchema,
  whatDidILearnToday: z.string().trim().min(1, "This field is required"),
});

export const CreateCheckinSchema = z.discriminatedUnion("checkInType", [
  MorningCheckinSchema,
  EveningCheckinSchema,
]);
export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

// ── CheckIn Update ──────────────────────────────────────────────────

const UpdateCheckinCommonSchema = z.object({
  mood: z.number().int().min(1).max(10).optional(),
  emotions: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  triggers: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  localDate: localDateSchema,
});

export const UpdateCheckinSchema = z.discriminatedUnion("checkInType", [
  UpdateCheckinCommonSchema.extend({
    checkInType: z.literal("morning"),
    whatImGratefulFor: ThreeTextsSchema.optional(),
    whatWouldMakeDayGreat: ThreeTextsSchema.optional(),
    dailyAffirmation: z.string().trim().min(1).optional(),
  }),
  UpdateCheckinCommonSchema.extend({
    checkInType: z.literal("evening"),
    highlightsOfTheDay: ThreeTextsSchema.optional(),
    whatDidILearnToday: z.string().trim().min(1).optional(),
  }),
]);
export type UpdateCheckinInput = z.infer<typeof UpdateCheckinSchema>;

// ── Short Note ──────────────────────────────────────────────────────

export const CreateShortNoteSchema = z.object({
  contentJson: z.record(z.unknown()),
  plainText: z.string(),
  wordCount: z.number().int().min(0),
  title: z.string().max(200).optional(),
  localDate: localDateSchema,
});
export type CreateShortNoteInput = z.infer<typeof CreateShortNoteSchema>;

export const UpdateShortNoteSchema = z.object({
  contentJson: z.record(z.unknown()).optional(),
  plainText: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
  title: z.string().max(200).nullable().optional(),
  localDate: localDateSchema,
});
export type UpdateShortNoteInput = z.infer<typeof UpdateShortNoteSchema>;

// ── Query ───────────────────────────────────────────────────────────

export const ListEntriesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["checkin", "short_note"]).optional(),
});
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>;

// ── Admin: Outbox ───────────────────────────────────────────────────

export const OutboxQuerySchema = z.object({
  afterGlobalSequence: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
export type OutboxQuery = z.infer<typeof OutboxQuerySchema>;

// ── Admin: Replay ───────────────────────────────────────────────────

export const ReplayBodySchema = z.object({
  fromGlobalSequence: z.number().int().optional(),
  toGlobalSequence: z.number().int().optional(),
  dryRun: z.boolean().default(false),
});
export type ReplayBody = z.infer<typeof ReplayBodySchema>;
