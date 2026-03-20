import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { ulid } from "ulidx";
import { DEFAULT_EMOTIONS, type CreateEmotionInput, type UpdateEmotionInput } from "@diary/shared";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class EmotionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listEmotions(actorUserId: string) {
    const count = await this.prisma.emotion.count({ where: { ownerId: actorUserId } });
    if (count === 0) {
      const data = DEFAULT_EMOTIONS.map((e) => ({
        id: `${actorUserId}_${e.idSuffix}`,
        ownerId: actorUserId,
        label: e.label,
        type: e.type,
      }));
      await this.prisma.emotion.createMany({ data, skipDuplicates: true });
    }

    const emotions = await this.prisma.emotion.findMany({
      where: { ownerId: actorUserId },
      orderBy: { label: "asc" },
    });
    const usageCounts = await this.getUsageCounts(emotions.map((e) => e.label), actorUserId);
    return emotions.map((e) => ({ ...e, usageCount: usageCounts[e.label] ?? 0 }));
  }

  async createEmotion(input: CreateEmotionInput, actorUserId: string) {
    const existing = await this.prisma.emotion.findUnique({
      where: { ownerId_label: { ownerId: actorUserId, label: input.label } },
    });
    if (existing) throw new ConflictException(`Emotion "${input.label}" already exists`);
    const emotion = await this.prisma.emotion.create({
      data: { id: ulid(), ownerId: actorUserId, label: input.label, type: input.type },
    });
    return { ...emotion, usageCount: 0 };
  }

  async updateEmotion(id: string, input: UpdateEmotionInput, actorUserId: string) {
    const emotion = await this.prisma.emotion.findUnique({ where: { id } });
    if (!emotion) throw new NotFoundException(`Emotion not found`);
    if (emotion.ownerId !== actorUserId) throw new NotFoundException(`Emotion not found`);

    if (input.label && input.label !== emotion.label) {
      const conflict = await this.prisma.emotion.findUnique({
        where: { ownerId_label: { ownerId: actorUserId, label: input.label } },
      });
      if (conflict) throw new ConflictException(`Emotion "${input.label}" already exists`);

      // Propagate label rename only to this user's check-ins
      await this.prisma.$executeRaw`
        UPDATE entries
        SET emotions = array_replace(emotions, ${emotion.label}, ${input.label})
        WHERE ${emotion.label} = ANY(emotions) AND "ownerId" = ${actorUserId}
      `;
    }

    const updated = await this.prisma.emotion.update({
      where: { id },
      data: {
        ...(input.label ? { label: input.label } : {}),
        ...(input.type ? { type: input.type } : {}),
      },
    });
    const usageCounts = await this.getUsageCounts([updated.label], actorUserId);
    return { ...updated, usageCount: usageCounts[updated.label] ?? 0 };
  }

  async deleteEmotion(id: string, actorUserId: string) {
    const emotion = await this.prisma.emotion.findUnique({ where: { id } });
    if (!emotion) throw new NotFoundException(`Emotion not found`);
    if (emotion.ownerId !== actorUserId) throw new NotFoundException(`Emotion not found`);

    const usageCount = await this.prisma.entry.count({
      where: { emotions: { has: emotion.label }, ownerId: actorUserId },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete: "${emotion.label}" is used in ${usageCount} check-in${usageCount === 1 ? "" : "s"}`,
      );
    }

    await this.prisma.emotion.delete({ where: { id } });
  }

  private async getUsageCounts(labels: string[], actorUserId: string): Promise<Record<string, number>> {
    if (labels.length === 0) return {};
    const result: Record<string, number> = {};
    await Promise.all(
      labels.map(async (label) => {
        result[label] = await this.prisma.entry.count({
          where: { emotions: { has: label }, ownerId: actorUserId },
        });
      }),
    );
    return result;
  }
}
