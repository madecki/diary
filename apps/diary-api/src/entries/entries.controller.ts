import { Controller, Get, Post, Patch, Body, Param, Query, Inject } from "@nestjs/common";
import {
  CreateCheckinSchema,
  CreateShortNoteSchema,
  ListEntriesQuerySchema,
} from "@diary/shared";
import { EntriesService } from "./entries.service.js";

@Controller("entries")
export class EntriesController {
  constructor(@Inject(EntriesService) private readonly entries: EntriesService) {}

  @Post("checkins")
  createCheckin(@Body() body: unknown) {
    const input = CreateCheckinSchema.parse(body);
    return this.entries.createCheckin(input);
  }

  @Post("short-notes")
  createShortNote(@Body() body: unknown) {
    const input = CreateShortNoteSchema.parse(body);
    return this.entries.createShortNote(input);
  }

  @Get()
  listEntries(@Query() query: unknown) {
    const input = ListEntriesQuerySchema.parse(query);
    return this.entries.listEntries(input);
  }

  @Get(":id")
  getEntry(@Param("id") id: string) {
    return this.entries.getEntry(id);
  }

  @Patch(":id")
  updateEntry(@Param("id") id: string, @Body() body: unknown) {
    return this.entries.updateEntry(id, body);
  }
}
