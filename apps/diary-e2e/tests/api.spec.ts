import { expect, test } from "@playwright/test";
import { resetDatabase } from "../db";
import { API_URL } from "../playwright.config";

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

  test("accepts limit query param", async ({ request }) => {
    const res = await request.get(`${API_URL}/entries?limit=5`);
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

  test("creates a basic check-in and returns the entry", async ({ request }) => {
    const res = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "basic",
        mood: 5,
        emotions: ["calm"],
        triggers: ["work"],
        contentJson: { blocks: [] },
        plainText: "Short check-in note.",
        wordCount: 3,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    expect(res.status()).toBe(201);
    const entry = await res.json();

    expect(entry.type).toBe("checkin");
    expect(entry.checkInType).toBe("basic");
    expect(entry.mood).toBe(5);
    expect(entry.plainText).toBe("Short check-in note.");
    expect(entry.whatImGratefulFor).toEqual([]);
    expect(entry.highlightsOfTheDay).toEqual([]);
    expect(entry.dailyAffirmation).toBeNull();
    expect(entry.whatDidILearnToday).toBeNull();
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
    const create = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "basic",
        mood: 5,
        emotions: ["calm"],
        triggers: ["work"],
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
