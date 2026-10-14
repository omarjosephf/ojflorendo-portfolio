import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow, watchPage } from "./helpers";

/*
 * The public site has one night palette (ADR-0030): true black, starlight text
 * and star-gold actions, whatever the device setting or a theme saved from
 * /manage. The shared theme preference still exists and still drives /manage;
 * its switching behaviour is covered by the management suite.
 */
const BLACK = "rgb(0, 0, 0)";

test("the public site keeps its night palette whatever the device or saved theme", async ({ page, context, baseURL }) => {
  const watcher = await watchPage(page);
  for (const saved of [undefined, "light", "dark"] as const) {
    await context.clearCookies();
    if (saved) await context.addCookies([{ name: "oj-color-theme", value: saved, url: baseURL! }]);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/");
      await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
      await expect(page.locator("body")).toHaveCSS("background-color", BLACK);
    }
  }
  await expect(page.getByLabel("Portfolio color theme")).toHaveCount(0);
  await page.getByRole("button", { name: "Open E.V", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("color-scheme", "dark");
  expect(await watcher.cspViolations()).toEqual([]);
  expect(watcher.consoleErrors).toEqual([]);
});

test("the night palette is server-rendered without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, colorScheme: "light" });
  await context.addCookies([{ name: "oj-color-theme", value: "light", url: baseURL! }]);
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", BLACK);
  await context.close();
});

for (const colorScheme of ["light", "dark"] as const) for (const width of [390, 1280]) {
  test(`home, chat and case study are accessible with a ${colorScheme} device at ${width}px`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${colorScheme}-home-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Open E.V", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("combobox")).toHaveCount(0);
    await expect(page.getByAltText("Illustrated avatar of E.V")).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${colorScheme}-chat-${width}.png`) });
    await page.goto("/projects/cited");
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
}
