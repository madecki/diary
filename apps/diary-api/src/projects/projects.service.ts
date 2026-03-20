import { Injectable, Inject, NotFoundException, ConflictException } from "@nestjs/common";
import { ulid } from "ulidx";
import type { CreateProjectInput, UpdateProjectInput } from "@diary/shared";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ProjectsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listProjects(actorUserId: string) {
    return this.prisma.project.findMany({ where: { ownerId: actorUserId }, orderBy: { name: "asc" } });
  }

  async createProject(input: CreateProjectInput, actorUserId: string) {
    const existing = await this.prisma.project.findUnique({
      where: { ownerId_name: { ownerId: actorUserId, name: input.name } },
    });
    if (existing) throw new ConflictException(`Project "${input.name}" already exists`);
    return this.prisma.project.create({
      data: {
        id: ulid(),
        ownerId: actorUserId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? "primary",
      },
    });
  }

  async updateProject(id: string, input: UpdateProjectInput, actorUserId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project not found`);
    if (project.ownerId !== actorUserId) throw new NotFoundException(`Project not found`);

    if (input.name && input.name !== project.name) {
      const conflict = await this.prisma.project.findUnique({
        where: { ownerId_name: { ownerId: actorUserId, name: input.name } },
      });
      if (conflict) throw new ConflictException(`Project "${input.name}" already exists`);
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  }

  async deleteProject(id: string, actorUserId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException(`Project not found`);
    if (project.ownerId !== actorUserId) throw new NotFoundException(`Project not found`);
    await this.prisma.project.delete({ where: { id } });
  }
}
