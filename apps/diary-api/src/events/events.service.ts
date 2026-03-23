import type { OutboxQuery, ReplayBody } from "@diary/shared";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { OutboxEvent, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOutbox(query: OutboxQuery) {
    const where: Prisma.OutboxEventWhereInput = {};
    if (query.afterGlobalSequence !== undefined) {
      where.globalSequence = { gt: BigInt(query.afterGlobalSequence) };
    }

    const events = await this.prisma.outboxEvent.findMany({
      where,
      orderBy: { globalSequence: "asc" },
      take: query.limit,
    });

    return events.map(serializeOutboxEvent);
  }

  async replay(body: ReplayBody) {
    const conditions: Prisma.OutboxEventWhereInput[] = [];
    if (body.fromGlobalSequence !== undefined) {
      conditions.push({
        globalSequence: { gte: BigInt(body.fromGlobalSequence) },
      });
    }
    if (body.toGlobalSequence !== undefined) {
      conditions.push({
        globalSequence: { lte: BigInt(body.toGlobalSequence) },
      });
    }
    const where: Prisma.OutboxEventWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    if (body.dryRun) {
      const count = await this.prisma.outboxEvent.count({ where });
      return { dryRun: true, eventsToReplay: count };
    }

    const result = await this.prisma.outboxEvent.updateMany({
      where,
      data: {
        publishedAt: null,
        publishAttempts: 0,
        lastPublishError: null,
        lastPublishAttemptAt: null,
      },
    });

    this.logger.log(`Replay: re-queued ${result.count} events for publishing`);
    return { dryRun: false, eventsQueued: result.count };
  }
}

function serializeOutboxEvent(event: OutboxEvent) {
  return {
    globalSequence: Number(event.globalSequence),
    eventId: event.eventId,
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    occurredAt: event.occurredAt.toISOString(),
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    aggregateVersion: event.aggregateVersion,
    actorUserId: event.actorUserId,
    payload: event.payload,
    publishedAt: event.publishedAt?.toISOString() ?? null,
    publishAttempts: event.publishAttempts,
    lastPublishError: event.lastPublishError,
    lastPublishAttemptAt: event.lastPublishAttemptAt?.toISOString() ?? null,
  };
}
