import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Entry, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { type InsightType, InsightsRepository } from "./insights.repository.js";
import { LlmClient } from "./llm-client.js";
import {
  type InsightPromptParts,
  buildDailyPrompt,
  buildWeeklyPrompt,
  hashInsightRequest,
} from "./prompt-templates.js";

const DEFAULT_MODEL = "qwen3.5:27b";
const DEFAULT_DEBOUNCE_MS = 5000;

export type InsightResponseDto = {
  id: string;
  type: InsightType;
  date: string;
  status: string;
  content: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type LatestInsightsResponse = {
  daily: InsightResponseDto | null;
  weekly: InsightResponseDto | null;
};

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private readonly debounceMs: number;
  private readonly model: string;
  private readonly regenerationTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(InsightsRepository) private readonly insights: InsightsRepository,
    @Inject(LlmClient) private readonly llm: LlmClient,
  ) {
    this.debounceMs = Number(process.env.INSIGHT_DEBOUNCE_MS ?? DEFAULT_DEBOUNCE_MS);
    this.model = process.env.DIARY_INSIGHT_MODEL ?? DEFAULT_MODEL;
  }

  scheduleRegeneration(ownerId: string): void {
    const existing = this.regenerationTimers.get(ownerId);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.regenerationTimers.delete(ownerId);
      void this.regenerateInsights(ownerId).catch((err: unknown) => {
        this.logger.error(`Insight regeneration failed for ${ownerId}`, err);
      });
    }, this.debounceMs);
    this.regenerationTimers.set(ownerId, timer);
  }

  private entryAccessWhere(ownerId: string): Prisma.EntryWhereInput {
    return {
      OR: [
        { ownerId },
        {
          accessList: {
            some: { userId: ownerId, permission: { in: ["read", "both"] } },
          },
        },
      ],
    };
  }

  private async fetchEntriesInLocalRange(
    ownerId: string,
    startDate: string,
    endDate: string,
  ): Promise<Entry[]> {
    const start = `${startDate}T00:00`;
    const end = `${endDate}T23:59`;
    return this.prisma.entry.findMany({
      where: {
        AND: [
          { localDateTime: { gte: start } },
          { localDateTime: { lte: end } },
          this.entryAccessWhere(ownerId),
        ],
      },
      orderBy: [{ localDateTime: "desc" }, { id: "desc" }],
    });
  }

  private utcTodayParts(): { todayStr: string; weekStartStr: string } {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const today = new Date(Date.UTC(y, m, d));
    const weekStart = new Date(Date.UTC(y, m, d - 6));
    const todayStr = today.toISOString().slice(0, 10);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    return { todayStr, weekStartStr };
  }

  async regenerateInsights(ownerId: string): Promise<void> {
    await this.insights.cancelPendingForOwner(ownerId);

    const { todayStr, weekStartStr } = this.utcTodayParts();

    const [todayEntries, weekEntries] = await Promise.all([
      this.fetchEntriesInLocalRange(ownerId, todayStr, todayStr),
      this.fetchEntriesInLocalRange(ownerId, weekStartStr, todayStr),
    ]);

    const jobs: Array<{ type: InsightType; date: string; parts: InsightPromptParts }> = [];

    if (todayEntries.length > 0) {
      const parts = buildDailyPrompt(todayEntries);
      if (parts.userPrompt !== "[]") {
        jobs.push({ type: "daily", date: todayStr, parts });
      }
    }

    if (weekEntries.length > 0) {
      const parts = buildWeeklyPrompt(weekEntries);
      if (parts.userPrompt !== "[]") {
        jobs.push({ type: "weekly", date: todayStr, parts });
      }
    }

    for (const job of jobs) {
      try {
        const promptHash = hashInsightRequest(job.parts);
        const created = await this.llm.createJob({
          model: this.model,
          prompt: job.parts.userPrompt,
          systemPrompt: job.parts.systemPrompt,
          callerMeta: { insightType: job.type, date: job.date },
        });
        await this.insights.create({
          ownerId,
          type: job.type,
          date: job.date,
          jobId: created.jobId,
          promptHash,
        });
      } catch (err) {
        this.logger.error(`Failed to enqueue ${job.type} insight for owner ${ownerId}`, err);
      }
    }
  }

  private toDto(row: {
    id: string;
    type: string;
    date: string;
    status: string;
    content: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): InsightResponseDto {
    return {
      id: row.id,
      type: row.type as InsightType,
      date: row.date,
      status: row.status,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }

  private async syncFromLlmIfNeeded(row: {
    id: string;
    ownerId: string;
    type: string;
    date: string;
    jobId: string;
    status: string;
    content: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): Promise<typeof row> {
    if (row.status === "cancelled") {
      return row;
    }
    if (row.status !== "pending" && row.status !== "processing") {
      return row;
    }

    let current = row;

    try {
      const job = await this.llm.getJob(row.jobId);
      if (job.status === "processing" && current.status === "pending") {
        await this.insights.markProcessing(row.jobId);
        current = { ...current, status: "processing" };
      }
      if (job.status === "completed") {
        await this.insights.updateStatusAndContent({
          jobId: row.jobId,
          status: "completed",
          content: job.response ?? "",
          completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
        });
        return {
          ...current,
          status: "completed",
          content: job.response ?? "",
          completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
        };
      }
      if (job.status === "failed") {
        await this.insights.updateStatusAndContent({
          jobId: row.jobId,
          status: "failed",
          content: null,
          completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
        });
        return {
          ...current,
          status: "failed",
          content: null,
          completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
        };
      }
    } catch (err) {
      this.logger.warn(`Lazy-sync failed for job ${row.jobId}`, err);
    }

    return current;
  }

  async getLatestInsights(ownerId: string): Promise<LatestInsightsResponse> {
    const [dailyRow, weeklyRow] = await Promise.all([
      this.insights.findLatestByType(ownerId, "daily"),
      this.insights.findLatestByType(ownerId, "weekly"),
    ]);

    const daily = dailyRow ? await this.syncFromLlmIfNeeded(dailyRow) : null;
    const weekly = weeklyRow ? await this.syncFromLlmIfNeeded(weeklyRow) : null;

    return {
      daily: daily ? this.toDto(daily) : null,
      weekly: weekly ? this.toDto(weekly) : null,
    };
  }

  async getInsightById(ownerId: string, id: string): Promise<InsightResponseDto> {
    const row = await this.insights.findById(ownerId, id);
    if (!row) {
      throw new NotFoundException(`Insight ${id} not found`);
    }
    const synced = await this.syncFromLlmIfNeeded(row);
    return this.toDto(synced);
  }
}
