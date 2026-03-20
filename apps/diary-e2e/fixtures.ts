/**
 * Custom Playwright test fixture that intercepts browser requests to /diary/*
 * and proxies them directly to diary-api, injecting the E2E auth headers that
 * the real gateway would normally add after JWT validation.
 *
 * This keeps production code (api.ts) completely unchanged: the browser still
 * calls relative URLs like /diary/entries, and the fixture transparently rewrites
 * those to http://localhost:BACKEND_PORT/entries with the required headers.
 */
import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { BACKEND_PORT, E2E_SERVICE_TOKEN, E2E_USER_ID } from "./global-setup";

async function setupGatewayInterception(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith("/diary/"),
    async (route) => {
      const originalUrl = new URL(route.request().url());

      // Strip the /diary prefix — same rewrite the gateway does
      const newPath = originalUrl.pathname.replace(/^\/diary/, "") || "/";
      const newUrl = `http://localhost:${BACKEND_PORT}${newPath}${originalUrl.search}`;

      // Forward the original headers, but replace `host` so diary-api sees the
      // correct upstream host, and inject the service token + user ID.
      const headers = { ...route.request().headers() } as Record<string, string>;
      delete headers["host"];
      headers["x-service-token"] = E2E_SERVICE_TOKEN;
      headers["x-user-id"] = E2E_USER_ID;

      try {
        const response = await route.fetch({ url: newUrl, headers });
        await route.fulfill({ response });
      } catch (err) {
        // When a test ends, the browser context closes while some route handlers
        // may still have in-flight fetch requests. These "context closed" errors
        // are expected during teardown and must be swallowed so the teardown
        // itself does not hang or report a spurious test failure.
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("been closed") && !message.includes("was destroyed")) {
          throw err;
        }
      }
    },
  );
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    // Register the gateway interception before the test runs.
    // Tests may add their own page.route() handlers afterwards; since Playwright
    // evaluates handlers in LIFO order, a test's handler runs first and should
    // call route.fallback() (not route.continue()) to pass through to this one.
    await setupGatewayInterception(page);
    await use(page);
  },
});

export { expect };
