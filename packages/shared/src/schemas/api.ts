import { z } from "zod";
import { EntryResponseSchema } from "./entry.js";

// ── Helpers ─────────────────────────────────────────────────────────

const atLeastOneNonEmpty = (arr: string[]) => arr.some((s) => s.trim().length > 0);

const ThreeTextsSchema = z
  .array(z.string())
  .length(3)
  .refine(atLeastOneNonEmpty, { message: "At least one item is required" });

const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) // YYYY-MM-DDTHH:mm
  .optional();

// Common check-in fields (mood + emotions + triggers)
const CheckinCommonSchema = z.object({
  mood: z.number({ required_error: "Mood is required" }).int().min(1).max(10),
  emotions: z.array(z.string().min(1).max(50)).min(1, "Add at least one emotion").max(5),
  triggers: z.array(z.string().min(1).max(50)).min(1, "Add at least one trigger").max(5),
  localDateTime: localDateTimeSchema,
});

const checkinCreateNoteFields = {
  contentJson: z.record(z.unknown()).optional(),
  plainText: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
};

function refineCreateCheckinNote(
  data: {
    contentJson?: Record<string, unknown>;
    plainText?: string;
    wordCount?: number;
  },
  ctx: z.RefinementCtx,
): void {
  const parts = [
    data.contentJson !== undefined,
    data.plainText !== undefined,
    data.wordCount !== undefined,
  ].filter(Boolean).length;
  if (parts === 0) return;
  if (parts !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Optional note requires contentJson, plainText, and wordCount together",
    });
    return;
  }
  if (!String(data.plainText).trim()) {
    ctx.addIssue({
      path: ["plainText"],
      code: z.ZodIssueCode.custom,
      message: "Note cannot be empty",
    });
  }
}

// ── CheckIn Create ──────────────────────────────────────────────────

const MorningCheckinSchema = CheckinCommonSchema.extend({
  ...checkinCreateNoteFields,
  checkInType: z.literal("morning"),
  whatImGratefulFor: ThreeTextsSchema,
  whatWouldMakeDayGreat: ThreeTextsSchema,
  dailyAffirmation: z.string().trim().min(1, "Daily affirmation is required"),
}).superRefine(refineCreateCheckinNote);

const EveningCheckinSchema = CheckinCommonSchema.extend({
  ...checkinCreateNoteFields,
  checkInType: z.literal("evening"),
  highlightsOfTheDay: ThreeTextsSchema,
  whatDidILearnToday: z.string().trim().min(1, "This field is required"),
}).superRefine(refineCreateCheckinNote);

const BasicCheckinSchema = CheckinCommonSchema.extend({
  checkInType: z.literal("basic"),
  contentJson: z.record(z.unknown()),
  plainText: z.string().trim().min(1, "Note is required for basic check-ins"),
  wordCount: z.number().int().min(0),
});

export const CreateCheckinSchema = z.union([
  MorningCheckinSchema,
  EveningCheckinSchema,
  BasicCheckinSchema,
]);
export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

// ── CheckIn Update ──────────────────────────────────────────────────

const updateCheckinBaseShape = {
  mood: z.number().int().min(1).max(10).optional(),
  emotions: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  triggers: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  localDateTime: localDateTimeSchema,
  contentJson: z.record(z.unknown()).nullable().optional(),
  plainText: z.string().nullable().optional(),
  wordCount: z.number().int().min(0).nullable().optional(),
};

function refineUpdateCheckinNote(
  data: {
    contentJson?: Record<string, unknown> | null;
    plainText?: string | null;
    wordCount?: number | null;
  },
  ctx: z.RefinementCtx,
): void {
  const parts = [
    data.contentJson !== undefined,
    data.plainText !== undefined,
    data.wordCount !== undefined,
  ].filter(Boolean).length;
  if (parts === 0) return;
  if (parts !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Note fields must be updated together",
    });
    return;
  }
  if (data.contentJson === null && data.plainText === null && data.wordCount === null) {
    return;
  }
  if (data.contentJson === null || data.plainText === null || data.wordCount === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "To clear the note, set contentJson, plainText, and wordCount to null",
    });
    return;
  }
  if (!String(data.plainText).trim()) {
    ctx.addIssue({
      path: ["plainText"],
      code: z.ZodIssueCode.custom,
      message: "Note cannot be empty",
    });
  }
}

const MorningUpdateCheckinSchema = z
  .object({
    checkInType: z.literal("morning"),
    ...updateCheckinBaseShape,
    whatImGratefulFor: ThreeTextsSchema.optional(),
    whatWouldMakeDayGreat: ThreeTextsSchema.optional(),
    dailyAffirmation: z.string().trim().min(1).optional(),
  })
  .superRefine(refineUpdateCheckinNote);

const EveningUpdateCheckinSchema = z
  .object({
    checkInType: z.literal("evening"),
    ...updateCheckinBaseShape,
    highlightsOfTheDay: ThreeTextsSchema.optional(),
    whatDidILearnToday: z.string().trim().min(1).optional(),
  })
  .superRefine(refineUpdateCheckinNote);

const BasicUpdateCheckinSchema = z
  .object({
    checkInType: z.literal("basic"),
    ...updateCheckinBaseShape,
  })
  .superRefine((data, ctx) => {
    refineUpdateCheckinNote(data, ctx);
    const parts = [
      data.contentJson !== undefined,
      data.plainText !== undefined,
      data.wordCount !== undefined,
    ].filter(Boolean).length;
    if (
      parts === 3 &&
      data.contentJson === null &&
      data.plainText === null &&
      data.wordCount === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Basic check-ins must keep a note",
      });
    }
  });

export const UpdateCheckinSchema = z.union([
  MorningUpdateCheckinSchema,
  EveningUpdateCheckinSchema,
  BasicUpdateCheckinSchema,
]);
export type UpdateCheckinInput = z.infer<typeof UpdateCheckinSchema>;

// ── Query ───────────────────────────────────────────────────────────

export const ListEntriesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
