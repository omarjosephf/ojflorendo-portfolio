import { test, expect } from "@playwright/test";
import { hasNoHorizontalOverflow, simulateHardwareWebGL, SCENE_VIEWPORT, watchPage } from "./helpers";

const STAGES = ["about", "origin", "teaching", "building", "experience", "now", "education"];

test.describe("About journey (ADR-0030)", () => {
  test("seven stages in order, with the scene as one decorative canvas", async ({ page }) => {
    const watcher = await watchPage(page);
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto("/about");
    const ids = await page.locator("[data-stage]").evaluateAll((elements) => elements.map((el) => el.id));
    expect(ids).toEqual(STAGES);
    const sky = page.locator("canvas");
    await expect(sky).toHaveCount(1);
    await expect(sky).toHaveAttribute("aria-hidden", "true");
    await expect(sky).toHaveCSS("pointer-events", "none");
    await expect(sky).toHaveAttribute("data-engine", "running");
    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("the name stays the page's heading while the stars draw it", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto("/about");
    await expect(page.locator("html")).toHaveAttribute("data-journey-name", "on", { timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Joseph Florendo" })).toHaveCount(1);
    await expect(page.locator("#about-heading")).toHaveCSS("position", "absolute");
  });

  test("on a software renderer there is no scene and the name is painted", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("canvas.jf-sky")).toHaveAttribute("data-engine", "off");
    await expect(page.locator("#about-heading")).toBeVisible();
  });

  test("without JavaScript the name is painted as the heading", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/about");
    await expect(page.locator("#about-heading")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    for (const id of STAGES) await expect(page.locator(`#${id}`)).toBeAttached();
    await context.close();
  });

  test("reduced motion shows still frames and no animation", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/about");
    await expect(page.locator("canvas.jf-sky")).toHaveAttribute("data-engine", "still");
    await page.locator("#building").scrollIntoViewIfNeeded();
    await expect(page.locator("canvas.jf-sky")).toHaveAttribute("data-engine", "still");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test("the journey stops jump to their stages and the page never overflows", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/about");
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
    }
    await page.getByRole("navigation", { name: "Journey" }).getByRole("link", { name: "Building" }).click();
    await expect(page).toHaveURL(/#building$/);
    await expect(page.locator("#building-heading")).toBeInViewport();
  });

  test("teaching is described as co-delivered and Learn Your Way as in progress", async ({ page }) => {
    await page.goto("/about");
    const teaching = page.locator("#teaching li");
    await expect(teaching).toHaveCount(3);
    for (const item of await teaching.all()) await expect(item).toContainText("co-delivered");
    await expect(page.locator("#building")).toContainText("In progress");
  });
});
