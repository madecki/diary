import { z } from "zod";

export const RefTypeSchema = z.enum(["difficult", "neutral", "pleasant"]);
export type RefType = z.infer<typeof RefTypeSchema>;

export const EmotionResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: RefTypeSchema,
  usageCount: z.number().int().default(0),
});
export type EmotionResponse = z.infer<typeof EmotionResponseSchema>;

export const TriggerResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: RefTypeSchema,
  usageCount: z.number().int().default(0),
});
export type TriggerResponse = z.infer<typeof TriggerResponseSchema>;

export const CreateEmotionSchema = z.object({
  label: z.string().trim().min(1).max(50),
  type: RefTypeSchema,
});
export type CreateEmotionInput = z.infer<typeof CreateEmotionSchema>;

export const UpdateEmotionSchema = z.object({
  label: z.string().trim().min(1).max(50).optional(),
  type: RefTypeSchema.optional(),
});
export type UpdateEmotionInput = z.infer<typeof UpdateEmotionSchema>;

export const CreateTriggerSchema = z.object({
  label: z.string().trim().min(1).max(50),
  type: RefTypeSchema,
});
export type CreateTriggerInput = z.infer<typeof CreateTriggerSchema>;

export const UpdateTriggerSchema = z.object({
  label: z.string().trim().min(1).max(50).optional(),
  type: RefTypeSchema.optional(),
});
export type UpdateTriggerInput = z.infer<typeof UpdateTriggerSchema>;

// ── Projects ─────────────────────────────────────────────────────────

/** Matches @madecki/ui Button variant for consistent project colors */
export const ProjectColorSchema = z.enum(["primary", "success", "warning", "danger", "info"]);
export type ProjectColor = z.infer<typeof ProjectColorSchema>;

export const PROJECT_COLORS: ProjectColor[] = ["primary", "success", "warning", "danger", "info"];

export const ProjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: ProjectColorSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  color: ProjectColorSchema.optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  color: ProjectColorSchema.optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ── Tags ─────────────────────────────────────────────────────────────

export const TagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});
export type TagResponse = z.infer<typeof TagResponseSchema>;

export const CreateTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
});
export type CreateTagInput = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z.object({
  name: z.string().trim().min(1).max(50),
});
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
