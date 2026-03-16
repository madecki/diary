import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export const Actor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): { userId: string } => {
    return ctx
      .switchToHttp()
      .getRequest<FastifyRequest>()
      .actor;
  },
);
