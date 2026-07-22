import { defineConfig, devices } from "@playwright/test";

// E2E runs against a PRODUCTION build (`next start`), not the dev server.
// A build must exist first (CI runs `npm run build` before `npm run test:e2e`;
// locally run `npm run build` first, or use `npm run test:ci`).
const PORT = 3210;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [["html", { open: "never" }], ["list"]]
    : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Chromium-only for a fast, reliable first CI. Firefox/WebKit can be added later.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Explicit opt-in only. By default every run starts and tests a fresh
    // production build, so a stale server can never be silently reused.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000,
    // Safe test environment: point metadata at the local server, no real secrets.
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
