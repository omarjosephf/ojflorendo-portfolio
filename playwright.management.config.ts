import { defineConfig, devices } from "@playwright/test";
const port=process.env.EV_PREVIEW_PORT??"3215";
if(!/^\d{4,5}$/.test(port)||Number(port)>65535)throw new Error("Invalid local preview port");
const origin=`http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e-management", fullyParallel: false, workers: 1, retries: 0,
  forbidOnly: !!process.env.CI, reporter: [["list"]], outputDir: ".ev-preview/test-results",
  use: { baseURL: origin, trace: "retain-on-failure" },
  projects: [{ name: "management-chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview:management", url: `${origin}/manage`, timeout: 120_000,
    reuseExistingServer: false,
    env: { EV_CONVERSATION_STORAGE: "staging", SUPABASE_URL: "", SUPABASE_PUBLISHABLE_KEY: "", SUPABASE_SECRET_KEY: "", EV_CONVERSATION_RECEIPT_SECRET: "", EV_MANAGEMENT_TEST_STORE: "1", ASSISTANT_SERVICE_URL: "", ASSISTANT_SERVICE_SECRET: "", NEXT_PUBLIC_SITE_URL: origin },
  },
});
