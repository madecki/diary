import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class TriggersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listTriggers() {
    return this.prisma.trigger.findMany({ orderBy: { label: "asc" } });
  }
}
