import { resetDatabase, resetSettingsDatabase } from "../db";
import { expect, test } from "../fixtures";
import { SETTINGS_API_URL } from "../playwright.config";

// ── Projects API ─────────────────────────────────────────────────────

test.describe("API – Projects CRUD", () => {
  test.beforeEach(async () => {
    await resetDatabase();
    await resetSettingsDatabase();
  });

  test("lists projects (empty initially)", async ({ request }) => {
    const res = await request.get(`${SETTINGS_API_URL}/projects`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("creates a project", async ({ request }) => {
    const res = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "My Project", description: "A test project" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("My Project");
    expect(body.description).toBe("A test project");
    expect(body.color).toBe("primary"); // default when omitted
    expect(typeof body.id).toBe("string");
  });

  test("creates a project with color", async ({ request }) => {
    const res = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "Colored", description: "A project", color: "success" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Colored");
    expect(body.color).toBe("success");
  });

  test("returns 409 for duplicate project name", async ({ request }) => {
    await request.post(`${SETTINGS_API_URL}/projects`, { data: { name: "Duplicate" } });
    const res = await request.post(`${SETTINGS_API_URL}/projects`, { data: { name: "Duplicate" } });
    expect(res.status()).toBe(409);
  });

  test("updates a project", async ({ request }) => {
    const createRes = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "Old Name", description: "Old desc" },
    });
    const created = await createRes.json();

    const updateRes = await request.patch(`${SETTINGS_API_URL}/projects/${created.id}`, {
      data: { name: "New Name", description: "New desc", color: "danger" },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("New desc");
    expect(updated.color).toBe("danger");
  });

  test("deletes a project", async ({ request }) => {
    const createRes = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "To Delete" },
    });
    const created = await createRes.json();

    const deleteRes = await request.delete(`${SETTINGS_API_URL}/projects/${created.id}`);
    expect(deleteRes.status()).toBe(204);

    const listRes = await request.get(`${SETTINGS_API_URL}/projects`);
    const projects = await listRes.json();
    expect(projects.find((p: { id: string }) => p.id === created.id)).toBeUndefined();
  });
});

// ── Tags API ─────────────────────────────────────────────────────────

test.describe("API – Tags CRUD", () => {
  test.beforeEach(async () => {
    await resetDatabase();
    await resetSettingsDatabase();
  });

  test("lists tags (empty initially)", async ({ request }) => {
    const res = await request.get(`${SETTINGS_API_URL}/tags`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("creates a tag", async ({ request }) => {
    const res = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "health" } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("health");
    expect(typeof body.id).toBe("string");
  });

  test("returns 409 for duplicate tag name", async ({ request }) => {
    await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "dupe-tag" } });
    const res = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "dupe-tag" } });
    expect(res.status()).toBe(409);
  });

  test("updates a tag name", async ({ request }) => {
    const createRes = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "old-tag" } });
    const created = await createRes.json();

    const updateRes = await request.patch(`${SETTINGS_API_URL}/tags/${created.id}`, {
      data: { name: "new-tag" },
    });
    expect(updateRes.status()).toBe(200);
    const updated = await updateRes.json();
    expect(updated.name).toBe("new-tag");
  });

  test("deletes a tag", async ({ request }) => {
    const createRes = await request.post(`${SETTINGS_API_URL}/tags`, {
      data: { name: "to-remove" },
    });
    const created = await createRes.json();

    const deleteRes = await request.delete(`${SETTINGS_API_URL}/tags/${created.id}`);
    expect(deleteRes.status()).toBe(204);
  });
});

// ── Settings UI ───────────────────────────────────────────────────────

test.describe("Settings UI", () => {
  test.beforeEach(async () => {
    await resetDatabase();
    await resetSettingsDatabase();
  });

  test("settings tab is accessible from main page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page).toHaveURL(/view=settings/);
    await expect(page.getByRole("heading", { name: "Check-in options" })).toBeVisible();
  });

  test("can add a new emotion from settings", async ({ page }) => {
    await page.goto("/?view=settings");

    // Click "Add emotion" button
    await page.getByRole("button", { name: "Add emotion" }).click();

    await page.getByTestId("ref-item-type").click();
    await page.getByRole("option", { name: "Pleasant" }).click();
    await page.getByLabel("Label").first().fill("zen");
    await page.getByRole("button", { name: "Add" }).first().click();

    // The new emotion should appear
    await expect(page.getByText("zen")).toBeVisible();
  });
});
