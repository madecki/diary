import { Injectable, NestMiddleware } from "@nestjs/common";
import { ulid } from "ulidx";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const correlationId = (req.headers?.["x-correlation-id"] as string) ?? ulid();
    req.headers["x-correlation-id"] = correlationId;

    if (typeof res.setHeader === "function") {
      res.setHeader("x-correlation-id", correlationId);
    } else if (typeof res.header === "function") {
      res.header("x-correlation-id", correlationId);
    }

    next();
  }
}
