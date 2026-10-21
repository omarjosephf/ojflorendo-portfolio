import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { watchPage, hasNoHorizontalOverflow, simulateHardwareWebGL, SCENE_VIEWPORT } from "./helpers";

test.describe("Homepage", () => {
  test("loads with the approved identity and no page/CSP errors", async ({
    page,
  }) => {
    const watcher = await watchPage(page);
    await page.goto("/");

    // The h1 is the name (ADR-0029); the role and the offer follow it.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Joseph Florendo");
    await expect(page.getByText("AI Automation Developer in Windsor, UK")).toBeVisible();
    await expect(page).toHaveTitle(
      /Joseph Florendo \| AI Automation Developer/,
    );
    await expect(
      page.getByRole("link", { name: "Get your app checked" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "See my work" }),
    ).toBeVisible();

    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("the skip link is the first focusable element", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toContainText(/skip/i);
  });

  test("no horizontal overflow on mobile and desktop widths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    expect(await hasNoHorizontalOverflow(page)).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });

  // ADR-0030: one decorative canvas behind the home page, never in the way.
  test("the star sky is one decorative canvas behind the page, with no large chunk", async ({ page }) => {
    await simulateHardwareWebGL(page);
    // Both sides of the 768 px compact breakpoint, kept short (SCENE_VIEWPORT).
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: SCENE_VIEWPORT.height });
      await page.goto("/");
      await page.waitForLoadState("load");
      const sky = page.locator("canvas");
      await expect(sky).toHaveCount(1);
      await expect(sky).toHaveAttribute("aria-hidden", "true");
      await expect(sky).toHaveCSS("pointer-events", "none");
      await expect(sky).toHaveCSS("position", "fixed");
      await expect(sky).toHaveAttribute("data-engine", "running");
      const oversizedChunks = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => /chunks/.test(r.name) && (r as PerformanceResourceTiming).transferSize > 150_000).length);
      expect(oversizedChunks).toBe(0);
    }
  });

  test("the star sky pauses in a hidden tab and resumes", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto("/");
    const sky = page.locator("canvas.jf-sky");
    await expect(sky).toHaveAttribute("data-engine", "running");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(sky).toHaveAttribute("data-engine", "paused");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(sky).toHaveAttribute("data-engine", "running");
  });

  test("a software WebGL renderer draws no sky, like no WebGL at all", async ({ page }) => {
    await page.goto("/");
    const sky = page.locator("canvas.jf-sky");
    await expect(sky).toHaveAttribute("data-renderer", "software");
    await expect(sky).toHaveAttribute("data-engine", "off");
  });

  // ADR-0027: the blog front page shares the sky; post pages and case studies keep none.
  test("other public pages carry no star canvas", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("load");
    await expect(page.locator("canvas.jf-sky")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(1);
    for (const path of ["/blog/evaluating-retrieval-systems-refusal-testing-and-quote-integrity", "/projects/cited"]) {
      await page.goto(path);
      await page.waitForLoadState("load");
      await expect(page.locator("canvas")).toHaveCount(0);
    }
  });
  // The hero's one orchestrated moment: an example build check plays once,
  // step by step, then rests with every step visible. Replay repeats it.
  test("the example run plays once, then rests", async ({ page }) => {
    await page.goto("/");
    const steps = page.locator(".jf-run-step");
    await expect(steps).toHaveCount(4);
    // Every step's text is visible at all times; only the markers change.
    for (const step of await steps.all()) await expect(step).toBeVisible();
    await expect(page.locator('.jf-run-step[data-state="done"]')).toHaveCount(4, { timeout: 10_000 });
    const replay = page.getByRole("button", { name: "Replay" });
    await expect(replay).toBeEnabled();
    await expect
      .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length))
      .toBe(0);
    await replay.click();
    await expect(page.locator('.jf-run-step[data-state="done"]')).not.toHaveCount(4);
    await expect(page.locator('.jf-run-step[data-state="done"]')).toHaveCount(4, { timeout: 10_000 });
  });

  test("reduced motion is complete and static", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#services-heading")).toBeVisible();
    await expect(page.locator('.jf-run-step[data-state="done"]')).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Replay" })).toHaveCount(0);
    // The sky draws one still frame and runs no loop.
    await expect(page.locator("canvas.jf-sky")).toHaveAttribute("data-engine", "still");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test("the project enquiry action is immediately available", async ({
    page,
  }) => {
    await page.goto("/");
    // Playwright's actionability check fails if another element would receive
    // the click, so this also proves no background layer intercepts it.
    await page.getByRole("link", { name: "Get your app checked" }).click();
    await expect(page).toHaveURL(/#contact$/);
  });

  test("the project case-study route loads", async ({ page }) => {
    const response = await page.goto("/projects/personal-portfolio-website");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Personal Portfolio & Professional Platform",
    );
  });

  test("project card imagery loads and is not blocked by the CSP", async ({
    page,
  }) => {
    const watcher = await watchPage(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const image = page.locator('#projects img[src^="/images/projects/"]').first();
    await expect(image).toBeVisible();

    // The card is below the fold and the image is `loading="lazy"`, so it is
    // deliberately not fetched until it approaches the viewport. Scrolling is
    // what makes this a test of the image rather than of lazy loading.
    await image.scrollIntoViewIfNeeded();

    // `complete` alone is true for a failed load, so poll the decoded size:
    // a broken image reports naturalWidth 0. This is what would catch a bad
    // path, a missing file, or a CSP block.
    await expect
      .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("axe: no accessibility violations on desktop and mobile", async ({
    page,
  }) => {
    await page.goto("/");
    const desktop = await new AxeBuilder({ page }).analyze();
    expect(desktop.violations).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const mobile = await new AxeBuilder({ page }).analyze();
    expect(mobile.violations).toEqual([]);

    // /about is a landing route in its own right, so it carries the same bar.
    for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.goto("/about");
      const about = await new AxeBuilder({ page }).analyze();
      expect(about.violations, `axe on /about at ${size.width}px`).toEqual([]);
    }
  });
});
