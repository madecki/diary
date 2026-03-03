import { test, expect } from "@playwright/test";
import { resetDatabase, getEntryCount } from "../db";

test.describe("Create Short Note", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("navigates to short note form from homepage", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "New Short Note" }).click();
    await page.waitForURL("/entries/new/short-note");

    await expect(page.getByRole("heading", { name: "New Short Note" })).toBeVisible();
    await expect(page.getByText("Capture a quick thought")).toBeVisible();
  });

  test("shows validation error when content is empty", async ({ page }) => {
    await page.goto("/entries/new/short-note");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Please write something")).toBeVisible();
  });

  test("creates a short note without title", async ({ page }) => {
    await page.goto("/entries/new/short-note");

    const editorSelector = ".bn-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });
    await page.click(editorSelector);
    await page.keyboard.type("Just a quick thought about life.");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Note saved!")).toBeVisible({ timeout: 10_000 });

    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);

    const entryCard = page.locator('[class*="bg-darkgray"]').filter({ hasText: "Just a quick thought" });
    await expect(entryCard).toBeVisible();
  });

  test("creates a short note with title", async ({ page }) => {
    await page.goto("/entries/new/short-note");

    const titleInput = page.getByPlaceholder("Give your note a title…");
    await titleInput.fill("Important Idea");

    const editorSelector = ".bn-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });
    await page.click(editorSelector);
    await page.keyboard.type("This is a very important idea I had today.");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Note saved!")).toBeVisible({ timeout: 10_000 });

    await page.waitForURL("/", { timeout: 10_000 });

    await expect(page.getByRole("heading", { name: "Important Idea" })).toBeVisible();
  });
});
