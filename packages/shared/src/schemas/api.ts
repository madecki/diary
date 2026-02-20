import { z } from "zod";

// ── Create ──────────────────────────────────────────────────────────

export const CreateCheckinSchema = z.object({
  mood: z.number().int().min(1).max(10),
  contentJson: z.record(z.unknown()),
  plainText: z.string(),
  wordCount: z.number().int().min(0),
  emotions: z.array(z.string().min(1).max(50)).min(1).max(5),
  triggers: z.array(z.string().min(1).max(50)).min(1).max(5),
  timeOfDay: z.enum(["morning", "evening"]).optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

export const CreateShortNoteSchema = z.object({
  contentJson: z.record(z.unknown()),
  plainText: z.string(),
  wordCount: z.number().int().min(0),
  title: z.string().max(200).optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type CreateShortNoteInput = z.infer<typeof CreateShortNoteSchema>;

// ── Update ──────────────────────────────────────────────────────────

export const UpdateCheckinSchema = z.object({
  mood: z.number().int().min(1).max(10).optional(),
  contentJson: z.record(z.unknown()).optional(),
  plainText: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
  emotions: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  triggers: z.array(z.string().min(1).max(50)).min(1).max(5).optional(),
  timeOfDay: z.enum(["morning", "evening"]).nullable().optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type UpdateCheckinInput = z.infer<typeof UpdateCheckinSchema>;

export const UpdateShortNoteSchema = z.object({
  contentJson: z.record(z.unknown()).optional(),
  plainText: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
  title: z.string().max(200).nullable().optional(),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
