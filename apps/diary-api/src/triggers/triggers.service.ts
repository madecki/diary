import { type CreateTriggerInput, DEFAULT_TRIGGERS, type UpdateTriggerInput } from "@diary/shared";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ulid } from "ulidx";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class TriggersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listTriggers(actorUserId: string) {
    const count = await this.prisma.trigger.count({ where: { ownerId: actorUserId } });
    if (count === 0) {
      const data = DEFAULT_TRIGGERS.map((t) => ({
        id: `${actorUserId}_${t.idSuffix}`,
        ownerId: actorUserId,
        label: t.label,
        type: t.type,
      }));
      await this.prisma.trigger.createMany({ data, skipDuplicates: true });
    }

    const triggers = await this.prisma.trigger.findMany({
      where: { ownerId: actorUserId },
      orderBy: { label: "asc" },
    });
    const usageCounts = await this.getUsageCounts(
      triggers.map((t) => t.label),
      actorUserId,
    );
    return triggers.map((t) => ({ ...t, usageCount: usageCounts[t.label] ?? 0 }));
  }

  async createTrigger(input: CreateTriggerInput, actorUserId: string) {
    const existing = await this.prisma.trigger.findUnique({
      where: { ownerId_label: { ownerId: actorUserId, label: input.label } },
    });
    if (existing) throw new ConflictException(`Trigger "${input.label}" already exists`);
    const trigger = await this.prisma.trigger.create({
      data: { id: ulid(), ownerId: actorUserId, label: input.label, type: input.type },
    });
    return { ...trigger, usageCount: 0 };
  }

  async updateTrigger(id: string, input: UpdateTriggerInput, actorUserId: string) {
    const trigger = await this.prisma.trigger.findUnique({ where: { id } });
    if (!trigger) throw new NotFoundException(`Trigger not found`);
    if (trigger.ownerId !== actorUserId) throw new NotFoundException(`Trigger not found`);

    if (input.label && input.label !== trigger.label) {
      const conflict = await this.prisma.trigger.findUnique({
        where: { ownerId_label: { ownerId: actorUserId, label: input.label } },
      });
      if (conflict) throw new ConflictException(`Trigger "${input.label}" already exists`);

      // Propagate label rename only to this user's check-ins
      await this.prisma.$executeRaw`
        UPDATE entries
        SET triggers = array_replace(triggers, ${trigger.label}, ${input.label})
        WHERE ${trigger.label} = ANY(triggers) AND "ownerId" = ${actorUserId}
      `;
    }

    const updated = await this.prisma.trigger.update({
      where: { id },
      data: {
        ...(input.label ? { label: input.label } : {}),
        ...(input.type ? { type: input.type } : {}),
      },
    });
    const usageCounts = await this.getUsageCounts([updated.label], actorUserId);
    return { ...updated, usageCount: usageCounts[updated.label] ?? 0 };
  }

  async deleteTrigger(id: string, actorUserId: string) {
    const trigger = await this.prisma.trigger.findUnique({ where: { id } });
    if (!trigger) throw new NotFoundException(`Trigger not found`);
    if (trigger.ownerId !== actorUserId) throw new NotFoundException(`Trigger not found`);

    const usageCount = await this.prisma.entry.count({
      where: { triggers: { has: trigger.label }, ownerId: actorUserId },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete: "${trigger.label}" is used in ${usageCount} check-in${usageCount === 1 ? "" : "s"}`,
      );
    }

    await this.prisma.trigger.delete({ where: { id } });
  }

  private async getUsageCounts(
    labels: string[],
    actorUserId: string,
  ): Promise<Record<string, number>> {
    if (labels.length === 0) return {};
    const result: Record<string, number> = {};
    await Promise.all(
      labels.map(async (label) => {
        result[label] = await this.prisma.entry.count({
          where: { triggers: { has: label }, ownerId: actorUserId },
        });
      }),
    );
    return result;
  }
}
