import { test, expect } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { resetDatabase } from "../db";

test.describe("API – GET /emotions", () => {
  test("returns 200 with an array of emotions", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("each emotion has id, label, type, and usageCount", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    const emotions = await res.json();

    for (const emotion of emotions) {
      expect(typeof emotion.id).toBe("string");
      expect(typeof emotion.label).toBe("string");
      expect(["difficult", "neutral", "pleasant"]).toContain(emotion.type);
      expect(typeof emotion.usageCount).toBe("number");
    }
  });

  test("includes emotions of all three types", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    const emotions = await res.json();

    const types = new Set(emotions.map((e: { type: string }) => e.type));
    expect(types.has("difficult")).toBe(true);
    expect(types.has("neutral")).toBe(true);
    expect(types.has("pleasant")).toBe(true);
  });

  test("returns emotions sorted alphabetically by label", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    const emotions = await res.json();

    const labels: string[] = emotions.map((e: { label: string }) => e.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });
});

test.describe("API – POST/PATCH/DELETE /emotions", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("creates a new emotion", async ({ request }) => {
    const res = await request.post(`${API_URL}/emotions`, {
      data: { label: "test-emotion-e2e", type: "neutral" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.label).toBe("test-emotion-e2e");
    expect(body.type).toBe("neutral");
    expect(body.usageCount).toBe(0);
  });

  test("returns 409 when creating duplicate emotion", async ({ request }) => {
    await request.post(`${API_URL}/emotions`, {
      data: { label: "dupe-emotion", type: "pleasant" },
    });
    const res = await request.post(`${API_URL}/emotions`, {
      data: { label: "dupe-emotion", type: "pleasant" },
    });
    expect(res.status()).toBe(409);
  });

  test("updates emotion label and type", async ({ request }) => {
    const createRes = await request.post(`${API_URL}/emotions`, {
      data: { label: "old-label", type: "difficult" },
    });
    const created = await createRes.json();

    const updateRes = await request.patch(`${API_URL}/emotions/${created.id}`, {
      data: { label: "new-label", type: "pleasant" },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.label).toBe("new-label");
    expect(updated.type).toBe("pleasant");
  });

  test("deletes an unused emotion", async ({ request }) => {
    const createRes = await request.post(`${API_URL}/emotions`, {
      data: { label: "to-delete", type: "neutral" },
    });
    const created = await createRes.json();

    const deleteRes = await request.delete(`${API_URL}/emotions/${created.id}`);
    expect(deleteRes.status()).toBe(204);
  });

  test("prevents deleting emotion used in check-in", async ({ request }) => {
    // Create a check-in that uses a seeded emotion
    const listRes = await request.get(`${API_URL}/emotions`);
    const emotions = await listRes.json();
    const emotion = emotions[0] as { id: string; label: string };

    await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 7,
        emotions: [emotion.label],
        triggers: ["routine"],
        whatImGratefulFor: ["Health", "Family", ""],
        whatWouldMakeDayGreat: ["Productivity", "", ""],
        dailyAffirmation: "I am great",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    const deleteRes = await request.delete(`${API_URL}/emotions/${emotion.id}`);
    expect(deleteRes.status()).toBe(409);
  });

  test("updating emotion label propagates to existing check-ins", async ({ request }) => {
    // Create emotion
    const createRes = await request.post(`${API_URL}/emotions`, {
      data: { label: "original-emo", type: "neutral" },
    });
    const emotion = await createRes.json();

    // Create a check-in using it
    const checkinRes = await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "evening",
        mood: 5,
        emotions: ["original-emo"],
        triggers: ["routine"],
        highlightsOfTheDay: ["Good day", "", ""],
        whatDidILearnToday: "Something new",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const checkin = await checkinRes.json();

    // Update emotion label
    await request.patch(`${API_URL}/emotions/${emotion.id}`, {
      data: { label: "updated-emo" },
    });

    // Fetch check-in and verify the label was updated
    const fetchRes = await request.get(`${API_URL}/entries/${checkin.id}`);
    const fetchedCheckin = await fetchRes.json();
    expect(fetchedCheckin.emotions).toContain("updated-emo");
    expect(fetchedCheckin.emotions).not.toContain("original-emo");
  });
});

test.describe("API – GET /triggers", () => {
  test("returns 200 with an array of triggers", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("each trigger has id, label, type, and usageCount", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    const triggers = await res.json();

    for (const trigger of triggers) {
      expect(typeof trigger.id).toBe("string");
      expect(typeof trigger.label).toBe("string");
      expect(["difficult", "neutral", "pleasant"]).toContain(trigger.type);
      expect(typeof trigger.usageCount).toBe("number");
    }
  });

  test("includes triggers of all three types", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    const triggers = await res.json();

    const types = new Set(triggers.map((t: { type: string }) => t.type));
    expect(types.has("difficult")).toBe(true);
    expect(types.has("neutral")).toBe(true);
    expect(types.has("pleasant")).toBe(true);
  });

  test("returns triggers sorted alphabetically by label", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    const triggers = await res.json();

    const labels: string[] = triggers.map((t: { label: string }) => t.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });
});

test.describe("API – POST/PATCH/DELETE /triggers", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("creates a new trigger", async ({ request }) => {
    const res = await request.post(`${API_URL}/triggers`, {
      data: { label: "test-trigger-e2e", type: "pleasant" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.label).toBe("test-trigger-e2e");
    expect(body.usageCount).toBe(0);
  });

  test("deletes an unused trigger", async ({ request }) => {
    const createRes = await request.post(`${API_URL}/triggers`, {
      data: { label: "trigger-to-delete", type: "neutral" },
    });
    const created = await createRes.json();
    const deleteRes = await request.delete(`${API_URL}/triggers/${created.id}`);
    expect(deleteRes.status()).toBe(204);
  });

  test("prevents deleting trigger used in check-in", async ({ request }) => {
    const listRes = await request.get(`${API_URL}/triggers`);
    const triggers = await listRes.json();
    const trigger = triggers[0] as { id: string; label: string };

    await request.post(`${API_URL}/entries/checkins`, {
      data: {
        checkInType: "morning",
        mood: 6,
        emotions: ["calm"],
        triggers: [trigger.label],
        whatImGratefulFor: ["Sunshine", "", ""],
        whatWouldMakeDayGreat: ["Good coffee", "", ""],
        dailyAffirmation: "I am present",
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });

    const deleteRes = await request.delete(`${API_URL}/triggers/${trigger.id}`);
    expect(deleteRes.status()).toBe(409);
  });
});
