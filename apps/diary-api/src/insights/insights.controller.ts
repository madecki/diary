import { Controller, Get, Inject, Param } from "@nestjs/common";
import { Actor } from "../common/actor.decorator.js";
import { InsightsService } from "./insights.service.js";

@Controller("insights")
export class InsightsController {
  constructor(@Inject(InsightsService) private readonly insights: InsightsService) {}

  @Get("latest")
  getLatest(@Actor() actor: { userId: string }) {
    return this.insights.getLatestInsights(actor.userId);
  }

  @Get(":id")
  getOne(@Param("id") id: string, @Actor() actor: { userId: string }) {
    return this.insights.getInsightById(actor.userId, id);
  }
}
