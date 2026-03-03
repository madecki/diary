import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import type { Entry, Prisma } from "@prisma/client";
import { ulid } from "ulidx";
import {
  type CreateCheckinInput,
  type CreateShortNoteInput,
  type ListEntriesQuery,
  type EntryResponse,
  type ListEntriesResponse,
  type DiaryEventPayload,
  type DiaryEventName,
  UpdateCheckinSchema,
  UpdateShortNoteSchema,
  DEFAULT_ACTOR_USER_ID,
  EVENT_VERSION,
  EVENT_SOURCE,
  EVENT_SCHEMA,
} from "@diary/shared";
import { PrismaService } from "../prisma/prisma.service.js";

type TxClient = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

@Injectable()
export class EntriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createCheckin(input: CreateCheckinInput): Promise<EntryResponse> {
    const id = ulid();
    const localDate = input.localDate ?? todayLocal();

    return this.prisma.$transaction(async (tx) => {
      const typeSpecificData =
        input.checkInType === "morning"
          ? {
              whatImGratefulFor: input.whatImGratefulFor,
              whatWouldMakeDayGreat: input.whatWouldMakeDayGreat,
              dailyAffirmation: input.dailyAffirmation,
            }
          : {
              highlightsOfTheDay: input.highlightsOfTheDay,
              whatDidILearnToday: input.whatDidILearnToday,
            };

      const entry = await tx.entry.create({
        data: {
          id,
          type: "checkin",
          mood: input.mood,
          emotions: input.emotions,
          triggers: input.triggers,
          checkInType: input.checkInType,
          localDate,
          ...typeSpecificData,
        },
      });

      await this.writeOutboxEvent(tx, entry, "diary.entry.created");
      return toResponse(entry);
    });
  }

  async createShortNote(input: CreateShortNoteInput): Promise<EntryResponse> {
    const id = ulid();
    const localDate = input.localDate ?? todayLocal();

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          id,
          type: "short_note",
          contentJson: input.contentJson as Prisma.InputJsonValue,
          plainText: input.plainText,
          wordCount: input.wordCount,
          title: input.title ?? null,
          localDate,
        },
      });

      await this.writeOutboxEvent(tx, entry, "diary.entry.created");
      return toResponse(entry);
    });
  }

  async getEntry(id: string): Promise<EntryResponse> {
    const entry = await this.prisma.entry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Entry ${id} not found`);
    return toResponse(entry);
  }

  async listEntries(query: ListEntriesQuery): Promise<ListEntriesResponse> {
    const where: Prisma.EntryWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.cursor) where.id = { lt: query.cursor };

    const rows = await this.prisma.entry.findMany({
      where,
      orderBy: { id: "desc" },
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    return {
      entries: items.map(toResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.prisma.entry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Entry ${id} not found`);

    await this.prisma.$transaction(async (tx) => {
      await this.writeOutboxEvent(tx, existing, "diary.entry.deleted");
      await tx.entry.delete({ where: { id } });
    });
  }

  async updateEntry(id: string, body: unknown): Promise<EntryResponse> {
    const existing = await this.prisma.entry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Entry ${id} not found`);

    if (existing.type === "checkin") {
      const data = UpdateCheckinSchema.parse(body);

      const typeSpecificData =
        data.checkInType === "morning"
          ? {
              ...(data.whatImGratefulFor !== undefined && {
                whatImGratefulFor: data.whatImGratefulFor,
              }),
              ...(data.whatWouldMakeDayGreat !== undefined && {
                whatWouldMakeDayGreat: data.whatWouldMakeDayGreat,
              }),
              ...(data.dailyAffirmation !== undefined && {
                dailyAffirmation: data.dailyAffirmation,
              }),
            }
          : {
              ...(data.highlightsOfTheDay !== undefined && {
                highlightsOfTheDay: data.highlightsOfTheDay,
              }),
              ...(data.whatDidILearnToday !== undefined && {
                whatDidILearnToday: data.whatDidILearnToday,
              }),
            };

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.entry.update({
          where: { id },
          data: {
            checkInType: data.checkInType,
            ...(data.mood !== undefined && { mood: data.mood }),
            ...(data.emotions !== undefined && { emotions: data.emotions }),
            ...(data.triggers !== undefined && { triggers: data.triggers }),
            ...(data.localDate && { localDate: data.localDate }),
            ...typeSpecificData,
          },
        });

        await this.writeOutboxEvent(tx, updated, "diary.entry.updated");
        return toResponse(updated);
      });
    }

    const data = UpdateShortNoteSchema.parse(body);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.entry.update({
        where: { id },
        data: data as Prisma.EntryUpdateInput,
      });

      await this.writeOutboxEvent(tx, updated, "diary.entry.updated");
      return toResponse(updated);
    });
  }

  // ── Outbox helper ───────────────────────────────────────────────

  private async writeOutboxEvent(
    tx: TxClient,
    entry: Entry,
    eventName: DiaryEventName,
  ): Promise<void> {
    const eventId = ulid();
    const occurredAt = new Date();

    const lastEvent = await tx.outboxEvent.findFirst({
      where: { aggregateId: entry.id },
      orderBy: { aggregateVersion: "desc" },
    });
    const aggregateVersion = (lastEvent?.aggregateVersion ?? 0) + 1;

    const outboxRow = await tx.outboxEvent.create({
      data: {
        eventId,
        eventName,
        eventVersion: EVENT_VERSION,
        occurredAt,
        aggregateId: entry.id,
        aggregateType: entry.type,
        aggregateVersion,
        actorUserId: DEFAULT_ACTOR_USER_ID,
        payload: {},
      },
    });

    const payload: DiaryEventPayload = {
      eventName: eventName as DiaryEventPayload["eventName"],
      eventVersion: EVENT_VERSION,
      eventId,
      occurredAt: occurredAt.toISOString(),
      aggregate: {
        type: entry.type as "checkin" | "short_note",
        id: entry.id,
      },
      actor: { userId: DEFAULT_ACTOR_USER_ID },
      globalSequence: Number(outboxRow.globalSequence),
      aggregateVersion,
      data: {
        entrySnapshot: {
          id: entry.id,
          type: entry.type,
          localDate: entry.localDate,
          title: entry.title,
          contentJson: entry.contentJson,
          plainText: entry.plainText,
          wordCount: entry.wordCount,
          mood: entry.mood,
          emotions: entry.emotions,
          triggers: entry.triggers,
          checkInType: entry.checkInType,
          whatImGratefulFor: entry.whatImGratefulFor,
          whatWouldMakeDayGreat: entry.whatWouldMakeDayGreat,
          dailyAffirmation: entry.dailyAffirmation,
          highlightsOfTheDay: entry.highlightsOfTheDay,
          whatDidILearnToday: entry.whatDidILearnToday,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
        },
        derived: {
          localDate: entry.localDate,
          checkInType: entry.checkInType ?? null,
          mood: entry.mood ?? null,
          emotions: entry.emotions.length > 0 ? entry.emotions : null,
          triggers: entry.triggers.length > 0 ? entry.triggers : null,
          whatImGratefulFor:
            entry.whatImGratefulFor.length > 0 ? entry.whatImGratefulFor : null,
          whatWouldMakeDayGreat:
            entry.whatWouldMakeDayGreat.length > 0
              ? entry.whatWouldMakeDayGreat
              : null,
          dailyAffirmation: entry.dailyAffirmation ?? null,
          highlightsOfTheDay:
            entry.highlightsOfTheDay.length > 0
              ? entry.highlightsOfTheDay
              : null,
          whatDidILearnToday: entry.whatDidILearnToday ?? null,
        },
        metadata: { source: EVENT_SOURCE, schema: EVENT_SCHEMA },
      },
    };

    await tx.outboxEvent.update({
      where: { globalSequence: outboxRow.globalSequence },
      data: { payload: payload as unknown as Prisma.InputJsonValue },
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function todayLocal(): string {
  return new Date().toISOString().split("T")[0]!;
}

function toResponse(entry: Entry): EntryResponse {
  return {
    id: entry.id,
    type: entry.type,
    localDate: entry.localDate,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    title: entry.title,
    contentJson: entry.contentJson,
    plainText: entry.plainText,
    wordCount: entry.wordCount,
    mood: entry.mood,
    emotions: entry.emotions,
    triggers: entry.triggers,
    checkInType: entry.checkInType,
    whatImGratefulFor: entry.whatImGratefulFor,
    whatWouldMakeDayGreat: entry.whatWouldMakeDayGreat,
    dailyAffirmation: entry.dailyAffirmation,
    highlightsOfTheDay: entry.highlightsOfTheDay,
    whatDidILearnToday: entry.whatDidILearnToday,
  };
}
