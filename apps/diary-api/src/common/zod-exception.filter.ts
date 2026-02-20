import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { ZodError } from "zod";

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ZodExceptionFilter.name);

  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    this.logger.warn(`Validation failed: ${exception.message}`);

    const body = {
      statusCode: 400,
      message: "Validation failed",
      errors: exception.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    };

    if (typeof response.status === "function") {
      response.status(400).send(body);
    } else if (typeof response.code === "function") {
      response.code(400).send(body);
    }
  }
}
