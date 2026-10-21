import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { watchPage, hasNoHorizontalOverflow } from "./helpers";

/**
 * The launch-gap pages (roadmap row JF-2): the privacy notice, the questions
 * section and the 404 in the night look.
 */
test.describe("Launch pages", () => {
  test("the privacy notice loads, is linked from the footer and the form, and passes axe", async ({ page }) => {
    const watcher = await watchPage(page);
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy notice");
    await expect(page.getByRole("heading", { level: 2, name: "The enquiry form" })).toBeVisible();
    await expect(page.getByText(/through Resend/)).toBeVisible();
    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);

    for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await page.goto("/privacy");
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, `axe on /privacy at ${size.width}px`).toEqual([]);
    }

    await page.goto("/");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy notice" })).toHaveAttribute("href", "/privacy");
    await expect(page.locator("#contact").getByRole("link", { name: /privacy notice/ })).toHaveAttribute("href", "/privacy");
  });

  test("the home page answers the common questions before the contact form", async ({ page }) => {
    await page.goto("/");
    const questions = page.locator("#questions");
    await expect(questions.getByRole("heading", { level: 2, name: "Your questions" })).toBeVisible();
    await expect(questions.getByRole("heading", { level: 3 })).toHaveCount(8);
    const order = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("main section[id]")].map((section) => section.id);
      return { questions: ids.indexOf("questions"), contact: ids.indexOf("contact") };
    });
    expect(order.questions).toBeGreaterThan(-1);
    expect(order.questions).toBeLessThan(order.contact);
  });

  test("an unknown address returns 404 with the site's navigation and passes axe", async ({ page }) => {
    const watcher = await watchPage(page);
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't here");
    await expect(page.getByRole("navigation").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the home page" })).toHaveAttribute("href", "/");
    expect(watcher.consoleErrors.filter((message) => !message.includes("404"))).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("a missing blog post shows the same 404 inside the site layout, once", async ({ page }) => {
    const response = await page.goto("/blog/no-such-post");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't here");
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  });
});
