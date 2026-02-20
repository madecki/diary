import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { OutboxEvent } from "@prisma/client";
import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  StringCodec,
  headers,
} from "nats";
import { NATS_STREAM_NAME, NATS_SUBJECTS } from "@diary/shared";
import { config } from "./config.js";

export class OutboxPublisher {
  private prisma: PrismaClient;
  private nc!: NatsConnection;
  private js!: JetStreamClient;
  private running = false;
  private sc = StringCodec();

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    const adapter = new PrismaPg({ connectionString });
    this.prisma = new PrismaClient({ adapter });
  }

  async start(): Promise<void> {
    this.nc = await connect({ servers: config.natsUrl });
    console.log(`Connected to NATS at ${config.natsUrl}`);

    await this.ensureStream();

    this.js = this.nc.jetstream();
    this.running = true;

    console.log(
      `Publisher started — batch=${config.publishBatchSize}, poll=${config.publishPollIntervalMs}ms`,
    );
    await this.pollLoop();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    try {
      await this.nc?.drain();
    } catch {
      // ignore drain errors on shutdown (e.g. already draining)
    }
    await this.prisma.$disconnect();
    console.log("Publisher stopped");
  }

  private async ensureStream(): Promise<void> {
    const jsm = await this.nc.jetstreamManager();
    try {
      await jsm.streams.info(NATS_STREAM_NAME);
      console.log(`Stream ${NATS_STREAM_NAME} exists`);
    } catch {
      await jsm.streams.add({
        name: NATS_STREAM_NAME,
        subjects: [...NATS_SUBJECTS],
        retention: "limits" as any,
        storage: "file" as any,
        max_bytes: -1,
        duplicate_window: 120_000_000_000,
      });
      console.log(`Stream ${NATS_STREAM_NAME} created`);
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const published = await this.publishBatch();
        if (published === 0) {
          await sleep(config.publishPollIntervalMs);
        }
      } catch (err) {
        console.error("Poll loop error:", err);
        await sleep(config.publishPollIntervalMs * 2);
      }
    }
  }

  private async publishBatch(): Promise<number> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { globalSequence: "asc" },
      take: config.publishBatchSize,
    });

    let count = 0;
    for (const event of events) {
      try {
        await this.publishEvent(event);
        await this.prisma.outboxEvent.update({
          where: { globalSequence: event.globalSequence },
          data: { publishedAt: new Date() },
        });
        count++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.prisma.outboxEvent.update({
          where: { globalSequence: event.globalSequence },
          data: {
            publishAttempts: { increment: 1 },
            lastPublishError: msg,
            lastPublishAttemptAt: new Date(),
          },
        });
        console.error(`Failed to publish ${event.eventId}: ${msg}`);
      }
    }

    if (count > 0) {
      console.log(`Published ${count}/${events.length} events`);
    }
    return count;
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    const h = headers();
    h.set("Nats-Msg-Id", event.eventId);
    h.set("diary-event-version", String(event.eventVersion));
    h.set("diary-aggregate-id", event.aggregateId);
    h.set("diary-aggregate-type", event.aggregateType);

    const ack = await this.js.publish(
      event.eventName,
      this.sc.encode(JSON.stringify(event.payload)),
      { msgID: event.eventId, headers: h },
    );

    if (ack.duplicate) {
      console.log(`Event ${event.eventId} deduplicated by JetStream`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
