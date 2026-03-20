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
  EntryResponse,
  ListEntriesResponse,
  BrowseNotesResponse,
  CreateCheckinInput,
  CreateNoteInput,
  UpdateCheckinInput,
  UpdateNoteInput,
  EmotionResponse,
  TriggerResponse,
  ProjectResponse,
  TagResponse,
  CreateEmotionInput,
  UpdateEmotionInput,
  CreateTriggerInput,
  UpdateTriggerInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTagInput,
  UpdateTagInput,
} from "@diary/shared";

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
  // When running inside the shell's iframe, navigate the top frame to /login
  // so the whole app goes to the login page, not just the iframe.
  // ?expired=1 tells the login page to skip its "already authenticated" redirect
  // so we don't loop back to the app before cookies have been fully cleared.
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

// ── Entries ────────────────────────────────────────────────────────

export function fetchEntries(params: {
  limit?: number;
  cursor?: string;
  type?: string;
}): Promise<ListEntriesResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.type) qs.set("type", params.type);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request("GET", `/entries${query}`);
}

export function fetchEntry(id: string): Promise<EntryResponse> {
  return request("GET", `/entries/${id}`);
}

export function createCheckin(input: CreateCheckinInput): Promise<EntryResponse> {
  return request("POST", "/entries/checkins", input);
}

export function createNote(input: CreateNoteInput): Promise<EntryResponse> {
  return request("POST", "/entries/notes", input);
}

export function updateEntry(id: string, input: UpdateCheckinInput | UpdateNoteInput): Promise<EntryResponse> {
  return request("PATCH", `/entries/${id}`, input);
}

export function deleteEntry(id: string): Promise<void> {
  return request("DELETE", `/entries/${id}`);
}

// ── Note folders ───────────────────────────────────────────────────

export function browseNotes(path?: string | null): Promise<BrowseNotesResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return request("GET", `/entries/notes/browse${query}`);
}

export function createNoteFolder(input: { path: string }): Promise<{ id: string; path: string }> {
  return request("POST", "/entries/note-folders", input);
}

export function renameNoteFolder(input: { path: string; newName: string }): Promise<{ id: string; path: string }> {
  return request("PATCH", "/entries/note-folders", input);
}

export function deleteNoteFolder(path: string, force?: boolean): Promise<void> {
  const params = new URLSearchParams({ path });
  if (force) params.set("force", "true");
  return request("DELETE", `/entries/note-folders?${params.toString()}`);
}

// ── Emotions ───────────────────────────────────────────────────────

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

// ── Triggers ───────────────────────────────────────────────────────

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

// ── Projects ───────────────────────────────────────────────────────

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

// ── Tags ───────────────────────────────────────────────────────────

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
