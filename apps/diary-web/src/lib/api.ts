/**
 * Diary-web API client.
 *
 * Authentication is cookie-based. The browser automatically sends the httpOnly
 * `access_token` cookie set by the gateway on every same-origin request.
 * This module never reads or stores JWT strings.
 *
 * When the access token expires, the client transparently refreshes it once
 * and retries the original request. If the refresh also fails, the user is
 * redirected to /login (the shell login page, served through the gateway).
 */
import type {
  CreateCheckinInput,
  CreateEmotionInput,
  CreateTriggerInput,
  EmotionResponse,
  EntryResponse,
  ListEntriesResponse,
  TriggerResponse,
  UpdateCheckinInput,
  UpdateEmotionInput,
  UpdateTriggerInput,
} from "@diary/shared";

export type InsightResponse = {
  id: string;
  type: "daily" | "weekly";
  date: string;
  status: string;
  content: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type LatestInsightsResponse = {
  daily: InsightResponse | null;
  weekly: InsightResponse | null;
};

const API_BASE = "/diary";
const LOGIN_PATH = "/login";
const REFRESH_PATH = "/auth/v1/auth/refresh";

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = fetch(REFRESH_PATH, { method: "POST" }).then((r) => r.ok);
  const ok = await refreshing;
  refreshing = null;
  return ok;
}

function redirectToLogin(): void {
  const target = window !== window.top ? window.top : window;
  (target ?? window).location.href = `${LOGIN_PATH}?expired=1`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetry = false,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(method, path, body, true);
    }
    redirectToLogin();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new Error(message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function fetchEntries(params: {
  limit?: number;
  cursor?: string;
}): Promise<ListEntriesResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request("GET", `/entries${query}`);
}

export function fetchEntry(id: string): Promise<EntryResponse> {
  return request("GET", `/entries/${id}`);
}

export function createCheckin(input: CreateCheckinInput): Promise<EntryResponse> {
  return request("POST", "/entries/checkins", input);
}

export function updateEntry(id: string, input: UpdateCheckinInput): Promise<EntryResponse> {
  return request("PATCH", `/entries/${id}`, input);
}

export function deleteEntry(id: string): Promise<void> {
  return request("DELETE", `/entries/${id}`);
}

export function fetchLatestInsights(): Promise<LatestInsightsResponse> {
  return request("GET", "/insights/latest");
}

export function fetchInsight(id: string): Promise<InsightResponse> {
  return request("GET", `/insights/${id}`);
}

export function fetchEmotions(): Promise<EmotionResponse[]> {
  return request("GET", "/emotions");
}

export function createEmotion(input: CreateEmotionInput): Promise<EmotionResponse> {
  return request("POST", "/emotions", input);
}

export function updateEmotion(id: string, input: UpdateEmotionInput): Promise<EmotionResponse> {
  return request("PATCH", `/emotions/${id}`, input);
}

export function deleteEmotion(id: string): Promise<void> {
  return request("DELETE", `/emotions/${id}`);
}

export function fetchTriggers(): Promise<TriggerResponse[]> {
  return request("GET", "/triggers");
}

export function createTrigger(input: CreateTriggerInput): Promise<TriggerResponse> {
  return request("POST", "/triggers", input);
}

export function updateTrigger(id: string, input: UpdateTriggerInput): Promise<TriggerResponse> {
  return request("PATCH", `/triggers/${id}`, input);
}

export function deleteTrigger(id: string): Promise<void> {
  return request("DELETE", `/triggers/${id}`);
}
