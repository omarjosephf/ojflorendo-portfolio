import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow } from "./helpers";

// These tests protect the changed interaction contract, rather than only the
// presence of new classes. Artifacts stay in Playwright's ignored output folder.
test("project frame responds to keyboard focus and opens its case study", async ({ page }) => {
  await page.goto("/");
  const frame = page.locator("#projects .project-frame").first();
  await frame.scrollIntoViewIfNeeded();
  await frame.focus();
  await expect(frame).toBeFocused();
  await expect.poll(() => frame.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  await expect(page.locator("#projects .project-links").first()).toBeVisible();
  await frame.press("Enter");
  await expect(page).toHaveURL(/\/projects\/personal-portfolio-website$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Personal Portfolio");
});

// The owner retired the contact portrait circle, so the link this test used to
// drive no longer exists. The contract it protected does: a keyboard visitor
// must be able to reach the enquiry form from the hero and start typing.
test("the enquiry form is reachable and usable from the keyboard", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Discuss your website", exact: true });
  await cta.focus();
  await expect(cta).toBeFocused();
  await cta.press("Enter");
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator("#contact")).toBeInViewport({ ratio: 0.01 });
  const name = page.getByLabel(/Your name/);
  await name.focus();
  await expect(name).toBeFocused();
  await name.fill("Preview visitor");
  await expect(name).toHaveValue("Preview visitor");
});

test("all portfolio content and project links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  for (const id of ["services", "projects", "approach", "contact"]) {
    await expect(page.locator(`#${id}-heading`)).toBeVisible();
  }
  // The background sections moved to their own route. Sweeping it here keeps
  // the "nothing was lost in the split" guarantee, without JavaScript.
  await page.goto("/about");
  for (const id of ["about", "now", "skills", "experience", "education"]) {
    await expect(page.locator(`#${id}-heading`)).toBeVisible();
  }
  await page.goto("/");
  await page.getByRole("link", { name: "See my work", exact: true }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator("#projects")).toBeInViewport();
  await context.close();
});

test("small phones, tablets and 200 percent reflow retain content without overflow", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 740 }, { width: 720, height: 450 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await hasNoHorizontalOverflow(page), `overflow at ${viewport.width}px`).toBe(true);
    await expect(page.getByRole("link", { name: "Discuss your website", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "See my work", exact: true })).toBeVisible();

    // /about is a public route in its own right and carries the long-form
    // content (timeline, credential tables), so it needs the same sweep.
    await page.goto("/about");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await hasNoHorizontalOverflow(page),
      `overflow on /about at ${viewport.width}px`,
    ).toBe(true);
  }
});

test("case studies retain accessible contrast and imagery at both widths", async ({ page }) => {
  for (const slug of ["personal-portfolio-website", "cited"]) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/projects/${slug}`);
      await expect(page.locator(".case-study-image img")).toBeVisible();
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
  }
});

test("review screenshots show complete desktop and mobile layouts", async ({ page }, testInfo) => {
  const settle = async () => page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
  });
  for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    // Bring lazy project images near the viewport before a full-page capture.
    await page.locator("#projects").scrollIntoViewIfNeeded();
    for (const img of await page.locator("#projects img").all()) {
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle();
    await page.screenshot({ path: testInfo.outputPath(`${name}-home.png`) });
    await page.screenshot({ path: testInfo.outputPath(`${name}-full.png`), fullPage: true });
    for (const section of ["services", "projects", "approach", "contact"]) {
      await page.goto(`/#${section}`);
      await settle();
      await page.screenshot({ path: testInfo.outputPath(`${name}-${section}.png`) });
    }
    await page.goto("/about");
    await settle();
    await page.screenshot({ path: testInfo.outputPath(`${name}-about.png`) });
    await page.screenshot({ path: testInfo.outputPath(`${name}-about-full.png`), fullPage: true });
    await page.goto("/projects/cited");
    await settle();
    await page.screenshot({ path: testInfo.outputPath(`${name}-case-study.png`) });
  }
});
