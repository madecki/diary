import { Controller, Get, Inject } from "@nestjs/common";
import { TriggersService } from "./triggers.service.js";

@Controller("triggers")
export class TriggersController {
  constructor(
    @Inject(TriggersService) private readonly triggers: TriggersService,
  ) {}

  @Get()
  listTriggers() {
    return this.triggers.listTriggers();
  }
}
