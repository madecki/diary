import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { ZodExceptionFilter } from "./common/zod-exception.filter.js";
import { ActorGuard } from "./common/actor.guard.js";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalFilters(new ZodExceptionFilter());
  app.useGlobalGuards(new ActorGuard());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = Number(process.env.PORT ?? 4281);
  await app.listen(port, "0.0.0.0");
  console.log(`diary-api listening on http://localhost:${port}`);
}

bootstrap();
