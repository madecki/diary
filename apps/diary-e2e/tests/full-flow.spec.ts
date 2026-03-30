import { getEntryCount, resetDatabase } from "../db";
import { expect, test } from "../fixtures";
import { selectCheckInType } from "./checkin-type-helpers";

test.describe("Full User Flow", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("complete journaling workflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("0 check-ins")).toBeVisible();

    // ── Create morning check-in ────────────────────────────────────
    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL("/entries/new/checkin");

    await selectCheckInType(page, "morning");

    await page.getByRole("button", { name: "8", exact: true }).click();

    await page.getByRole("button", { name: "happy" }).click();
    await page.getByRole("button", { name: "exercise" }).click();

    await page.locator("input[placeholder='First thing…']").first().fill("Great night sleep");

    await page.locator("input[placeholder='First thing…']").nth(1).fill("Finish the feature");

    await page.getByPlaceholder("I am…").fill("I am focused and ready");

    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("/", { timeout: 10_000 });

    await expect(page.getByText("1 check-in")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: "🌅 Morning" })).toBeVisible();

    // ── Create second check-in (evening) ─────────────────────────
    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL("/entries/new/checkin");

    await selectCheckInType(page, "evening");

    await page.getByRole("button", { name: "6", exact: true }).click();
    await page.getByRole("button", { name: "calm" }).click();
    await page.getByRole("button", { name: "music" }).click();

    await page.locator("input[placeholder='First highlight…']").first().fill("Good conversation");

    await page.getByPlaceholder("Today I learned…").fill("Listen more than you speak");

    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("/", { timeout: 10_000 });

    await expect(page.getByText("2 check-ins")).toBeVisible();
    await expect(page.locator("span").filter({ hasText: "🌙 Evening" })).toBeVisible();

    // ── Search check-ins ───────────────────────────────────────────
    const searchInput = page.getByPlaceholder(
      "Search by content, emotions, triggers or affirmations…",
    );
    await searchInput.fill("focused");
    await expect(page.locator("span").filter({ hasText: "🌅 Morning" })).toBeVisible();
    await expect(page.locator("span").filter({ hasText: "🌙 Evening" })).not.toBeVisible();

    await searchInput.clear();
    await expect(page.getByText("2 check-ins")).toBeVisible();

    // ── Open morning check-in for edit ─────────────────────────────
    await page.getByRole("link").filter({ hasText: "🌅 Morning" }).first().click();

    await expect(page.getByRole("heading", { name: "Edit Check-in" })).toBeVisible();

    const count = await getEntryCount();
    expect(count).toBe(2);
  });
});
