import { test, expect } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { resetDatabase } from "../db";

/**
 * Direct API tests — exercise diary-api independently of the frontend.
 * These run in the same E2E suite because they require the full stack
 * (Postgres + NATS + diary-api) to be running.
 */

test.beforeEach(async () => {
  await resetDatabase();
});

test.describe("API – GET /entries", () => {
  test("returns 200 with entries array and nextCursor", async ({ request }) => {
    const res = await request.get(`${API_URL}/entries`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("entries");
    expect(body).toHaveProperty("nextCursor");
    expect(Array.isArray(body.entries)).toBe(true);
  });

  test("accepts limit and type query params", async ({ request }) => {
    const res = await request.get(`${API_URL}/entries?limit=5&type=checkin`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    for (const entry of body.entries) {
      expect(entry.type).toBe("checkin");
    }
    expect(body.entries.length).toBeLessThanOrEqual(5);
  });
});

test.describe("API – POST /entries/checkins", () => {
  test("creates a morning check-in and returns the entry", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 8,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Good health", "Great friends", ""],
        whatWouldMakeDayGreat: ["Finish the feature", "", ""],
        dailyAffirmation: "I am focused and productive",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    expect(entry.id).toBeTruthy();
    expect(entry.type).toBe("checkin");
    expect(entry.checkInType).toBe("morning");
    expect(entry.mood).toBe(8);
    expect(entry.emotions).toEqual(["happy"]);
    expect(entry.triggers).toEqual(["exercise"]);
    expect(entry.whatImGratefulFor).toEqual(["Good health", "Great friends", ""]);
    expect(entry.whatWouldMakeDayGreat).toEqual(["Finish the feature", "", ""]);
    expect(entry.dailyAffirmation).toBe("I am focused and productive");
    expect(entry.highlightsOfTheDay).toEqual([]);
    expect(entry.whatDidILearnToday).toBeNull();
  });

  test("creates an evening check-in and returns the entry", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "evening",
        mood: 6,
        emotions: ["calm"],
        triggers: ["music"],
        highlightsOfTheDay: ["Completed the project", "", ""],
        whatDidILearnToday: "Small steps lead to big results",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    expect(entry.type).toBe("checkin");
    expect(entry.checkInType).toBe("evening");
    expect(entry.mood).toBe(6);
    expect(entry.emotions).toEqual(["calm"]);
    expect(entry.triggers).toEqual(["music"]);
    expect(entry.highlightsOfTheDay).toEqual(["Completed the project", "", ""]);
    expect(entry.whatDidILearnToday).toBe("Small steps lead to big results");
    expect(entry.whatImGratefulFor).toEqual([]);
    expect(entry.dailyAffirmation).toBeNull();
  });

  test("returns 400 for missing required fields on morning check-in", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: { checkInType: "morning" },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when all three gratitude inputs are empty", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["", "", ""],
        whatWouldMakeDayGreat: ["Something", "", ""],
        dailyAffirmation: "I am great",
        localDateTime: "2026-01-01T08:00",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when dailyAffirmation is blank", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "   ",
        localDateTime: "2026-01-01T08:00",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when mood is missing", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "I am great",
        localDateTime: "2026-01-01T08:00",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 when emotions array is empty", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: [],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "I am great",
        localDateTime: "2026-01-01T08:00",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("returns 400 for missing checkInType", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "I am great",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("response does not contain reflections field", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "I am great",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const entry = await res.json();
    expect(entry).not.toHaveProperty("reflections");
  });
});

test.describe("API – POST /entries/notes", () => {
  test("creates a note and returns the full entry", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "Quick API test note.",
        wordCount: 4,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    expect(entry.id).toBeTruthy();
    expect(entry.type).toBe("note");
    expect(entry.plainText).toBe("Quick API test note.");
    expect(entry.checkInType).toBeNull();
  });

  test("creates a note with optional title", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "API Test Title",
        contentJson: { blocks: [] },
        plainText: "Note with a title.",
        wordCount: 4,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();
    expect(entry.title).toBe("API Test Title");
  });

  test("creates nested folders when folderPath is passed", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Nested path note",
        contentJson: { blocks: [] },
        plainText: "with folders",
        wordCount: 2,
        folderPath: "work/blabla/another folder",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();
    expect(entry.noteFolderPath).toBe("work/blabla/another folder");
    expect(entry.checkInType).toBeNull();
  });

  test("creating check-in remains unaffected by note folders", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 8,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["One", "", ""],
        whatWouldMakeDayGreat: ["Two", "", ""],
        dailyAffirmation: "Three",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();
    expect(entry.type).toBe("checkin");
    expect(entry.noteFolderId).toBeNull();
    expect(entry.noteFolderPath).toBeNull();
  });
});

