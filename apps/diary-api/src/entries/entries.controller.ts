import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, HttpCode } from "@nestjs/common";
import {
  CreateCheckinSchema,
  CreateNoteSchema,
  CreateNoteFolderSchema,
  BrowseNotesQuerySchema,
  DeleteNoteFolderQuerySchema,
  RenameNoteFolderSchema,
  ListEntriesQuerySchema,
} from "@diary/shared";
import { EntriesService } from "./entries.service.js";
import { Actor } from "../common/actor.decorator.js";

@Controller("entries")
export class EntriesController {
  constructor(@Inject(EntriesService) private readonly entries: EntriesService) {}

  @Post("checkins")
  createCheckin(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateCheckinSchema.parse(body);
    return this.entries.createCheckin(input, actor.userId);
  }

  @Post("notes")
  createNote(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateNoteSchema.parse(body);
    return this.entries.createNote(input, actor.userId);
  }

  @Get()
  listEntries(@Query() query: unknown, @Actor() actor: { userId: string }) {
    const input = ListEntriesQuerySchema.parse(query);
    return this.entries.listEntries(input, actor.userId);
  }

  @Get("note-folders")
  listNoteFolders() {
    return this.entries.listNoteFolders();
  }

  @Get("notes/browse")
  browseNotes(@Query() query: unknown) {
    const input = BrowseNotesQuerySchema.parse(query);
    return this.entries.browseNotes(input.path);
  }

  @Post("note-folders")
  createNoteFolder(@Body() body: unknown) {
    const input = CreateNoteFolderSchema.parse(body);
    return this.entries.createNoteFolder(input);
  }

  @Patch("note-folders")
  renameNoteFolder(@Body() body: unknown) {
    const input = RenameNoteFolderSchema.parse(body);
    return this.entries.renameNoteFolder(input);
  }

  @Delete("note-folders")
  @HttpCode(204)
  async deleteNoteFolder(@Query() query: unknown) {
    const input = DeleteNoteFolderQuerySchema.parse(query);
    await this.entries.deleteNoteFolder(input.path, input.force);
  }

  @Get(":id")
  getEntry(@Param("id") id: string, @Actor() actor: { userId: string }) {
    return this.entries.getEntry(id, actor.userId);
  }

  @Patch(":id")
  updateEntry(@Param("id") id: string, @Body() body: unknown, @Actor() actor: { userId: string }) {
    return this.entries.updateEntry(id, body, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  deleteEntry(@Param("id") id: string, @Actor() actor: { userId: string }) {
    return this.entries.deleteEntry(id, actor.userId);
  }
}
