import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { watchPage } from "../e2e/helpers";

test("overview, reporting period and real source inspection", async ({ page }) => {
  const watcher = await watchPage(page);
  await page.goto("/manage");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByText("18 sample conversations in this window")).toBeVisible();
  await page.getByLabel("Reporting period").selectOption("30");
  await expect(page.getByText("24 sample conversations in this window")).toBeVisible();
  await page.getByRole("button", { name: "Sources & chunks", exact: true }).click();
  await expect(page.getByText("BAAI/bge-small-en-v1.5 · 384 dimensions")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Over the token limit" }).locator("..").locator("..")).toContainText("0");
  await page.getByRole("button", { name: /project cited/i }).click();
  await expect(page.getByText("project-cited.md", { exact: true })).toBeVisible();
  await page.locator("details").first().locator("summary").click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  expect(watcher.consoleErrors).toEqual([]);
});

test("conversation filtering and source trace follow the selected exchange", async ({ page }) => {
  await page.goto("/manage"); await page.getByRole("button", { name: "Conversations", exact: true }).click();
  await page.getByLabel("Search conversations").fill("hourly rate");
  await expect(page.getByText("3 results", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample guest 09" })).toBeVisible();
  await page.getByLabel("Search conversations").fill("no matching conversation");
  await expect(page.getByText("No conversation matches these filters.")).toBeVisible();
  await page.getByLabel("Search conversations").fill(""); await page.getByLabel("Conversation outcome").selectOption("fallback");
  await expect(page.getByText("2 results", { exact: true })).toBeVisible();
  await page.getByText("Inspect retrieval trace", { exact: true }).first().click();
  await expect(page.getByText("This synthetic event does not indicate a live provider call.").first()).toBeVisible();
});

test("question triage and a draft survive a real page reload", async ({ page }) => {
  await page.goto("/manage"); await page.getByRole("button", { name: /3 questions · 3 conversations What is OJ's hourly rate/ }).click();
  await page.getByLabel("Review note", { exact: true }).fill("Synthetic QA exercise: ask the owner for a public source before adding a rate.");
  await page.getByLabel("Review status", { exact: true }).selectOption("investigating");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved to this local workspace.");
  await page.getByRole("button", { name: "Prepare knowledge draft", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("What is OJ's hourly rate?");
  const title = `QA draft ${Date.now()}`;
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Knowledge content", { exact: true }).fill("Synthetic test draft. This is not a public rate or an approved statement.");
  await page.getByLabel("Source / owner confirmation", { exact: true }).fill("Automated test fixture; no owner confirmation is claimed.");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved to this local workspace.");
  await page.reload(); await page.getByRole("button", { name: "Knowledge drafts", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByLabel("Knowledge content", { exact: true })).toHaveValue("Synthetic test draft. This is not a public rate or an approved statement.");
  await page.getByRole("button", { name: /Questions & gaps/ }).click();
  await page.getByRole("button", { name: /What is OJ's hourly rate\? Missing information/ }).click();
  await expect(page.getByLabel("Review note", { exact: true })).toHaveValue("Synthetic QA exercise: ask the owner for a public source before adding a rate.");
});

test("failed saving preserves the editor and does not claim success", async ({ page }) => {
  await page.goto("/manage"); await page.getByRole("button", { name: "Add knowledge", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved test draft");
  await page.getByLabel("Knowledge content", { exact: true }).fill("Keep this editor text after the write fails.");
  await page.getByLabel("Source / owner confirmation", { exact: true }).fill("Synthetic test");
  await page.route("**/api/management/workspace", async (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Not saved. Storage is unavailable." }) }));
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not saved." })).toContainText("Not saved.");
  await expect(page.getByLabel("Knowledge content", { exact: true })).toHaveValue("Keep this editor text after the write fails.");
  await expect(page.getByRole("status")).not.toContainText("Saved");
});

test("private API rejects foreign origins, bad bodies and caller-controlled hostnames", async ({ request,baseURL }) => {
  const path = "/api/management/workspace";
  expect((await request.get(path)).headers()["cache-control"]).toContain("no-store");
  expect((await request.post(path, { headers: { Origin: "https://attacker.example" }, data: {} })).status()).toBe(403);
  expect((await request.post(path, { headers: { Origin: baseURL! }, data: {} })).status()).toBe(400);
  expect((await request.post(path, { headers: { Origin: baseURL!, "Content-Type": "application/json" }, data: "x".repeat(100001) })).status()).toBe(413);
  expect((await request.get(path, { headers: { Host: "public.example" } })).status()).toBe(404);
  expect((await request.get("/manage", { headers: { Host: "public.example" } })).status()).toBe(404);
});

for (const theme of ["light", "dark"] as const) for (const width of [1280, 390]) {
  test(`all management sections are accessible and fit ${width}px in ${theme}`, async ({ page }) => {
    // Six full axe scans measured 28.7s on an idle machine, against Playwright's
    // 30-second default — roughly a second of headroom, so it failed under load
    // for timing reasons rather than a real regression. This declares the work's
    // measured cost instead of trimming the checks: all six sections are still
    // scanned, and a genuine failure still fails. Re-measure before lowering it.
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 }); await page.goto("/manage");
    await page.getByLabel("Workspace color theme").selectOption(theme);
    await page.reload();
    await expect(page.getByLabel("Workspace color theme")).toHaveValue(theme);
    for (const section of ["Overview", "Conversations", "Questions & gaps", "Knowledge drafts", "Sources & chunks", "Quality & operations"]) {
      await page.getByRole("navigation", { name: "Management sections" }).getByRole("button", { name: new RegExp(section.replace(/[&]/g, "&")) }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(section);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations, `${section} accessibility`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });

  // The full-page screenshot is deliberately its own test. Six axe scans and a
  // fullPage capture in one test left four to seven seconds of headroom against
  // the default 30-second timeout on an idle machine, so it failed under load
  // for timing reasons rather than a real regression. Splitting gives the
  // capture its own budget without raising any tolerance or dropping a check.
  test(`overview renders for review at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/manage");
    await page.getByLabel("Workspace color theme").selectOption(theme);
    await page.reload();
    await expect(page.getByLabel("Workspace color theme")).toHaveValue(theme);
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");
    await page.screenshot({ path: `.ev-preview/overview-${theme}-${width}.png`, fullPage: true });
  });
}

test("navigation to the public portfolio restores its own layout", async ({ page,baseURL }) => {
  await page.goto("/manage"); await page.getByLabel("Workspace color theme").selectOption("dark");
  await page.getByRole("link", { name: "View portfolio", exact: true }).click();
  await expect(page.getByLabel("Portfolio color theme")).toHaveValue("dark");
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(page.getByRole("button", { name: "Open E.V", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Management sections" })).toHaveCount(0);
});
