import { test, expect } from "@playwright/test";
import { API_URL } from "../playwright.config";

test.describe("API – GET /emotions", () => {
  test("returns 200 with an array of emotions", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("each emotion has id, label, and type", async ({ request }) => {
    const res = await request.get(`${API_URL}/emotions`);
    const emotions = await res.json();

    for (const emotion of emotions) {
      expect(typeof emotion.id).toBe("string");
      expect(typeof emotion.label).toBe("string");
      expect(["difficult", "neutral", "pleasant"]).toContain(emotion.type);
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

test.describe("API – GET /triggers", () => {
  test("returns 200 with an array of triggers", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("each trigger has id, label, and type", async ({ request }) => {
    const res = await request.get(`${API_URL}/triggers`);
    const triggers = await res.json();

    for (const trigger of triggers) {
      expect(typeof trigger.id).toBe("string");
      expect(typeof trigger.label).toBe("string");
      expect(["difficult", "neutral", "pleasant"]).toContain(trigger.type);
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
