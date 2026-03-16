import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { ulid } from "ulidx";
import type { CreateTagInput, UpdateTagInput } from "@diary/shared";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class TagsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listTags(actorUserId: string) {
    return this.prisma.tag.findMany({ where: { ownerId: actorUserId }, orderBy: { name: "asc" } });
  }

  async createTag(input: CreateTagInput, actorUserId: string) {
    const existing = await this.prisma.tag.findUnique({
      where: { ownerId_name: { ownerId: actorUserId, name: input.name } },
    });
    if (existing) throw new ConflictException(`Tag "${input.name}" already exists`);
    return this.prisma.tag.create({ data: { id: ulid(), ownerId: actorUserId, name: input.name } });
  }

  async updateTag(id: string, input: UpdateTagInput, actorUserId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag not found`);
    if (tag.ownerId !== actorUserId) throw new NotFoundException(`Tag not found`);

    if (input.name !== tag.name) {
      const conflict = await this.prisma.tag.findUnique({
        where: { ownerId_name: { ownerId: actorUserId, name: input.name } },
      });
      if (conflict) throw new ConflictException(`Tag "${input.name}" already exists`);
    }

    return this.prisma.tag.update({ where: { id }, data: { name: input.name } });
  }

  async deleteTag(id: string, actorUserId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag not found`);
    if (tag.ownerId !== actorUserId) throw new NotFoundException(`Tag not found`);
    await this.prisma.tag.delete({ where: { id } });
  }
}
