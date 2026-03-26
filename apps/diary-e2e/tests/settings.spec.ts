import { resetDatabase, resetSettingsDatabase } from "../db";
import { expect, test } from "../fixtures";
import { API_URL, SETTINGS_API_URL } from "../playwright.config";

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

  test("note can be assigned a project on creation", async ({ request }) => {
    const projRes = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "Work", color: "info" },
    });
    const project = await projRes.json();

    const noteRes = await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Note with project",
        contentJson: { blocks: [] },
        plainText: "Hello",
        wordCount: 1,
        projectId: project.id,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    expect(noteRes.status()).toBe(201);
    const note = await noteRes.json();
    expect(note.projectId).toBe(project.id);
  });

  test("deleting a project in settings leaves diary projectId unchanged (no FK)", async ({
    request,
  }) => {
    const projRes = await request.post(`${SETTINGS_API_URL}/projects`, {
      data: { name: "Temporary" },
    });
    const project = await projRes.json();

    const noteRes = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "Note",
        wordCount: 1,
        projectId: project.id,
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const note = await noteRes.json();

    await request.delete(`${SETTINGS_API_URL}/projects/${project.id}`);

    const fetchedNote = await request.get(`${API_URL}/entries/${note.id}`);
    const fetchedBody = await fetchedNote.json();
    expect(fetchedBody.projectId).toBe(project.id);
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

  test("note can be assigned tags on creation", async ({ request }) => {
    const tag1Res = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "reading" } });
    const tag2Res = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "ideas" } });
    const tag1 = await tag1Res.json();
    const tag2 = await tag2Res.json();

    const noteRes = await request.post(`${API_URL}/entries/notes`, {
      data: {
        title: "Tagged note",
        contentJson: { blocks: [] },
        plainText: "Content",
        wordCount: 1,
        tagIds: [tag1.id, tag2.id],
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    expect(noteRes.status()).toBe(201);
    const note = await noteRes.json();
    expect(note.tagIds).toHaveLength(2);
    expect(note.tagIds).toContain(tag1.id);
    expect(note.tagIds).toContain(tag2.id);
  });

  test("note tags can be updated via PATCH", async ({ request }) => {
    const tagRes = await request.post(`${SETTINGS_API_URL}/tags`, { data: { name: "fitness" } });
    const tag = await tagRes.json();

    const noteRes = await request.post(`${API_URL}/entries/notes`, {
      data: {
        contentJson: { blocks: [] },
        plainText: "Note",
        wordCount: 1,
        tagIds: [tag.id],
        localDateTime: new Date().toISOString().slice(0, 16),
      },
    });
    const note = await noteRes.json();

    // Replace all tags (set to empty)
    const patchRes = await request.patch(`${API_URL}/entries/${note.id}`, {
      data: { tagIds: [] },
    });
    expect(patchRes.status()).toBe(200);
    const updated = await patchRes.json();
    expect(updated.tagIds).toHaveLength(0);
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

  test("can add a project from settings", async ({ page }) => {
    await page.goto("/?view=settings");

    await page.getByRole("button", { name: "Add project" }).click();
    await page.getByLabel("Name").fill("Work Project");
    await page.getByLabel("Description (optional)").fill("My work notes");
    await page.getByRole("button", { name: "Color success" }).click();
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Work Project")).toBeVisible();
  });

  test("can add a tag from settings", async ({ page }) => {
    await page.goto("/?view=settings");

    await page.getByRole("button", { name: "Add tag" }).click();
    await page.getByLabel("Tag name").fill("health");
    await page.getByRole("button", { name: "Add" }).last().click();

    await expect(page.getByText("health")).toBeVisible();
  });
});
