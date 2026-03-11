import { test, expect } from "@playwright/test";
import { resetDatabase } from "../db";

test.describe("Entries List", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("shows empty state when no entries exist", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "My Diary" })).toBeVisible();
    await expect(page.getByText("0 entries")).toBeVisible();
    await expect(
      page.getByText("No entries yet. Create your first one!"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Start journaling" })).toBeVisible();
  });

  test("shows New Check-in and New Note buttons", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "New Check-in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Note" })).toBeVisible();
  });

  test("search input is present", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByPlaceholder("Search by title, content, emotions, triggers or affirmations…"),
    ).toBeVisible();
  });

  test("type filter tabs are present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check-ins" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notes" })).toBeVisible();
  });
});
