import { CreateCheckinSchema, ListEntriesQuerySchema } from "@diary/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Actor } from "../common/actor.decorator.js";
import { EntriesService } from "./entries.service.js";

@Controller("entries")
export class EntriesController {
  constructor(@Inject(EntriesService) private readonly entries: EntriesService) {}

  @Post("checkins")
  createCheckin(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateCheckinSchema.parse(body);
    return this.entries.createCheckin(input, actor.userId);
  }

  @Get()
  listEntries(@Query() query: unknown, @Actor() actor: { userId: string }) {
    const input = ListEntriesQuerySchema.parse(query);
    return this.entries.listEntries(input, actor.userId);
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
