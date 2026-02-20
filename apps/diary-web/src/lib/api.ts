import type {
  ListEntriesResponse,
  EntryResponse,
  CreateCheckinInput,
  CreateShortNoteInput,
} from "@diary/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4281";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.message ?? `Request failed: ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchEntries(
  cursor?: string,
  limit = 20,
  type?: string,
): Promise<ListEntriesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  if (type) params.set("type", type);
  return request(`/entries?${params}`);
}

export function fetchEntry(id: string): Promise<EntryResponse> {
  return request(`/entries/${id}`);
}

export function createCheckin(
  data: CreateCheckinInput,
): Promise<EntryResponse> {
  return request("/entries/checkins", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createShortNote(
  data: CreateShortNoteInput,
): Promise<EntryResponse> {
  return request("/entries/short-notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEntry(
  id: string,
  data: Record<string, unknown>,
): Promise<EntryResponse> {
  return request(`/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
