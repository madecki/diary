import { resetDatabase } from "../db";
import { expect, test } from "../fixtures";
import { E2E_SERVICE_TOKEN, E2E_USER_ID } from "../global-setup";
import { API_URL } from "../playwright.config";

const AUTH_HEADERS = {
  "Content-Type": "application/json",
  "x-service-token": E2E_SERVICE_TOKEN,
  "x-user-id": E2E_USER_ID,
};

async function createMorningCheckin(
  whatImGratefulFor: [string, string, string],
  whatWouldMakeDayGreat: [string, string, string],
  dailyAffirmation: string,
): Promise<void> {
  await fetch(`${API_URL}/entries/checkins`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      checkInType: "morning",
      mood: 7,
      emotions: ["happy"],
      triggers: ["exercise"],
      whatImGratefulFor,
      whatWouldMakeDayGreat,
      dailyAffirmation,
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
}

async function createEveningCheckin(
  highlightsOfTheDay: [string, string, string],
  whatDidILearnToday: string,
): Promise<void> {
  await fetch(`${API_URL}/entries/checkins`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      checkInType: "evening",
      mood: 5,
      emotions: ["calm"],
      triggers: ["routine"],
      highlightsOfTheDay,
      whatDidILearnToday,
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
}

async function createBasicCheckin(plainText: string): Promise<void> {
  await fetch(`${API_URL}/entries/checkins`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      checkInType: "basic",
      mood: 6,
      emotions: ["focused"],
      triggers: ["deep work"],
      contentJson: { blocks: [] },
      plainText,
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
}

test.describe("Filter and Search", () => {
  test.beforeEach(async () => {
    await resetDatabase();

    await createMorningCheckin(
      ["Good health and energy", "", ""],
      ["Stay focused on goals", "", ""],
      "I am productive and motivated",
    );
    await createEveningCheckin(
      ["Completed the sprint review", "", ""],
      "Time management is essential for success",
    );
    await createBasicCheckin("Build a new app for journaling");
    await createBasicCheckin("Read about mindfulness and meditation");
  });

  test("shows check-ins on home", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("4 check-ins")).toBeVisible();

    const morningBadges = page.locator("span").filter({ hasText: "🌅 Morning" });
    await expect(morningBadges).toHaveCount(1);
  });

  test("searches by gratitude item", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("energy");

    await expect(page.getByText("I am productive and motivated")).toBeVisible();
    await expect(page.getByText("Completed the sprint review")).not.toBeVisible();
    await expect(page.getByText("Build a new app for journaling")).not.toBeVisible();
  });

  test("searches by daily affirmation", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("productive");

    await expect(page.getByText("I am productive and motivated")).toBeVisible();
    await expect(page.getByText("mindfulness")).not.toBeVisible();
  });

  test("searches by what I learned today", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("management");

    await expect(page.getByText("Time management is essential for success")).toBeVisible();
    await expect(page.getByText("mindfulness")).not.toBeVisible();
  });

  test("searches basic check-in body text", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("mindfulness");

    await expect(page.getByText("Read about mindfulness and meditation")).toBeVisible();
    await expect(page.getByText("Build a new app for journaling")).not.toBeVisible();
  });

  test("shows no results message when search has no matches", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("nonexistent query xyz123");

    await expect(page.getByText("No entries match your search.")).toBeVisible();
  });
});
