import { Module } from "@nestjs/common";
import { InsightsModule } from "../insights/insights.module.js";
import { EntriesController } from "./entries.controller.js";
import { EntriesService } from "./entries.service.js";

@Module({
  imports: [InsightsModule],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
