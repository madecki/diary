import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, HttpCode } from "@nestjs/common";
import { CreateProjectSchema, UpdateProjectSchema } from "@diary/shared";
import { ProjectsService } from "./projects.service.js";
import { Actor } from "../common/actor.decorator.js";

@Controller("projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Get()
  listProjects(@Actor() actor: { userId: string }) {
    return this.projects.listProjects(actor.userId);
  }

  @Post()
  createProject(@Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = CreateProjectSchema.parse(body);
    return this.projects.createProject(input, actor.userId);
  }

  @Patch(":id")
  updateProject(@Param("id") id: string, @Body() body: unknown, @Actor() actor: { userId: string }) {
    const input = UpdateProjectSchema.parse(body);
    return this.projects.updateProject(id, input, actor.userId);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteProject(@Param("id") id: string, @Actor() actor: { userId: string }) {
    await this.projects.deleteProject(id, actor.userId);
  }
}
