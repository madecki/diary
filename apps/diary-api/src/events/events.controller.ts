import { OutboxQuerySchema, ReplayBodySchema } from "@diary/shared";
import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { EventsService } from "./events.service.js";

@Controller("events")
export class EventsController {
  constructor(@Inject(EventsService) private readonly events: EventsService) {}

  @Get("outbox")
  getOutbox(@Query() query: unknown) {
    const input = OutboxQuerySchema.parse(query);
    return this.events.getOutbox(input);
  }

  @Post("replay")
  replay(@Body() body: unknown) {
    const input = ReplayBodySchema.parse(body);
    return this.events.replay(input);
  }
}
