/**
 * Settings-service API (gateway `/settings/*`). Same cookie auth as diary `api.ts`.
 */
import type {
  CreateProjectInput,
  CreateTagInput,
  ProjectResponse,
  TagResponse,
  UpdateProjectInput,
  UpdateTagInput,
} from "@diary/shared";

const API_BASE = "/settings";
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
    const d = data as {
      message?: string;
      errors?: { message?: string }[];
      error?: { message?: string };
    } | null;
    const firstValidation = d?.errors?.[0]?.message;
    const message =
      firstValidation ||
      (typeof d?.message === "string" ? d.message : undefined) ||
      d?.error?.message;
    throw new Error(message || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function fetchProjects(): Promise<ProjectResponse[]> {
  return request("GET", "/projects");
}

export function createProject(input: CreateProjectInput): Promise<ProjectResponse> {
  return request("POST", "/projects", input);
}

export function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectResponse> {
  return request("PATCH", `/projects/${id}`, input);
}

export function deleteProject(id: string): Promise<void> {
  return request("DELETE", `/projects/${id}`);
}

export function fetchTags(): Promise<TagResponse[]> {
  return request("GET", "/tags");
}

export function createTag(input: CreateTagInput): Promise<TagResponse> {
  return request("POST", "/tags", input);
}

export function updateTag(id: string, input: UpdateTagInput): Promise<TagResponse> {
  return request("PATCH", `/tags/${id}`, input);
}

export function deleteTag(id: string): Promise<void> {
  return request("DELETE", `/tags/${id}`);
}