test.describe("API – note folders", () => {
  test("creates and lists nested note folders", async ({ request }) => {
    const create = await request.post(`${API_URL}/entries/note-folders`, {
      data: { path: "work/blabla/another_folder" },
    });
    expect(create.status()).toBe(201);
    const created = await create.json();
    expect(created.path).toBe("work/blabla/another_folder");

    const list = await request.get(`${API_URL}/entries/note-folders`);
    expect(list.status()).toBe(200);
    const folders = (await list.json()) as Array<{ path: string }>;
    expect(folders.some((f) => f.path === "work")).toBe(true);
    expect(folders.some((f) => f.path === "work/blabla")).toBe(true);
    expect(folders.some((f) => f.path === "work/blabla/another_folder")).toBe(true);
  });

  test("browses notes in root and nested folder", async ({ request }) => {
    await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Root note",
        contentJson: { blocks: [] },
        plainText: "root",
        wordCount: 1,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Nested note",
        contentJson: { blocks: [] },
        plainText: "nested",
        wordCount: 1,
        folderPath: "work/blabla",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    const rootRes = await request.get(`${API_URL}/entries/notes/browse`);
    expect(rootRes.status()).toBe(200);
    const rootBody = await rootRes.json();
    expect(rootBody.currentPath).toBeNull();
    expect(rootBody.folders.some((f: { path: string }) => f.path === "work")).toBe(true);
    expect(rootBody.notes.some((n: { title: string }) => n.title === "Root note")).toBe(true);

    const nestedRes = await request.get(
      `${API_URL}/entries/notes/browse?path=${encodeURIComponent("work/blabla")}`,
    );
    expect(nestedRes.status()).toBe(200);
    const nestedBody = await nestedRes.json();
    expect(nestedBody.currentPath).toBe("work/blabla");
    expect(nestedBody.notes.some((n: { title: string }) => n.title === "Nested note")).toBe(true);
  });

  test("renames a folder and updates all descendant paths", async ({ request }) => {
    await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Nested note",
        contentJson: { blocks: [] },
        plainText: "nested",
        wordCount: 1,
        folderPath: "work/sub",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    const rename = await request.patch(`${API_URL}/entries/note-folders`, {
      data: { path: "work", newName: "projects" },
    });
    expect(rename.status()).toBe(200);
    const renamed = await rename.json();
    expect(renamed.name).toBe("projects");
    expect(renamed.path).toBe("projects");

    const list = await request.get(`${API_URL}/entries/note-folders`);
    const folders = (await list.json()) as Array<{ path: string }>;
    expect(folders.some((f) => f.path === "projects")).toBe(true);
    expect(folders.some((f) => f.path === "projects/sub")).toBe(true);
    expect(folders.some((f) => f.path === "work")).toBe(false);

    const browse = await request.get(
      `${API_URL}/entries/notes/browse?path=${encodeURIComponent("projects/sub")}`,
    );
    expect(browse.status()).toBe(200);
    const browseBody = await browse.json();
    expect(browseBody.notes.some((n: { title: string }) => n.title === "Nested note")).toBe(true);
  });

  test("warns on deleting non-empty folder and supports force delete", async ({ request }) => {
    await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Nested note",
        contentJson: { blocks: [] },
        plainText: "nested",
        wordCount: 1,
        folderPath: "work/blabla",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    const nonForce = await request.delete(
      `${API_URL}/entries/note-folders?path=${encodeURIComponent("work")}`,
    );
    expect(nonForce.status()).toBe(400);

    const forced = await request.delete(
      `${API_URL}/entries/note-folders?path=${encodeURIComponent("work")}&force=true`,
    );
    expect(forced.status()).toBe(204);

    const browse = await request.get(`${API_URL}/entries/notes/browse`);
    const body = await browse.json();
    expect(body.folders.some((f: { path: string }) => f.path === "work")).toBe(false);
  });
});

test.describe("API – PATCH /entries/:id", () => {
  test("updates a morning check-in and returns updated entry", async ({ request }) => {
    const create = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Health", "", ""],
        whatWouldMakeDayGreat: ["Focus", "", ""],
        dailyAffirmation: "I am ready",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const created = await create.json();

    const update = await request.patch(`${API_URL}/entries/${created.id}`, {
      data: {
        checkInType: "morning",
        dailyAffirmation: "I am unstoppable",
        mood: 9,
      },
    });

    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.dailyAffirmation).toBe("I am unstoppable");
    expect(updated.mood).toBe(9);
    expect(updated.id).toBe(created.id);
  });
});

test.describe("API – GET /entries/:id", () => {
  test("returns 404 for unknown id", async ({ request }) => {
    const res = await request.get(`${API_URL}/entries/nonexistent-id`);
    expect(res.status()).toBe(404);
  });

  test("returns a created entry by id", async ({ request }) => {
    const create = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "Fetch by id test.",
        wordCount: 4,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const created = await create.json();

    const fetchRes = await request.get(`${API_URL}/entries/${created.id}`);
    expect(fetchRes.status()).toBe(200);

    const entry = await fetchRes.json();
    expect(entry.id).toBe(created.id);
  });
});
