import { test, expect } from "@playwright/test";
import { resetDatabase, getEntryCount } from "../db";

test.describe("Full User Flow", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("complete journaling workflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("0 entries")).toBeVisible();

    // ── Create morning check-in ────────────────────────────────────
    await page.getByRole("link", { name: "New Check-in" }).click();
    await page.waitForURL("/entries/new/checkin");

    // Select morning
    await page.getByRole("button", { name: "Morning" }).click();

    // Pick mood
    await page.getByRole("button", { name: "8", exact: true }).click();

    // Pick emotion + trigger
    await page.getByRole("button", { name: "happy" }).click();
    await page.getByRole("button", { name: "exercise" }).click();

    // Fill gratitude
    await page.locator("input[placeholder='First thing…']").first().fill("Great night sleep");

    // Fill make-day-great
    await page
      .locator("input[placeholder='First thing…']")
      .nth(1)
      .fill("Finish the feature");

    // Fill affirmation
    await page.getByPlaceholder("I am…").fill("I am focused and ready");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Check-in saved!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });

    await expect(page.getByText("1 entry")).toBeVisible();
    // Check-in card shows morning badge
    await expect(page.locator("span").filter({ hasText: "🌅 Morning" })).toBeVisible();

    // ── Create note ────────────────────────────────────────────────
    await page.getByRole("link", { name: "New Note" }).click();
    await page.waitForURL("/entries/new/note");

    const titleInput = page.getByPlaceholder("Give your note a title…");
    await titleInput.fill("Weekly Goals");

    const editorSelector = ".bn-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });
    await page.click(editorSelector);
    await page.keyboard.type("1. Exercise daily\n2. Read for 30 minutes\n3. Meditate");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Note saved!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });

    await expect(page.getByText("2 entries")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weekly Goals" })).toBeVisible();

    // ── Type filter ────────────────────────────────────────────────
    await page.getByRole("button", { name: "Check-ins" }).click();
    await expect(page.locator("span").filter({ hasText: "🌅 Morning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weekly Goals" })).not.toBeVisible();

    await page.getByRole("button", { name: "Notes" }).click();
    await expect(page.getByRole("heading", { name: "Weekly Goals" })).toBeVisible();

    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("2 entries")).toBeVisible();

    // ── Search ─────────────────────────────────────────────────────
    const searchInput = page.getByPlaceholder(
      "Search by title, content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("focused");
    // Affirmation "I am focused and ready" matches
    await expect(
      page.locator("span").filter({ hasText: "🌅 Morning" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Weekly Goals" })).not.toBeVisible();

    await searchInput.clear();
    await expect(page.getByText("2 entries")).toBeVisible();

    // ── Open check-in for edit ─────────────────────────────────────
    const checkinCard = page.locator("span").filter({ hasText: "🌅 Morning" });
    await checkinCard.locator("..").locator("..").locator("..").click();

    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();

    const count = await getEntryCount();
    expect(count).toBe(2);
  });
});
