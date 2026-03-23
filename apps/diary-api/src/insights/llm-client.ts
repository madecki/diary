import { Injectable } from "@nestjs/common";

const DEFAULT_LLM_URL = "http://localhost:4583";

export type LlmJobPublic = {
  jobId: string;
  callerService: string;
  model: string;
  status: "pending" | "processing" | "completed" | "failed";
  response: string | null;
  callerMeta: unknown;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  processingTimeMs: number | null;
};

export type CreateJobResult = {
  jobId: string;
  status: string;
  createdAt: string;
};

@Injectable()
export class LlmClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.LLM_SERVICE_URL ?? DEFAULT_LLM_URL).replace(/\/$/, "");
  }

  async createJob(input: {
    model: string;
    prompt: string;
    systemPrompt?: string;
    callerMeta?: Record<string, unknown>;
  }): Promise<CreateJobResult> {
    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callerService: "diary",
        model: input.model,
        prompt: input.prompt,
        ...(input.systemPrompt ? { systemPrompt: input.systemPrompt } : {}),
        ...(input.callerMeta ? { callerMeta: input.callerMeta } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`llm-service POST /jobs failed: ${res.status} ${text}`);
    }

    return res.json() as Promise<CreateJobResult>;
  }

  async getJob(jobId: string): Promise<LlmJobPublic> {
    const res = await fetch(`${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`llm-service GET /jobs/${jobId} failed: ${res.status} ${text}`);
    }

    return res.json() as Promise<LlmJobPublic>;
  }
}
