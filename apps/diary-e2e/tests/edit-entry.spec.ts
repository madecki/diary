import { test, expect } from "../fixtures";
import { API_URL } from "../playwright.config";
import { E2E_SERVICE_TOKEN, E2E_USER_ID } from "../global-setup";
import { resetDatabase } from "../db";

const AUTH_HEADERS = {
  "Content-Type": "application/json",
  "x-service-token": E2E_SERVICE_TOKEN,
  "x-user-id": E2E_USER_ID,
};

async function createMorningCheckin(): Promise<string> {
  const res = await fetch(`${API_URL}/entries/checkins`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      checkInType: "morning",
      mood: 7,
      emotions: ["happy"],
      triggers: ["exercise"],
      whatImGratefulFor: ["Good health", "", ""],
      whatWouldMakeDayGreat: ["Stay focused", "", ""],
      dailyAffirmation: "I am capable and ready",
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function createEveningCheckin(): Promise<string> {
  const res = await fetch(`${API_URL}/entries/checkins`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      checkInType: "evening",
      mood: 6,
      emotions: ["calm"],
      triggers: ["music"],
      highlightsOfTheDay: ["Finished the project", "", ""],
      whatDidILearnToday: "Consistency is key",
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function createNote(): Promise<string> {
  const res = await fetch(`${API_URL}/entries/notes`, {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      title: "Test Note",
      contentJson: {
        blocks: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Note content here" }],
          },
        ],
      },
      plainText: "Note content here",
      wordCount: 3,
      localDateTime: new Date().toISOString().slice(0, 16),
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

test.describe("Edit Entry", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("opens morning check-in in edit mode", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);

    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();
    await expect(page.getByText("Update your mood and reflections")).toBeVisible();
    await expect(page.getByText("What are you grateful for?")).toBeVisible();
  });

  test("opens evening check-in in edit mode", async ({ page }) => {
    const entryId = await createEveningCheckin();

    await page.goto(`/entries/${entryId}`);

    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();
    await expect(page.getByText("Highlights of the day")).toBeVisible();
  });

  test("opens note in edit mode", async ({ page }) => {
    const entryId = await createNote();

    await page.goto(`/entries/${entryId}`);

    await expect(page.getByRole("heading", { name: "Edit Note" })).toBeVisible();
    await expect(page.getByText("Update your note")).toBeVisible();
  });

  test("can navigate to edit from entries list", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto("/?view=checkins");

    await expect(page.getByText("1 check-in")).toBeVisible();

    const entryCard = page.locator(`a[href="/entries/${entryId}"]`);
    await entryCard.click();

    await page.waitForURL(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();
  });

  test("shows delete button in edit mode", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);

    await expect(page.getByRole("button", { name: "Delete" }).first()).toBeVisible();
  });

  test("delete modal appears when clicking delete", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);

    await page.getByRole("button", { name: "Delete" }).first().click();

    await expect(page.getByRole("heading", { name: "Delete entry?" })).toBeVisible();
    await expect(
      page.getByText("This action cannot be undone"),
    ).toBeVisible();
    const modal = page.getByRole("dialog");
    await expect(modal.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("cancel button in delete modal closes it", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);

    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByRole("heading", { name: "Delete entry?" })).toBeVisible();

    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Delete entry?" })).not.toBeVisible();
  });

  test("confirming delete removes check-in and redirects to home", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);
    await page.getByRole("button", { name: "Delete" }).first().click();

    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Delete" }).click();

    await page.waitForURL("/");
    // After redirect, default view is notes
    await expect(page.getByText("0 notes")).toBeVisible();

    const res = await fetch(`${API_URL}/entries/${entryId}`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(404);
  });

  test("confirming delete removes note and redirects to home", async ({ page }) => {
    const entryId = await createNote();

    await page.goto(`/entries/${entryId}`);
    await page.getByRole("button", { name: "Delete" }).first().click();

    const modal = page.getByRole("dialog");
    await modal.getByRole("button", { name: "Delete" }).click();

    await page.waitForURL("/");
    await expect(page.getByText("0 notes")).toBeVisible();

    const res = await fetch(`${API_URL}/entries/${entryId}`, { headers: AUTH_HEADERS });
    expect(res.status).toBe(404);
  });

  test("shows 404 for non-existent entry", async ({ page }) => {
    await page.goto("/entries/non-existent-id");

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("shows loading overlay and disables form while saving edited check-in", async ({ page }) => {
    const entryId = await createMorningCheckin();

    let resolveRequest!: () => void;
    const requestHeld = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await page.route(`**/entries/${entryId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        await requestHeld;
      }
      await route.fallback();
    });

    await page.goto(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();
    // Wait for form options (emotions/triggers) to finish loading so the save
    // overlay is the only status="Loading" element when asserting below.
    await expect(page.getByRole("status", { name: "Loading" })).toHaveCount(0);

    await page.getByRole("button", { name: "Save changes" }).click();

    // Loading overlay must appear (only the SpinnerOverlay at this point)
    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    // Save button shows "Saving…" and is disabled
    await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();

    // Cancel, Back, and Delete buttons are disabled
    await expect(page.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "← Back" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete" }).first()).toBeDisabled();

    // Type toggle buttons are disabled
    await expect(page.getByRole("button", { name: "Morning" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Evening" })).toBeDisabled();

    resolveRequest();

    await expect(page.getByText("Check-in updated!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });
  });

  test("cannot submit edited check-in multiple times during save", async ({ page }) => {
    const entryId = await createMorningCheckin();

    let callCount = 0;
    let resolveRequest!: () => void;
    const requestHeld = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await page.route(`**/entries/${entryId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        callCount++;
        await requestHeld;
      }
      await route.fallback();
    });

    await page.goto(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();
    // Button is now disabled — forced clicks should have no effect
    await page.getByRole("button", { name: "Saving…" }).click({ force: true });
    await page.getByRole("button", { name: "Saving…" }).click({ force: true });

    resolveRequest();

    await expect(page.getByText("Check-in updated!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });
    expect(callCount).toBe(1);
  });

  test("redirects to home after saving edited morning check-in", async ({ page }) => {
    const entryId = await createMorningCheckin();

    await page.goto(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Check-in updated!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });
    // Default view is notes after redirect; switch to check-ins to verify
    await page.getByRole("button", { name: "Check-ins" }).click();
    await expect(page.getByText("1 check-in")).toBeVisible();
  });

  test("redirects to home after saving edited evening check-in", async ({ page }) => {
    const entryId = await createEveningCheckin();

    await page.goto(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Check-in updated!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });
    await page.getByRole("button", { name: "Check-ins" }).click();
    await expect(page.getByText("1 check-in")).toBeVisible();
  });

  test("redirects to home after saving edited note", async ({ page }) => {
    const entryId = await createNote();

    await page.goto(`/entries/${entryId}`);
    await expect(page.getByRole("heading", { name: "Edit Note" })).toBeVisible();

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Note updated!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page.getByText("1 note")).toBeVisible();
  });
});
