import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow, simulateHardwareWebGL, watchPage, SCENE_VIEWPORT } from "./helpers";

const LIVE_TITLE = "Why Automated Evaluation of RAG Needs Refusal Tests, Not Just Accurate Answers";
const LIVE_PATH = "/blog/evaluating-retrieval-systems-refusal-testing-and-quote-integrity";

test.describe("Blog front page (ADR-0027)", () => {
  test("serves the approved header and the live post as the one featured card", async ({ page }) => {
    const watcher = await watchPage(page);
    const response = await page.goto("/blog");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notes from building AI automation.");
    await expect(page.getByText("What I build, how I test it, and what I learn, written up as I go.")).toBeVisible();

    const main = page.locator("main");
    const featured = main.locator("article").filter({ has: page.getByRole("heading", { level: 2, name: LIVE_TITLE }) });
    await expect(featured).toHaveCount(1);
    await expect(featured.getByText("Featured", { exact: true })).toBeVisible();
    await expect(featured.getByText("By Joseph Florendo", { exact: true })).toBeVisible();
    await expect(featured.getByText("Explainer", { exact: true })).toBeVisible();
    // One link per card, named by its title.
    await expect(featured.getByRole("link")).toHaveCount(1);
    await expect(featured.getByRole("link", { name: LIVE_TITLE, exact: true })).toHaveAttribute("href", LIVE_PATH);
    // One post: no row of cards and no older list.
    await expect(main.locator("article")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "More posts" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Older posts" })).toHaveCount(0);

    await expect(page.locator("header nav").getByRole("link", { name: "Blog", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("clicking anywhere on the featured card opens the post", async ({ page }) => {
    await page.goto("/blog");
    // The picture is decoration; the title's link stretches over it, so a
    // click on the picture lands on the link.
    const picture = page.locator("main article").first().locator("[data-cover]");
    await picture.scrollIntoViewIfNeeded();
    const box = (await picture.boundingBox())!;
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href"), [box.x + box.width / 2, box.y + box.height / 2])).toBe(LIVE_PATH);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(new RegExp(`${LIVE_PATH}$`));
  });

  test("is accessible and has no horizontal overflow at representative widths", async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/blog");
      expect(await hasNoHorizontalOverflow(page), `overflow at ${viewport.width}px`).toBe(true);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations, `axe on /blog at ${viewport.width}px`).toEqual([]);
    }
  });

  test("shows the featured title on the first phone screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/blog");
    const box = await page.getByRole("heading", { level: 2, name: LIVE_TITLE }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  });

  test("lays the featured card out in two columns on wide screens and stacks it below 1024 px", async ({ page }) => {
    const layout = async () => {
      const featured = page.locator("main article").first();
      const picture = await featured.locator("[data-cover]").boundingBox();
      const title = await featured.getByRole("heading", { level: 2 }).boundingBox();
      return picture!.x + picture!.width <= title!.x ? "columns" : picture!.y + picture!.height <= title!.y ? "stacked" : "other";
    };
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/blog");
    expect(await layout()).toBe("columns");
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await layout(), `featured layout at ${width}px`).toBe("stacked");
    }
  });

  test("keyboard users reach the card and see a focus ring round it", async ({ page }) => {
    await page.goto("/blog");
    const link = page.locator("main article").first().getByRole("link");
    for (let step = 0; step < 30 && !(await link.evaluate((el) => el === document.activeElement)); step += 1) {
      await page.keyboard.press("Tab");
    }
    await expect(link).toBeFocused();
    const ring = await link.evaluate((el) => {
      const style = getComputedStyle(el, "::after");
      return { outline: style.outlineStyle, width: style.outlineWidth, position: style.position };
    });
    expect(ring).toEqual({ outline: "solid", width: "3px", position: "absolute" });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${LIVE_PATH}$`));
  });

  test("works at 200% zoom without sideways scrolling", async ({ page }) => {
    // A 1280 px window at 200% zoom lays out like a 640 px one.
    await page.setViewportSize({ width: 640, height: 400 });
    await page.goto("/blog");
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    await expect(page.getByRole("link", { name: LIVE_TITLE, exact: true })).toBeVisible();
  });

  test("the sky runs behind the front page, pauses in a hidden tab and resumes", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.goto("/blog");
    const sky = page.locator("canvas.jf-sky");
    await expect(sky).toHaveCount(1);
    await expect(sky).toHaveAttribute("aria-hidden", "true");
    await expect(sky).toHaveCSS("pointer-events", "none");
    await expect(sky).toHaveCSS("position", "fixed");
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

  test("reduced motion shows a still sky and finished pictures", async ({ page }) => {
    await simulateHardwareWebGL(page);
    await page.setViewportSize(SCENE_VIEWPORT);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/blog");
    await expect(page.locator("canvas.jf-sky")).toHaveAttribute("data-engine", "still");
    await page.locator("main article").first().hover();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator("[data-cover]").first()).not.toHaveAttribute("data-seen", /.*/);
  });

  test("a software WebGL renderer draws no sky", async ({ page }) => {
    await page.goto("/blog");
    const sky = page.locator("canvas.jf-sky");
    await expect(sky).toHaveAttribute("data-renderer", "software");
    await expect(sky).toHaveAttribute("data-engine", "off");
  });

  test("a picture plays its one move on first view and again on hover, then rests", async ({ page }) => {
    await page.goto("/blog");
    const frame = page.locator("[data-cover]").first();
    await expect(frame).toHaveAttribute("data-seen", "done", { timeout: 5_000 });
    const running = () =>
      page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
    await expect.poll(running).toBe(0);
    await page.locator("main article").first().hover();
    await expect.poll(running).toBeGreaterThan(0);
    await expect.poll(running, { timeout: 5_000 }).toBe(0);
  });

  test("renders the first agent-written article with its disclosure, type and sources", async ({ page }) => {
    const watcher = await watchPage(page);
    const response = await page.goto(LIVE_PATH);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: LIVE_TITLE })).toBeVisible();
    await expect(page.getByText(/Joseph Florendo reviewed and approved it and is responsible for it/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Joseph Florendo", exact: true })).toHaveAttribute("href", "/about");
    await expect(page.getByText("Explainer", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Project: Cited/ })).toBeVisible();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations, `axe on the article at ${viewport.width}px`).toEqual([]);
    }
    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("does not expose an unknown or future draft slug", async ({ request }) => {
    const response = await request.get("/blog/inside-ev-rag");
    expect(response.status()).toBe(404);
  });
});

test.describe("Blog front page without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps every word and link, with still pictures and no sky", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Notes from building AI automation.");
    await expect(page.getByRole("link", { name: LIVE_TITLE, exact: true })).toHaveAttribute("href", LIVE_PATH);
    await expect(page.getByText("By Joseph Florendo", { exact: true })).toBeVisible();
    await expect(page.getByText("Explainer", { exact: true })).toBeVisible();
    await expect(page.locator("main svg[aria-hidden='true']")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
