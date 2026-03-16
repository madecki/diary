import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, HttpCode } from "@nestjs/common";
import { CreateTriggerSchema, UpdateTriggerSchema } from "@diary/shared";
import { TriggersService } from "./triggers.service.js";
import { Actor } from "../common/actor.decorator.js";

@Controller("triggers")
export class TriggersController {
  constructor(@Inject(TriggersService) private readonly triggers: TriggersService) {}

  @Get()
  listTriggers(@Actor() actor: { userId: string }) {
    return this.triggers.listTriggers(actor.userId);
  }

  @Post()
  createTrigger(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateTriggerSchema.parse(body);
    return this.triggers.createTrigger(input, actor.userId);
  }

  @Patch(":id")
  updateTrigger(@Param("id") id: string, @Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = UpdateTriggerSchema.parse(body);
    return this.triggers.updateTrigger(id, input, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteTrigger(@Param("id") id: string, @Actor() actor: { userId: string }) {
    await this.triggers.deleteTrigger(id, actor.userId);
  }
}
