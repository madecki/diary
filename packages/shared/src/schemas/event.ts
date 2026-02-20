import { z } from "zod";

export const DiaryEventNameSchema = z.enum([
  "diary.entry.created",
  "diary.entry.updated",
]);
export type DiaryEventName = z.infer<typeof DiaryEventNameSchema>;

export const AggregateTypeSchema = z.enum(["checkin", "short_note"]);
export type AggregateType = z.infer<typeof AggregateTypeSchema>;

export const DerivedDataSchema = z.object({
  plainText: z.string(),
  wordCount: z.number().int(),
  localDate: z.string(),
  timeOfDay: z.enum(["morning", "evening"]).nullable(),
  mood: z.number().int().min(1).max(10).nullable(),
  emotions: z.array(z.string()).nullable(),
  triggers: z.array(z.string()).nullable(),
});
export type DerivedData = z.infer<typeof DerivedDataSchema>;

export const DiaryEventPayloadSchema = z.object({
  eventName: DiaryEventNameSchema,
  eventVersion: z.literal(1),
  eventId: z.string(),
  occurredAt: z.string().datetime(),
  aggregate: z.object({
    type: AggregateTypeSchema,
    id: z.string(),
  }),
  actor: z.object({
    userId: z.string(),
  }),
  globalSequence: z.number().int(),
  aggregateVersion: z.number().int(),
  data: z.object({
    entrySnapshot: z.record(z.unknown()),
    derived: DerivedDataSchema,
    metadata: z.object({
      source: z.literal("diary"),
      schema: z.literal("diary.event.v1"),
    }),
  }),
});
export type DiaryEventPayload = z.infer<typeof DiaryEventPayloadSchema>;
