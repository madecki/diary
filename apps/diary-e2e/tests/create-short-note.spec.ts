import { test, expect } from "@playwright/test";
import { API_URL } from "../playwright.config";
import { resetDatabase, getEntryCount } from "../db";

async function createNoteViaApi(
  title: string,
  plainText: string,
  folderPath?: string,
): Promise<void> {
  await fetch(`${API_URL}/entries/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      contentJson: { blocks: [] },
      plainText,
      wordCount: plainText.split(/\s+/).length,
      folderPath,
      localDate: new Date().toISOString().slice(0, 10),
    }),
  });
}

test.describe("Create Note", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("navigates to note form from homepage via Add new button", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL("/entries/new/note");

    await expect(page.getByRole("heading", { name: "New Note" })).toBeVisible();
    await expect(page.getByText("Capture your thoughts")).toBeVisible();
  });

  test("shows validation error when content is empty", async ({ page }) => {
    await page.goto("/entries/new/note");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Please write something")).toBeVisible();
  });

  test("creates a note without title", async ({ page }) => {
    await page.goto("/entries/new/note");

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

  test("creates a note with title", async ({ page }) => {
    await page.goto("/entries/new/note");

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

  test("creates a note in the current folder when navigating from folder view", async ({ page }) => {
    await createNoteViaApi("Existing note", "already in folder", "work/blabla");

    await page.goto("/?view=notes");

    await page.getByRole("button", { name: "work" }).click();
    await page.getByRole("button", { name: "blabla" }).click();

    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL(/\/entries\/new\/note/);

    await expect(page.getByText("Saving in:")).toBeVisible();
    await expect(page.getByText("work/blabla")).toBeVisible();

    const editorSelector = ".bn-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });
    await page.click(editorSelector);
    await page.keyboard.type("Note created inside folder.");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Note saved!")).toBeVisible({ timeout: 10_000 });
    await page.waitForURL("/", { timeout: 10_000 });

    // Navigate back into the folder to verify the note was saved there
    await page.getByRole("button", { name: "work" }).click();
    await page.getByRole("button", { name: "blabla" }).click();

    const newNoteCard = page.getByText("Note created inside folder.").locator("..").locator("..");
    await expect(newNoteCard.getByText("work/blabla")).toBeVisible();
  });

  test("persists notes folder location in URL", async ({ page }) => {
    await createNoteViaApi("Root note", "at root");
    await createNoteViaApi("Work note", "inside folder", "work/blabla");

    await page.goto("/?view=notes");
    await page.getByRole("button", { name: "work" }).click();
    await page.getByRole("button", { name: "blabla" }).click();

    await expect(page).toHaveURL(/view=notes/);
    await expect(page).toHaveURL(/folder=work%2Fblabla/);
    await expect(page.getByRole("heading", { name: "Work note" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Root note" })).not.toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(/folder=work%2Fblabla/);
    await expect(page.getByRole("heading", { name: "Work note" })).toBeVisible();
  });
});
