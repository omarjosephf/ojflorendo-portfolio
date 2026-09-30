import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow, watchPage } from "./helpers";

test.describe("Blog foundation", () => {
  test("serves the blog index with the published article and active navigation", async ({
    page,
  }) => {
    const watcher = await watchPage(page);
    const response = await page.goto("/blog");

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Notes from building useful software.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Why Automated Evaluation of RAG Needs Refusal Tests, Not Just Accurate Answers",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.locator("header nav").getByRole("link", { name: "Blog", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("is accessible and has no horizontal overflow at representative widths", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/blog");
      expect(await hasNoHorizontalOverflow(page)).toBe(true);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations, `axe on /blog at ${viewport.width}px`).toEqual([]);
    }
  });

  test("renders the first agent-written article with its disclosure and sources", async ({
    page,
  }) => {
    const watcher = await watchPage(page);
    const response = await page.goto("/blog/evaluating-retrieval-systems-refusal-testing-and-quote-integrity");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Why Automated Evaluation of RAG Needs Refusal Tests, Not Just Accurate Answers",
      }),
    ).toBeVisible();
    await expect(page.getByText(/OJ Florendo reviewed and approved it and is responsible for it/)).toBeVisible();
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
