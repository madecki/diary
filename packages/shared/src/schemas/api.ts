import { z } from "zod";
import { EntryResponseSchema } from "./entry.js";

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

// ── Note ────────────────────────────────────────────────────────────

export const CreateNoteSchema = z.object({
  contentJson: z.record(z.unknown()),
  plainText: z.string(),
  wordCount: z.number().int().min(0),
  title: z.string().max(200).optional(),
  folderPath: z.string().trim().min(1).optional(),
  localDate: localDateSchema,
});
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  contentJson: z.record(z.unknown()).optional(),
  plainText: z.string().optional(),
  wordCount: z.number().int().min(0).optional(),
  title: z.string().max(200).nullable().optional(),
  folderPath: z.string().trim().min(1).nullable().optional(),
  localDate: localDateSchema,
});
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

// ── Query ───────────────────────────────────────────────────────────

export const ListEntriesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["checkin", "note"]).optional(),
});
export type ListEntriesQuery = z.infer<typeof ListEntriesQuerySchema>;

// ── Note Folders ────────────────────────────────────────────────────

export const CreateNoteFolderSchema = z.object({
  path: z.string().trim().min(1),
});
export type CreateNoteFolderInput = z.infer<typeof CreateNoteFolderSchema>;

export const NoteFolderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NoteFolderResponse = z.infer<typeof NoteFolderResponseSchema>;

export const BrowseFolderItemSchema = NoteFolderResponseSchema.extend({
  notesCount: z.number().int(),
  foldersCount: z.number().int(),
});
export type BrowseFolderItem = z.infer<typeof BrowseFolderItemSchema>;

export const BrowseNotesQuerySchema = z.object({
  path: z.string().trim().min(1).optional(),
});
export type BrowseNotesQuery = z.infer<typeof BrowseNotesQuerySchema>;

export const DeleteNoteFolderQuerySchema = z.object({
  path: z.string().trim().min(1),
  force: z.coerce.boolean().default(false),
});
export type DeleteNoteFolderQuery = z.infer<typeof DeleteNoteFolderQuerySchema>;

export const RenameNoteFolderSchema = z.object({
  path: z.string().trim().min(1),
  newName: z.string().trim().min(1),
});
export type RenameNoteFolderInput = z.infer<typeof RenameNoteFolderSchema>;

export const BrowseNotesResponseSchema = z.object({
  currentPath: z.string().nullable(),
  folders: z.array(BrowseFolderItemSchema),
  notes: z.array(EntryResponseSchema),
});
export type BrowseNotesResponse = z.infer<typeof BrowseNotesResponseSchema>;

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
