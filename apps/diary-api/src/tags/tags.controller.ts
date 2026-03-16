import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, HttpCode } from "@nestjs/common";
import { CreateTagSchema, UpdateTagSchema } from "@diary/shared";
import { TagsService } from "./tags.service.js";
import { Actor } from "../common/actor.decorator.js";

@Controller("tags")
export class TagsController {
  constructor(@Inject(TagsService) private readonly tags: TagsService) {}

  @Get()
  listTags(@Actor() actor: { userId: string }) {
    return this.tags.listTags(actor.userId);
  }

  @Post()
  createTag(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateTagSchema.parse(body);
    return this.tags.createTag(input, actor.userId);
  }

  @Patch(":id")
  updateTag(@Param("id") id: string, @Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = UpdateTagSchema.parse(body);
    return this.tags.updateTag(id, input, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteTag(@Param("id") id: string, @Actor() actor: { userId: string }) {
    await this.tags.deleteTag(id, actor.userId);
  }
}
