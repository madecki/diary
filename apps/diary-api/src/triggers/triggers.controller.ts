import { CreateTriggerSchema, UpdateTriggerSchema } from "@diary/shared";
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
} from "@nestjs/common";
import { Actor } from "../common/actor.decorator.js";
import { TriggersService } from "./triggers.service.js";

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
  updateTrigger(
    @Param("id") id: string,
    @Body() body: unknown,
    @Actor() actor: { userId: string },
  ) {
    const input = UpdateTriggerSchema.parse(body);
    return this.triggers.updateTrigger(id, input, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteTrigger(@Param("id") id: string, @Actor() actor: { userId: string }) {
    await this.triggers.deleteTrigger(id, actor.userId);
  }
}
