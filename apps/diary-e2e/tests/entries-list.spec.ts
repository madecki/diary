import { test, expect } from "@playwright/test";
import { resetDatabase } from "../db";

test.describe("Entries List", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("shows empty state when no entries exist", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "My Diary" })).toBeVisible();
    await expect(page.getByText("0 notes")).toBeVisible();
    await expect(
      page.getByText("No notes yet. Add your first one!"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Start journaling" })).not.toBeVisible();
  });

  test("shows Add new button in notes tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Add new" })).toBeVisible();
  });

  test("shows Add new button in check-ins tab", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Check-ins" }).click();
    await expect(page.getByRole("link", { name: "Add new" })).toBeVisible();
  });

  test("shows Create folder button in notes tab", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Create folder" })).toBeVisible();
  });

  test("search input is present", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByPlaceholder("Search notes by title and content…"),
    ).toBeVisible();
  });

  test("type filter tabs are present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "All" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Check-ins" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notes" })).toBeVisible();
  });

  test("notes tab is active by default", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByPlaceholder("Search notes by title and content…")).toBeVisible();
  });
});
