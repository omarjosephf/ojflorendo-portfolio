import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sections = ["about", "experience", "projects", "now", "contact"] as const;

test.describe("Navigation", () => {
  for (const id of sections) {
    test(`hash link #${id} settles the section in view`, async ({ page }) => {
      await page.goto(`/#${id}`);
      // toBeInViewport auto-retries, so this is robust against reveal/scroll
      // timing (including the known #now settle artefact).
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.01 });
    });
  }

  test("a primary nav link scrolls to its section", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Experience", exact: true })
      .click();
    await expect(page.locator("#experience")).toBeInViewport({ ratio: 0.01 });
  });

  test("the mobile menu opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: /menu/i }).click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();

    // The opened menu must itself be accessible.
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});
