import { CreateEmotionSchema, UpdateEmotionSchema } from "@diary/shared";
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
import { EmotionsService } from "./emotions.service.js";

@Controller("emotions")
export class EmotionsController {
  constructor(@Inject(EmotionsService) private readonly emotions: EmotionsService) {}

  @Get()
  listEmotions(@Actor() actor: { userId: string }) {
    return this.emotions.listEmotions(actor.userId);
  }

  @Post()
  createEmotion(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateEmotionSchema.parse(body);
    return this.emotions.createEmotion(input, actor.userId);
  }

  @Patch(":id")
  updateEmotion(
    @Param("id") id: string,
    @Body() body: unknown,
    @Actor() actor: { userId: string },
  ) {
    const input = UpdateEmotionSchema.parse(body);
    return this.emotions.updateEmotion(id, input, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteEmotion(@Param("id") id: string, @Actor() actor: { userId: string }) {
    await this.emotions.deleteEmotion(id, actor.userId);
  }
}
