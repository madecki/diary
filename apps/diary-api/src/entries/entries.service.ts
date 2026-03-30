import {
  type CreateCheckinInput,
  type DiaryEventName,
  type DiaryEventPayload,
  EVENT_SCHEMA,
  EVENT_SOURCE,
  EVENT_VERSION,
  type EntryResponse,
  type ListEntriesQuery,
  type ListEntriesResponse,
  UpdateCheckinSchema,
} from "@diary/shared";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { type Entry, Prisma } from "@prisma/client";
import { ulid } from "ulidx";
import { InsightsService } from "../insights/insights.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

type TxClient = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

type EntryInclude = Entry;

const ENTRY_INCLUDE = {} as const;

@Injectable()
export class EntriesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InsightsService) private readonly insights: InsightsService,
  ) {}

  async createCheckin(input: CreateCheckinInput, actorUserId: string): Promise<EntryResponse> {
    const id = ulid();
    const localDateTime = input.localDateTime ?? todayLocalDateTime();

    const result = await this.prisma.$transaction(async (tx) => {
      const typeSpecificData =
        input.checkInType === "morning"
          ? {
              whatImGratefulFor: input.whatImGratefulFor,
              whatWouldMakeDayGreat: input.whatWouldMakeDayGreat,
              dailyAffirmation: input.dailyAffirmation,
            }
          : input.checkInType === "evening"
            ? {
                highlightsOfTheDay: input.highlightsOfTheDay,
                whatDidILearnToday: input.whatDidILearnToday,
              }
            : {};

      const noteData =
        "contentJson" in input && input.contentJson !== undefined
          ? {
              contentJson: input.contentJson as Prisma.InputJsonValue,
              plainText: input.plainText!,
              wordCount: input.wordCount!,
            }
          : {};

      const entry = await tx.entry.create({
        data: {
          id,
          type: "checkin",
          ownerId: actorUserId,
          mood: input.mood,
          emotions: input.emotions,
          triggers: input.triggers,
          checkInType: input.checkInType,
          localDateTime,
          ...typeSpecificData,
          ...noteData,
        },
        include: ENTRY_INCLUDE,
      });

      await this.writeOutboxEvent(tx, entry, "diary.entry.created", actorUserId);
      return toResponse(entry);
    });

    this.insights.scheduleRegeneration(actorUserId);
    return result;
  }

  async getEntry(id: string, actorUserId: string): Promise<EntryResponse> {
    const entry = await this.prisma.entry.findUnique({
      where: { id },
      include: ENTRY_INCLUDE,
    });
    if (!entry) throw new NotFoundException(`Entry ${id} not found`);
    await this.assertReadAccess(entry, actorUserId);
    return toResponse(entry);
  }

  async listEntries(query: ListEntriesQuery, actorUserId: string): Promise<ListEntriesResponse> {
    const where: Prisma.EntryWhereInput = {
      AND: [
        ...(query.cursor ? [{ id: { lt: query.cursor } }] : []),
        {
          OR: [
            { ownerId: actorUserId },
            { accessList: { some: { userId: actorUserId, permission: { in: ["read", "both"] } } } },
          ],
        },
      ],
    };

    const rows = await this.prisma.entry.findMany({
      where,
      orderBy: { id: "desc" },
      take: query.limit + 1,
      include: ENTRY_INCLUDE,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    return {
      entries: items.map(toResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async deleteEntry(id: string, actorUserId: string): Promise<void> {
    const existing = await this.prisma.entry.findUnique({
      where: { id },
      include: ENTRY_INCLUDE,
    });
    if (!existing) throw new NotFoundException(`Entry ${id} not found`);
    if (existing.ownerId !== actorUserId) {
      throw new ForbiddenException("Only the owner can delete this entry");
    }

    await this.prisma.$transaction(async (tx) => {
      await this.writeOutboxEvent(tx, existing, "diary.entry.deleted", actorUserId);
      await tx.entry.delete({ where: { id } });
    });
  }

  async updateEntry(id: string, body: unknown, actorUserId: string): Promise<EntryResponse> {
    const existing = await this.prisma.entry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Entry ${id} not found`);
    await this.assertWriteAccess(existing, actorUserId);

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
        : data.checkInType === "evening"
          ? {
              ...(data.highlightsOfTheDay !== undefined && {
                highlightsOfTheDay: data.highlightsOfTheDay,
              }),
              ...(data.whatDidILearnToday !== undefined && {
                whatDidILearnToday: data.whatDidILearnToday,
              }),
            }
          : {};

    const typeClears =
      data.checkInType === "basic"
        ? {
            whatImGratefulFor: [] as string[],
            whatWouldMakeDayGreat: [] as string[],
            dailyAffirmation: null,
            highlightsOfTheDay: [] as string[],
            whatDidILearnToday: null,
          }
        : data.checkInType === "morning"
          ? {
              highlightsOfTheDay: [] as string[],
              whatDidILearnToday: null,
            }
          : {
              whatImGratefulFor: [] as string[],
              whatWouldMakeDayGreat: [] as string[],
              dailyAffirmation: null,
            };

    const noteUpdate =
      data.plainText !== undefined
        ? {
            contentJson:
              data.contentJson === null
                ? Prisma.DbNull
                : (data.contentJson as Prisma.InputJsonValue),
            plainText: data.plainText,
            wordCount: data.wordCount ?? null,
          }
        : {};

    const updatedResponse = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.entry.update({
        where: { id },
        data: {
          checkInType: data.checkInType,
          ...typeClears,
          ...(data.mood !== undefined && { mood: data.mood }),
          ...(data.emotions !== undefined && { emotions: data.emotions }),
          ...(data.triggers !== undefined && { triggers: data.triggers }),
          ...(data.localDateTime !== undefined && { localDateTime: data.localDateTime }),
          ...typeSpecificData,
          ...noteUpdate,
        },
        include: ENTRY_INCLUDE,
      });

      await this.writeOutboxEvent(tx, updated, "diary.entry.updated", actorUserId);
      return toResponse(updated);
    });
    this.insights.scheduleRegeneration(actorUserId);
    return updatedResponse;
  }

  private async assertReadAccess(
    entry: { id: string; ownerId: string | null },
    userId: string,
  ): Promise<void> {
    if (entry.ownerId === userId) return;
    const access = await this.prisma.accessList.findUnique({
      where: { entryId_userId: { entryId: entry.id, userId } },
    });
    if (!access || access.permission === "write") {
      throw new ForbiddenException("Access denied");
    }
  }

  private async assertWriteAccess(
    entry: { id: string; ownerId: string | null },
    userId: string,
  ): Promise<void> {
    if (entry.ownerId === userId) return;
    const access = await this.prisma.accessList.findUnique({
      where: { entryId_userId: { entryId: entry.id, userId } },
    });
    if (!access || access.permission === "read") {
      throw new ForbiddenException("Access denied");
    }
  }

  private async writeOutboxEvent(
    tx: TxClient,
    entry: EntryInclude,
    eventName: DiaryEventName,
    actorUserId: string,
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
        actorUserId,
        payload: {},
      },
    });

    const payload: DiaryEventPayload = {
      eventName: eventName as DiaryEventPayload["eventName"],
      eventVersion: EVENT_VERSION,
      eventId,
      occurredAt: occurredAt.toISOString(),
      aggregate: {
        type: "checkin",
        id: entry.id,
      },
      actor: { userId: actorUserId },
      globalSequence: Number(outboxRow.globalSequence),
      aggregateVersion,
      data: {
        entrySnapshot: {
          id: entry.id,
          type: entry.type,
          localDateTime: entry.localDateTime,
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
          localDateTime: entry.localDateTime,
          checkInType: entry.checkInType ?? null,
          mood: entry.mood ?? null,
          emotions: entry.emotions.length > 0 ? entry.emotions : null,
          triggers: entry.triggers.length > 0 ? entry.triggers : null,
          whatImGratefulFor: entry.whatImGratefulFor.length > 0 ? entry.whatImGratefulFor : null,
          whatWouldMakeDayGreat:
            entry.whatWouldMakeDayGreat.length > 0 ? entry.whatWouldMakeDayGreat : null,
          dailyAffirmation: entry.dailyAffirmation ?? null,
          highlightsOfTheDay: entry.highlightsOfTheDay.length > 0 ? entry.highlightsOfTheDay : null,
          whatDidILearnToday: entry.whatDidILearnToday ?? null,
          checkInNotePlainText: entry.plainText?.trim() ? entry.plainText : null,
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

function todayLocalDateTime(): string {
  return new Date().toISOString().slice(0, 16);
}

function toResponse(entry: EntryInclude): EntryResponse {
  return {
    id: entry.id,
    type: "checkin",
    localDateTime: entry.localDateTime,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
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
