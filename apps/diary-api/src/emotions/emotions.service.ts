import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class EmotionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listEmotions() {
    return this.prisma.emotion.findMany({ orderBy: { label: "asc" } });
  }
}
