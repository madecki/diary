export const config = {
  natsUrl: process.env.NATS_URL ?? "nats://localhost:42220",
  natsStream: process.env.NATS_STREAM ?? "DIARY_EVENTS",
  publishBatchSize: Number(process.env.PUBLISH_BATCH_SIZE ?? "100"),
  publishPollIntervalMs: Number(process.env.PUBLISH_POLL_INTERVAL_MS ?? "500"),
} as const;
