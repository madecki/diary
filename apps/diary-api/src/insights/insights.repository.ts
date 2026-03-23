import { Inject, Injectable } from "@nestjs/common";
import type { InsightRecord } from "@prisma/client";
import { ulid } from "ulidx";
import { PrismaService } from "../prisma/prisma.service.js";

export type InsightType = "daily" | "weekly";

const ACTIVE_STATUSES = ["pending", "processing"] as const;

@Injectable()
export class InsightsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async cancelPendingForOwner(ownerId: string): Promise<void> {
    await this.prisma.insightRecord.updateMany({
      where: {
        ownerId,
        status: { in: [...ACTIVE_STATUSES] },
      },
      data: { status: "cancelled" },
    });
  }

  async create(params: {
    ownerId: string;
    type: InsightType;
    date: string;
    jobId: string;
    promptHash?: string | null;
  }): Promise<InsightRecord> {
    return this.prisma.insightRecord.create({
      data: {
        id: ulid(),
        ownerId: params.ownerId,
        type: params.type,
        date: params.date,
        jobId: params.jobId,
        status: "pending",
        promptHash: params.promptHash ?? null,
      },
    });
  }

  async findLatestByType(ownerId: string, type: InsightType): Promise<InsightRecord | null> {
    return this.prisma.insightRecord.findFirst({
      where: { ownerId, type, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(ownerId: string, id: string): Promise<InsightRecord | null> {
    return this.prisma.insightRecord.findFirst({
      where: { id, ownerId },
    });
  }

  async findByJobId(jobId: string): Promise<InsightRecord | null> {
    return this.prisma.insightRecord.findFirst({
      where: { jobId },
    });
  }

  async updateStatusAndContent(params: {
    jobId: string;
    status: string;
    content?: string | null;
    completedAt?: Date | null;
  }): Promise<void> {
    await this.prisma.insightRecord.updateMany({
      where: { jobId: params.jobId, status: { not: "cancelled" } },
      data: {
        status: params.status,
        ...(params.content !== undefined && { content: params.content }),
        ...(params.completedAt !== undefined && { completedAt: params.completedAt }),
      },
    });
  }

  async markProcessing(jobId: string): Promise<void> {
    await this.prisma.insightRecord.updateMany({
      where: { jobId, status: "pending" },
      data: { status: "processing" },
    });
  }
}
