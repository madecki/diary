import { z } from "zod";

export const RefTypeSchema = z.enum(["difficult", "neutral", "pleasant"]);
export type RefType = z.infer<typeof RefTypeSchema>;

export const EmotionResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: RefTypeSchema,
});
export type EmotionResponse = z.infer<typeof EmotionResponseSchema>;

export const TriggerResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: RefTypeSchema,
});
export type TriggerResponse = z.infer<typeof TriggerResponseSchema>;
