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

async function createNote(title: string, content: string): Promise<void> {
  await fetch(`${API_URL}/entries/notes`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      title,
      contentJson: {
        blocks: [
          {
            type: "paragraph",
            content: [{ type: "text", text: content }],
          },
        ],
      },
      plainText: content,
      wordCount: content.split(/\s+/).length,
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
    await createNote("Project Ideas", "Build a new app for journaling");
    await createNote("Book Notes", "Read about mindfulness and meditation");
  });

  test("shows check-ins by default", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("2 check-ins")).toBeVisible();

    const checkinBadges = page.locator("span").filter({ hasText: /^Check-in$/ });
    await expect(checkinBadges).toHaveCount(2);
  });

  test("filters by check-ins only", async ({ page }) => {
    await page.goto("/");

    const checkinBadges = page.locator("span").filter({ hasText: /^Check-in$/ });
    await expect(checkinBadges).toHaveCount(2);
  });

  test("filters by notes only", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();

    const shortNoteBadges = page.locator("span").filter({ hasText: /^Note$/ });
    await expect(shortNoteBadges).toHaveCount(2);
  });

  test("searches by gratitude item", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by title, content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("energy");

    await expect(page.getByText("I am productive and motivated")).toBeVisible();
    await expect(page.getByText("Completed the sprint review")).not.toBeVisible();
    await expect(page.getByText("Project Ideas")).not.toBeVisible();
  });

  test("searches by daily affirmation", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by title, content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("productive");

    const morningCard = page
      .locator("span")
      .filter({ hasText: /^Check-in$/ })
      .first();
    await expect(morningCard).toBeVisible();
    await expect(page.getByText("Project Ideas")).not.toBeVisible();
  });

  test("searches by what I learned today", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.getByPlaceholder(
      "Search by title, content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("management");

    const eveningCard = page
      .locator("span")
      .filter({ hasText: /^Check-in$/ })
      .first();
    await expect(eveningCard).toBeVisible();
    await expect(page.getByText("Book Notes")).not.toBeVisible();
  });

  test("searches by title", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();
    const searchInput = page.getByPlaceholder("Search notes by title and content…");
    await searchInput.fill("Project");

    await expect(page.getByRole("heading", { name: "Project Ideas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Book Notes" })).not.toBeVisible();
  });

  test("shows no results message when search has no matches", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();
    const searchInput = page.getByPlaceholder("Search notes by title and content…");
    await searchInput.fill("nonexistent query xyz123");

    await expect(page.getByText("No notes match your search in this folder.")).toBeVisible();
  });

  test("combines filter and search", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();

    // In notes view the search placeholder differs from the all-entries view
    const searchInput = page.getByPlaceholder("Search notes by title and content…");
    await searchInput.fill("mindfulness");

    await expect(page.getByRole("heading", { name: "Book Notes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Project Ideas" })).not.toBeVisible();
  });
});
