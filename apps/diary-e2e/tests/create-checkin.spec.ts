import { getEntryCount, resetDatabase } from "../db";
import { expect, test } from "../fixtures";
import { selectCheckInType } from "./checkin-type-helpers";

test.describe("Create Check-in", () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test("navigates to check-in form from homepage via Add new button", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL("/entries/new/checkin");

    await expect(page.getByRole("heading", { name: "New Check-in" })).toBeVisible();
    await expect(page.getByText("How are you feeling today?")).toBeVisible();
  });

  test("shows mood picker, emotions, triggers, and check-in type field", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    // Mood section
    await expect(page.getByText("Mood")).toBeVisible();
    // Emotion/trigger pickers
    await expect(page.getByText("Emotions")).toBeVisible();
    await expect(page.getByText("Triggers")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Check-in type" })).toBeVisible();
    await expect(page.getByText("Note (optional)")).toBeVisible();
  });

  test("shows validation errors when submitting empty morning form", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "morning");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Mood is required")).toBeVisible();
    await expect(page.getByText("Add at least one emotion")).toBeVisible();
    await expect(page.getByText("Add at least one trigger")).toBeVisible();
    await expect(page.getByText("Enter at least one item").first()).toBeVisible();
    await expect(page.getByText("Daily affirmation is required")).toBeVisible();
  });

  test("shows validation errors when submitting empty basic form", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "basic");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Mood is required")).toBeVisible();
    await expect(page.getByText("Add at least one emotion")).toBeVisible();
    await expect(page.getByText("Add at least one trigger")).toBeVisible();
    await expect(page.getByText("Note is required for basic check-ins")).toBeVisible();
  });

  test("shows validation errors when submitting empty evening form", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "evening");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Mood is required")).toBeVisible();
    await expect(page.getByText("Add at least one emotion")).toBeVisible();
    await expect(page.getByText("Add at least one trigger")).toBeVisible();
    await expect(page.getByText("Enter at least one item")).toBeVisible();
    await expect(page.getByText("This field is required")).toBeVisible();
  });

  test("creates a morning check-in successfully", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "morning");

    // Pick mood 7
    await page.getByRole("button", { name: "7", exact: true }).click();

    // Pick emotion
    await page.getByRole("button", { name: "happy" }).click();

    // Pick trigger
    await page.getByRole("button", { name: "exercise" }).click();

    // Fill at least one gratitude item
    await page.locator("input[placeholder='First thing…']").first().fill("Good health");

    // Fill at least one make-day-great item
    await page.locator("input[placeholder='First thing…']").nth(1).fill("Stay focused");

    // Fill daily affirmation
    await page.getByPlaceholder("I am…").fill("I am capable and strong");

    await page.getByRole("button", { name: "Save" }).click();

    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);

    // After redirect, switch to check-ins tab to verify count
    await page.getByRole("button", { name: "Check-ins" }).click();
    await expect(page.getByText("1 check-in")).toBeVisible();
  });

  test("creates a basic check-in successfully", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "basic");
    await page.getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("button", { name: "happy" }).click();
    await page.getByRole("button", { name: "exercise" }).click();

    const editorSelector = ".bn-editor";
    await page.waitForSelector(editorSelector, { timeout: 10_000 });
    await page.click(editorSelector);
    await page.keyboard.type("First sentence for the list. Second part here.");

    await page.getByRole("button", { name: "Save" }).click();

    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);
  });

  test("creates an evening check-in successfully", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "evening");

    // Pick mood 6
    await page.getByRole("button", { name: "6", exact: true }).click();

    // Pick emotion
    await page.getByRole("button", { name: "calm" }).click();

    // Pick trigger
    await page.getByRole("button", { name: "music" }).click();

    // Fill at least one highlight
    await page
      .locator("input[placeholder='First highlight…']")
      .first()
      .fill("Completed a big task");

    // Fill what I learned
    await page.getByPlaceholder("Today I learned…").fill("Focus leads to results");

    await page.getByRole("button", { name: "Save" }).click();

    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);
  });

  test("reflections field does not exist in UI; mood, emotions, triggers DO exist", async ({
    page,
  }) => {
    await page.goto("/entries/new/checkin");

    await expect(page.getByText("Reflections")).not.toBeVisible();
    await expect(page.getByText("Mood")).toBeVisible();
    await expect(page.getByText("Emotions")).toBeVisible();
    await expect(page.getByText("Triggers")).toBeVisible();
  });

  test("back button returns to previous page", async ({ page }) => {
    await page.goto("/?view=checkins");
    await page.getByRole("link", { name: "Add new" }).click();
    await page.waitForURL("/entries/new/checkin");

    await page.getByRole("button", { name: "← Back" }).click();

    await page.waitForURL("/?view=checkins");
  });

  test("shows loading overlay and disables form while saving", async ({ page }) => {
    let resolveRequest!: () => void;
    const requestHeld = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await page.route("**/entries/checkins", async (route) => {
      await requestHeld;
      // Use fallback() so this handler passes the request on to the gateway
      // interception fixture (registered earlier) rather than going to network.
      await route.fallback();
    });

    await page.goto("/entries/new/checkin");
    await selectCheckInType(page, "morning");
    await page.getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("button", { name: "happy" }).click();
    await page.getByRole("button", { name: "exercise" }).click();
    await page.locator("input[placeholder='First thing…']").first().fill("Good health");
    await page.locator("input[placeholder='First thing…']").nth(1).fill("Stay focused");
    await page.getByPlaceholder("I am…").fill("I am capable and strong");

    await page.getByRole("button", { name: "Save" }).click();

    // Loading overlay must appear
    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    // Save button shows "Saving…" and is disabled
    await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();

    // Cancel and Back buttons are disabled
    await expect(page.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "← Back" })).toBeDisabled();

    await expect(page.getByTestId("checkin-type")).toBeDisabled();

    resolveRequest();

    await page.waitForURL("/", { timeout: 10_000 });
  });

  test("cannot submit multiple times — second click is ignored during save", async ({ page }) => {
    let callCount = 0;
    let resolveRequest!: () => void;
    const requestHeld = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    await page.route("**/entries/checkins", async (route) => {
      callCount++;
      await requestHeld;
      await route.fallback();
    });

    await page.goto("/entries/new/checkin");
    await selectCheckInType(page, "morning");
    await page.getByRole("button", { name: "8", exact: true }).click();
    await page.getByRole("button", { name: "happy" }).click();
    await page.getByRole("button", { name: "exercise" }).click();
    await page.locator("input[placeholder='First thing…']").first().fill("Grateful");
    await page.locator("input[placeholder='First thing…']").nth(1).fill("Focus");
    await page.getByPlaceholder("I am…").fill("I am ready");

    await page.getByRole("button", { name: "Save" }).click();
    // Button is now disabled — this click should have no effect
    await page.getByRole("button", { name: "Saving…" }).click({ force: true });
    await page.getByRole("button", { name: "Saving…" }).click({ force: true });

    resolveRequest();

    await page.waitForURL("/", { timeout: 10_000 });
    expect(callCount).toBe(1);
  });

  test("switching type resets form fields", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    await selectCheckInType(page, "morning");

    // Fill some morning data
    await page.locator("input[placeholder='First thing…']").first().fill("Health");

    // Switch to evening and back
    await selectCheckInType(page, "evening");
    await selectCheckInType(page, "morning");

    // Fields should be cleared
    const firstInput = page.locator("input[placeholder='First thing…']").first();
    await expect(firstInput).toHaveValue("");
  });

  test("can add a new emotion from check-in form and use it in check-in", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    // Wait for emotions to finish loading (happy is a default emotion that
    // appears once the API call completes) before clicking the add button.
    await expect(page.getByRole("button", { name: "happy" })).toBeVisible();

    // Open "Add emotion" (gray button in Emotions row)
    await page.getByRole("button", { name: "Add emotion" }).click();

    // Modal: fill label, pick type, submit
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New emotion" })).toBeVisible();
    await dialog.getByLabel("Label").fill("e2e-from-checkin");
    await dialog.getByTestId("ref-item-type").click();
    await dialog.getByRole("option", { name: "Pleasant" }).click();
    await dialog.getByRole("button", { name: "Add" }).click();

    // Modal closes; new emotion appears and is auto-selected
    await expect(page.getByRole("button", { name: "e2e-from-checkin" })).toBeVisible({
      timeout: 5000,
    });

    await selectCheckInType(page, "morning");
    await page.getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("button", { name: "exercise" }).click();
    await page.locator("input[placeholder='First thing…']").first().fill("Health");
    await page.locator("input[placeholder='First thing…']").nth(1).fill("Focus");
    await page.getByPlaceholder("I am…").fill("I am grateful");

    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);
  });

  test("can add a new trigger from check-in form and use it in check-in", async ({ page }) => {
    await page.goto("/entries/new/checkin");

    // Wait for triggers to finish loading before clicking the add button.
    await expect(page.getByRole("button", { name: "exercise" })).toBeVisible();

    await page.getByRole("button", { name: "Add trigger" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "New trigger" })).toBeVisible();
    await dialog.getByLabel("Label").fill("e2e-trigger-from-checkin");
    await dialog.getByTestId("ref-item-type").click();
    await dialog.getByRole("option", { name: "Neutral" }).click();
    await dialog.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("button", { name: "e2e-trigger-from-checkin" })).toBeVisible({
      timeout: 5000,
    });

    await selectCheckInType(page, "morning");
    await page.getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("button", { name: "happy" }).click();
    await page.locator("input[placeholder='First thing…']").first().fill("Health");
    await page.locator("input[placeholder='First thing…']").nth(1).fill("Focus");
    await page.getByPlaceholder("I am…").fill("I am ready");

    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("/", { timeout: 10_000 });

    const count = await getEntryCount();
    expect(count).toBe(1);
  });
});
