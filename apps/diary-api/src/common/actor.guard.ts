import * as crypto from "crypto";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    actor: { userId: string };
  }
}

/**
 * Validates every incoming request:
 * 1. x-service-token must match GATEWAY_SERVICE_TOKEN (required) — ensures the
 *    request came through the gateway, preventing header forgery on the open port.
 * 2. x-user-id must be present — set by the gateway after JWT verification.
 *
 * Local development: set GATEWAY_SERVICE_TOKEN in both gateway and diary-api to
 * the same random string (min 32 chars).
 */
@Injectable()
export class ActorGuard implements CanActivate {
  private readonly serviceToken: string;

  constructor() {
    const token = process.env.GATEWAY_SERVICE_TOKEN;
    if (!token || token.length < 32) {
      throw new Error(
        "GATEWAY_SERVICE_TOKEN must be set and at least 32 characters. " +
          "Set the same value as DIARY_SERVICE_TOKEN in the gateway.",
      );
    }
    this.serviceToken = token;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const incoming = request.headers["x-service-token"];
    if (
      typeof incoming !== "string" ||
      !incoming ||
      !timingSafeEqual(incoming, this.serviceToken)
    ) {
      throw new UnauthorizedException("Invalid service token");
    }

    const userId = request.headers["x-user-id"];
    if (!userId || Array.isArray(userId)) {
      throw new UnauthorizedException("Missing actor identity");
    }

    request.actor = { userId };
    return true;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
