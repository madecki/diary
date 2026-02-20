import { Controller, Get, Post, Body, Query, Inject } from "@nestjs/common";
import { OutboxQuerySchema, ReplayBodySchema } from "@diary/shared";
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
