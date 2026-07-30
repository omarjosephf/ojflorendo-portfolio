import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { watchPage, hasNoHorizontalOverflow } from "./helpers";

test.describe("Homepage", () => {
  test("loads with the approved identity and no page/CSP errors", async ({
    page,
  }) => {
    const watcher = await watchPage(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "OJ Florendo Rayatchi",
    );
    await expect(page).toHaveTitle(
      /OJ Florendo Rayatchi \| Software Developer & AI-Focused Builder/,
    );
    await expect(
      page.getByRole("link", { name: "Discuss your project" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore my work" }),
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

  test("the decorative hero background never intercepts pointer input", async ({
    page,
  }) => {
    await page.goto("/");
    // The particle-wave canvas covers the whole hero. Playwright's actionability
    // check fails if another element would receive the click, so this asserts
    // the canvas stays pointer-events: none.
    await page.getByRole("link", { name: "Discuss your project" }).click();
    await expect(page).toHaveURL(/#contact$/);
  });

  test("the project case-study route loads", async ({ page }) => {
    const response = await page.goto("/projects/personal-portfolio-website");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Personal Portfolio & Professional Platform",
    );
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
  });
});
