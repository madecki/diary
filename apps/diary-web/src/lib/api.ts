import type {
  ListEntriesResponse,
  EntryResponse,
  CreateCheckinInput,
  CreateShortNoteInput,
  UpdateCheckinInput,
  UpdateShortNoteInput,
  EmotionResponse,
  TriggerResponse,
} from "@diary/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4281";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ??
        `Request failed: ${res.status} ${res.statusText}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchEntries(params?: {
  cursor?: string;
  limit?: number;
  type?: string;
}): Promise<ListEntriesResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  query.set("limit", String(params?.limit ?? 20));
  if (params?.type) query.set("type", params.type);
  return request(`/entries?${query}`);
}

export function fetchEntry(id: string): Promise<EntryResponse> {
  return request(`/entries/${id}`);
}

export function createCheckin(data: CreateCheckinInput): Promise<EntryResponse> {
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
  data: UpdateCheckinInput | UpdateShortNoteInput,
): Promise<EntryResponse> {
  return request(`/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteEntry(id: string): Promise<void> {
  return request(`/entries/${id}`, { method: "DELETE" });
}

export function fetchEmotions(): Promise<EmotionResponse[]> {
  return request("/emotions");
}

export function fetchTriggers(): Promise<TriggerResponse[]> {
  return request("/triggers");
}
