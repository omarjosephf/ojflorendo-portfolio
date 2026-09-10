import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow, watchPage } from "./helpers";

// No live assistant requests: theme checks only open its local panel.
test("explicit themes survive reload and agree across portfolio, chat and tabs", async ({ page, context }) => {
  const watcher = await watchPage(page);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByLabel("Portfolio color theme").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  const other = await context.newPage(); await other.goto("/");
  await expect(other.getByLabel("Portfolio color theme")).toHaveValue("dark");
  await page.getByRole("button", { name: "Open E.V", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("color-scheme", "dark");
  await expect(dialog.getByRole("combobox")).toHaveCount(0);
  const darkPanel = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(dialog).toHaveCSS("background-color", darkPanel);
  await other.getByLabel("Portfolio color theme").selectOption("light");
  await expect(dialog).toHaveCSS("color-scheme", "light");
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(darkPanel);
  await expect(other.getByLabel("Portfolio color theme")).toHaveValue("light");
  await expect(page.getByLabel("Portfolio color theme")).toHaveValue("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const cookie = (await context.cookies()).find((item) => item.name === "oj-color-theme");
  expect(cookie).toMatchObject({ value: "light", sameSite: "Lax", path: "/" });
  expect(await watcher.cspViolations()).toEqual([]);
  expect(watcher.consoleErrors).toEqual([]);
});

test("System follows device changes without creating a preference cookie", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "dark" }); await page.goto("/");
  await expect(page.getByLabel("Portfolio color theme")).toHaveValue("system");
  await page.getByRole("button", { name: "Open E.V", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const dark = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
  const darkPanel = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(dark);
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(darkPanel);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(dialog).toHaveCSS("background-color", darkPanel);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  expect((await context.cookies()).find((item) => item.name === "oj-color-theme")).toBeUndefined();
});

test("saved dark preference is server-rendered even without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: "light" });
  await context.addCookies([{ name: "oj-color-theme", value: "dark", url: baseURL! }]);
  const page = await context.newPage(); await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByLabel("Portfolio color theme")).toHaveValue("dark");
  await context.addCookies([{ name: "oj-color-theme", value: "invalid", url: baseURL! }]);
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await context.close();
});

test("blocked preference storage reports the failure but still switches the page", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, "cookie", { configurable: true, get: () => "", set: () => {} }));
  await page.goto("/"); await page.getByLabel("Portfolio color theme").selectOption("dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("status").filter({ hasText: "could not save" })).toBeVisible();
});

for (const theme of ["light", "dark"] as const) for (const width of [390, 1280]) {
  test(`${theme} portfolio, case study and chat are accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto("/");
    await page.getByLabel("Portfolio color theme").selectOption(theme);
    await page.evaluate(() => document.fonts.ready);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-home-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Open E.V", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("combobox")).toHaveCount(0);
    await expect(page.getByAltText("Illustrated avatar of E.V")).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-chat-${width}.png`) });
    await page.goto("/projects/cited");
    await expect(page.getByLabel("Portfolio color theme")).toHaveValue(theme);
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
}
