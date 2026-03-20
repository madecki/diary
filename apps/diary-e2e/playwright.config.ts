import { defineConfig, devices } from "@playwright/test";
import { E2E_SERVICE_TOKEN, E2E_USER_ID } from "./global-setup";

export const WEB_URL = process.env.WEB_URL ?? "http://localhost:4282";
export const API_URL = process.env.API_URL ?? "http://localhost:4283";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup",
  globalTeardown: "./global-teardown",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  // Always 1 — tests share a database and reset it in beforeEach,
  // so parallel workers would cause race conditions.
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // All requests (both `request` fixture and browser fetch) carry the service
    // token and a synthetic test user ID so they pass ActorGuard on diary-api.
    extraHTTPHeaders: {
      "x-service-token": E2E_SERVICE_TOKEN,
      "x-user-id": E2E_USER_ID,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
