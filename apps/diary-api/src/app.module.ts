import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module.js";
import { EntriesModule } from "./entries/entries.module.js";
import { EventsModule } from "./events/events.module.js";
import { EmotionsModule } from "./emotions/emotions.module.js";
import { TriggersModule } from "./triggers/triggers.module.js";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware.js";

@Module({
  imports: [PrismaModule, EntriesModule, EventsModule, EmotionsModule, TriggersModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*path");
  }
}
