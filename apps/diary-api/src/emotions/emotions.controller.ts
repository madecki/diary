import { Controller, Get, Inject } from "@nestjs/common";
import { EmotionsService } from "./emotions.service.js";

@Controller("emotions")
export class EmotionsController {
  constructor(
    @Inject(EmotionsService) private readonly emotions: EmotionsService,
  ) {}

  @Get()
  listEmotions() {
    return this.emotions.listEmotions();
  }
}
