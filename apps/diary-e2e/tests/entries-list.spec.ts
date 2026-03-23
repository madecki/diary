import { resetDatabase } from "../db";
import { expect, test } from "../fixtures";

test.describe("Entries List", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("shows empty state when no entries exist", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "My Diary" })).toBeVisible();
    await expect(page.getByText("0 check-ins")).toBeVisible();
    await expect(page.getByText("No check-ins yet. Add your first one!")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start journaling" })).not.toBeVisible();
  });

  test("shows Add new button in notes tab", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();
    await expect(page.getByRole("link", { name: "Add new" })).toBeVisible();
  });

  test("shows Add new button in check-ins tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Add new" })).toBeVisible();
  });

  test("shows Create folder button in notes tab", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notes" }).click();
    await expect(page.getByRole("button", { name: "Create folder" })).toBeVisible();
  });

  test("search input is present", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByPlaceholder("Search by title, content, emotions, triggers or affirmations…"),
    ).toBeVisible();
  });

  test("type filter tabs are present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "All" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Check-ins" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  test("check-ins tab is active by default", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByPlaceholder("Search by title, content, emotions, triggers or affirmations…"),
    ).toBeVisible();
  });

  test("settings tab shows emotions and triggers sections", async ({ page }) => {
    await page.goto("/?view=settings");

    await expect(page.getByRole("heading", { name: "Check-in options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Emotions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Triggers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notes options" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
  });

  test("settings tab hides search input", async ({ page }) => {
    await page.goto("/?view=settings");

    await expect(page.getByPlaceholder("Search notes by title and content…")).not.toBeVisible();
  });
});
