import { Module } from "@nestjs/common";
import { InsightsController } from "./insights.controller.js";
import { InsightsRepository } from "./insights.repository.js";
import { InsightsService } from "./insights.service.js";
import { LlmClient } from "./llm-client.js";
import { SettingsClient } from "./settings-client.js";

@Module({
  controllers: [InsightsController],
  providers: [InsightsService, InsightsRepository, LlmClient, SettingsClient],
  exports: [InsightsService],
})
export class InsightsModule {}
