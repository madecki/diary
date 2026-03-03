import { Module } from "@nestjs/common";
import { TriggersController } from "./triggers.controller.js";
import { TriggersService } from "./triggers.service.js";

@Module({
  controllers: [TriggersController],
  providers: [TriggersService],
})
export class TriggersModule {}
