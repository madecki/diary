import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from "@nestjs/common";
import type { Entry, NoteFolder, Prisma } from "@prisma/client";
import { ulid } from "ulidx";
import {
  type CreateCheckinInput,
  type CreateNoteInput,
  type CreateNoteFolderInput,
  type RenameNoteFolderInput,
  type BrowseNotesResponse,
  type ListEntriesQuery,
  type EntryResponse,
  type ListEntriesResponse,
  type NoteFolderResponse,
  type DiaryEventPayload,
  type DiaryEventName,
  UpdateCheckinSchema,
  UpdateNoteSchema,
  EVENT_VERSION,
  EVENT_SOURCE,
  EVENT_SCHEMA,
} from "@diary/shared";
import { PrismaService } from "../prisma/prisma.service.js";

type TxClient = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];

type EntryInclude = Entry & {
  noteFolder?: Pick<NoteFolder, "path"> | null;
  project?: { id: string; name: string; color: string } | null;
  tags?: { id: string; name: string }[];
};

const ENTRY_INCLUDE = {
  noteFolder: { select: { path: true } },
  project: { select: { id: true, name: true, color: true } },
  tags: { select: { id: true, name: true } },
} as const;

@Injectable()
export class EntriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createCheckin(input: CreateCheckinInput, actorUserId: string): Promise<EntryResponse> {
    const id = ulid();
    const localDateTime = input.localDateTime ?? todayLocalDateTime();

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
          ownerId: actorUserId,
          mood: input.mood,
          emotions: input.emotions,
          triggers: input.triggers,
          checkInType: input.checkInType,
          localDateTime,
          ...typeSpecificData,
        },
        include: ENTRY_INCLUDE,
      });

      await this.writeOutboxEvent(tx, entry, "diary.entry.created", actorUserId);
      return toResponse(entry);
    });
  }

  async createNoteFolder(input: CreateNoteFolderInput): Promise<NoteFolderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const folder = await this.resolveFolderPath(tx, input.path);
      if (!folder) throw new BadRequestException("Folder path cannot be empty");
      return toNoteFolderResponse(folder);
    });
  }

  async listNoteFolders(): Promise<NoteFolderResponse[]> {
    const rows = await this.prisma.noteFolder.findMany({
      orderBy: { path: "asc" },
    });
    return rows.map(toNoteFolderResponse);
  }

  async browseNotes(path?: string): Promise<BrowseNotesResponse> {
    const normalized = normalizeFolderPath(path);
    let currentFolder: NoteFolder | null = null;
    if (normalized) {
      currentFolder = await this.prisma.noteFolder.findUnique({
        where: { path: normalized },
      });
      if (!currentFolder) {
        throw new NotFoundException(`Folder '${normalized}' not found`);
      }
    }

    const [folders, notes] = await Promise.all([
      this.prisma.noteFolder.findMany({
        where: { parentId: currentFolder?.id ?? null },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { children: true, notes: true } },
        },
      }),
      this.prisma.entry.findMany({
        where: {
          type: "note",
          noteFolderId: currentFolder?.id ?? null,
        },
        include: ENTRY_INCLUDE,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      }),
    ]);

    return {
      currentPath: currentFolder?.path ?? null,
      folders: folders.map((f) => ({
        ...toNoteFolderResponse(f),
        notesCount: f._count.notes,
        foldersCount: f._count.children,
      })),
      notes: notes.map(toResponse),
    };
  }

  async deleteNoteFolder(path: string, force = false): Promise<void> {
    const normalized = normalizeFolderPath(path);
    if (!normalized) throw new BadRequestException("Folder path cannot be empty");

    const folder = await this.prisma.noteFolder.findUnique({
      where: { path: normalized },
    });
    if (!folder) throw new NotFoundException(`Folder '${normalized}' not found`);

    const [childrenCount, notesCount] = await Promise.all([
      this.prisma.noteFolder.count({ where: { parentId: folder.id } }),
      this.prisma.entry.count({ where: { type: "note", noteFolderId: folder.id } }),
    ]);

    if (!force && (childrenCount > 0 || notesCount > 0)) {
      throw new BadRequestException(
        "Folder is not empty. Confirm deletion to remove nested folders and detach notes.",
      );
    }

    await this.prisma.noteFolder.delete({ where: { id: folder.id } });
  }

  async createNote(input: CreateNoteInput, actorUserId: string): Promise<EntryResponse> {
    const id = ulid();
    const localDateTime = input.localDateTime ?? todayLocalDateTime();

    return this.prisma.$transaction(async (tx) => {
      const folder = await this.resolveFolderPath(tx, input.folderPath);
      const entry = await tx.entry.create({
        data: {
          id,
          type: "note",
          ownerId: actorUserId,
          contentJson: input.contentJson as Prisma.InputJsonValue,
          plainText: input.plainText,
          wordCount: input.wordCount,
          title: input.title ?? null,
          noteFolderId: folder?.id ?? null,
          localDateTime,
          ...(input.projectId ? { projectId: input.projectId } : {}),
          ...(input.tagIds && input.tagIds.length > 0
            ? { tags: { connect: input.tagIds.map((tagId) => ({ id: tagId })) } }
            : {}),
        },
        include: ENTRY_INCLUDE,
      });

      await this.writeOutboxEvent(tx, entry, "diary.entry.created", actorUserId);
      return toResponse(entry);
    });
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
    // Only return entries the actor owns or has been explicitly granted read access to.
    // Entries without an ownerId (pre-auth legacy data) are invisible until assigned
    // via `pnpm db:assign-owner`.
    const where: Prisma.EntryWhereInput = {
      AND: [
        ...(query.type ? [{ type: query.type }] : []),
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
            ...(data.localDateTime !== undefined && { localDateTime: data.localDateTime }),
            ...typeSpecificData,
          },
          include: ENTRY_INCLUDE,
        });

        await this.writeOutboxEvent(tx, updated, "diary.entry.updated", actorUserId);
        return toResponse(updated);
      });
    }

    const data = UpdateNoteSchema.parse(body);
    return this.prisma.$transaction(async (tx) => {
      let noteFolderId: string | null | undefined = undefined;
      if (data.folderPath !== undefined) {
        if (data.folderPath === null) {
          noteFolderId = null;
        } else {
          const folder = await this.resolveFolderPath(tx, data.folderPath);
          noteFolderId = folder?.id ?? null;
        }
      }

      const updated = await tx.entry.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.contentJson !== undefined && {
            contentJson: data.contentJson as Prisma.InputJsonValue,
          }),
          ...(data.plainText !== undefined && { plainText: data.plainText }),
          ...(data.wordCount !== undefined && { wordCount: data.wordCount }),
          ...(data.localDateTime !== undefined && { localDateTime: data.localDateTime }),
          ...(noteFolderId !== undefined && { noteFolderId }),
          ...(data.projectId !== undefined && { projectId: data.projectId }),
          ...(data.tagIds !== undefined && {
            tags: { set: data.tagIds.map((tagId) => ({ id: tagId })) },
          }),
        },
        include: ENTRY_INCLUDE,
      });

      await this.writeOutboxEvent(tx, updated, "diary.entry.updated", actorUserId);
      return toResponse(updated);
    });
  }

  // ── Access control helpers ───────────────────────────────────────

  private async assertReadAccess(entry: { id: string; ownerId: string | null }, userId: string): Promise<void> {
    if (entry.ownerId === userId) return;
    const access = await this.prisma.accessList.findUnique({
      where: { entryId_userId: { entryId: entry.id, userId } },
    });
    if (!access || access.permission === "write") {
      throw new ForbiddenException("Access denied");
    }
  }

  private async assertWriteAccess(entry: { id: string; ownerId: string | null }, userId: string): Promise<void> {
    if (entry.ownerId === userId) return;
    const access = await this.prisma.accessList.findUnique({
      where: { entryId_userId: { entryId: entry.id, userId } },
    });
    if (!access || access.permission === "read") {
      throw new ForbiddenException("Access denied");
    }
  }

  // ── Outbox helper ───────────────────────────────────────────────

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
        type: entry.type as "checkin" | "note",
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
          title: entry.title,
          contentJson: entry.contentJson,
          plainText: entry.plainText,
          wordCount: entry.wordCount,
          noteFolderId: entry.noteFolderId,
          noteFolderPath: entry.noteFolder?.path ?? null,
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

  async renameNoteFolder(input: RenameNoteFolderInput): Promise<NoteFolderResponse> {
    const normalized = normalizeFolderPath(input.path);
    if (!normalized) throw new BadRequestException("Folder path cannot be empty");

    const trimmedName = input.newName.trim();
    if (!trimmedName) throw new BadRequestException("New name cannot be empty");

    return this.prisma.$transaction(async (tx) => {
      const folder = await tx.noteFolder.findUnique({ where: { path: normalized } });
      if (!folder) throw new NotFoundException(`Folder '${normalized}' not found`);

      const segments = normalized.split("/");
      segments[segments.length - 1] = trimmedName;
      const newPath = segments.join("/");

      if (newPath === normalized) return toNoteFolderResponse(folder);

      const conflict = await tx.noteFolder.findUnique({ where: { path: newPath } });
      if (conflict) throw new BadRequestException(`A folder named '${trimmedName}' already exists here`);

      const descendants = await tx.noteFolder.findMany({
        where: { path: { startsWith: `${normalized}/` } },
      });

      for (const desc of descendants) {
        await tx.noteFolder.update({
          where: { id: desc.id },
          data: { path: newPath + desc.path.slice(normalized.length) },
        });
      }

      const updated = await tx.noteFolder.update({
        where: { id: folder.id },
        data: { name: trimmedName, path: newPath },
      });

      return toNoteFolderResponse(updated);
    });
  }

  private async resolveFolderPath(
    tx: TxClient,
    rawPath?: string,
  ): Promise<NoteFolder | null> {
    const normalized = normalizeFolderPath(rawPath);
    if (!normalized) return null;

    let parentId: string | null = null;
    let currentPath = "";
    let current: NoteFolder | null = null;

    for (const part of normalized.split("/")) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const existing = await tx.noteFolder.findUnique({ where: { path: currentPath } });
      if (existing) {
        current = existing;
        parentId = existing.id;
        continue;
      }

      current = await tx.noteFolder.create({
        data: {
          id: ulid(),
          name: part,
          path: currentPath,
          parentId,
        },
      });
      parentId = current.id;
    }

    return current;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function todayLocalDateTime(): string {
  return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

function toResponse(entry: EntryInclude): EntryResponse {
  return {
    id: entry.id,
    type: entry.type,
    localDateTime: entry.localDateTime,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    title: entry.title,
    contentJson: entry.contentJson,
    plainText: entry.plainText,
    wordCount: entry.wordCount,
    noteFolderId: entry.noteFolderId,
    noteFolderPath: entry.noteFolder?.path ?? null,
    projectId: entry.projectId ?? null,
    project: (entry.project ?? null) as EntryResponse["project"],
    tags: entry.tags ?? [],
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

function normalizeFolderPath(path?: string | null): string | null {
  if (!path) return null;
  const normalized = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
  return normalized.length > 0 ? normalized : null;
}

function toNoteFolderResponse(folder: NoteFolder): NoteFolderResponse {
  return {
    id: folder.id,
    name: folder.name,
    path: folder.path,
    parentId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}
