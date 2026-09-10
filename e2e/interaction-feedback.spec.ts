import { test, expect, type Page } from "@playwright/test";
import { watchPage } from "./helpers";

declare global {
  interface Window {
    __interactionAnimations: Array<{ kind: string; duration: number; iterations: number }>;
  }
}

// Record real Web Animations so short effects remain observable on slow CI hosts.
// The browser still runs the animations normally; no production timing is changed.
async function observeFeedback(page: Page) {
  await page.addInitScript(() => {
    window.__interactionAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const result = animate.call(this, frames, options);
      const kind = this.matches(".portrait-mark") ? "portrait" : this.closest(".click-feedback") ? "burst" : "";
      if (kind) {
        const timing = result.effect!.getTiming();
        window.__interactionAnimations.push({ kind, duration: Number(timing.duration), iterations: Number(timing.iterations) });
      }
      return result;
    };
  });
}

test("click feedback is finite, bounded and does not delay navigation or violate CSP", async ({ page }) => {
  const watcher = await watchPage(page);
  await observeFeedback(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 6; i++) await page.locator(".hero-meta").click({ position: { x: 200, y: 5 } });
  const recorded = await page.evaluate(() => window.__interactionAnimations);
  expect(recorded.length).toBeGreaterThan(0);
  expect(recorded.every(a => a.iterations === 1 && a.duration <= 500)).toBe(true);
  const burst = page.locator(".click-feedback");
  await expect(burst).toHaveCSS("pointer-events", "none");
  expect(await burst.evaluate(el => el.getAnimations({ subtree: true }).length)).toBeLessThanOrEqual(1);
  await expect.poll(() => burst.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByRole("link", { name: "See my work", exact: true }).click();
  await expect(page).toHaveURL(/#projects$/);
  expect(await watcher.cspViolations()).toEqual([]);
  expect(watcher.consoleErrors).toEqual([]);
});

test("writing, selection, consent and the assistant do not trigger the click accent", async ({ page }) => {
  await observeFeedback(page);
  await page.goto("/#contact");
  await page.waitForLoadState("networkidle");
  const name = page.getByLabel(/Your name/);
  await name.click();
  await name.fill("Preview visitor");
  await name.press("ControlOrMeta+a");
  expect(await name.evaluate(el => (el as HTMLInputElement).selectionEnd! - (el as HTMLInputElement).selectionStart!)).toBe(15);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Open E.V", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => window.__interactionAnimations)).toEqual([]);
});

// The navigation and contact photo circles were retired by the owner, so the
// ".portrait-trigger" elements this test used to tap no longer render. What it
// exists to protect is unchanged: a touch activates a control exactly once, the
// mobile menu opens and closes, and phone reveals stay static.
test("touch activates header links and the mobile menu exactly once", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await observeFeedback(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: /home$/ }).first().tap();
  await expect(page).toHaveURL(/#top$/);
  await page.getByRole("button", { name: "Open menu", exact: true }).tap();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.getByRole("button", { name: "Close menu", exact: true }).tap();
  await expect(page.locator("#mobile-menu")).toBeHidden();
  await page.getByRole("link", { name: "Discuss your website", exact: true }).tap();
  await expect(page).toHaveURL(/#contact$/);
  // A tap must never queue more than the single bounded burst.
  const bursts = await page.evaluate(() => window.__interactionAnimations.filter(a => a.kind === "burst"));
  expect(bursts.every(a => a.iterations === 1 && a.duration <= 500)).toBe(true);
  await expect(page.locator("#projects .reveal").first()).toHaveCSS("animation-name", "none");
  await context.close();
});

test("reduced motion cancels feedback immediately and preserves keyboard navigation", async ({ page }) => {
  await observeFeedback(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator(".hero-meta").click({ position: { x: 200, y: 5 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.locator(".click-feedback").evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  const before = await page.evaluate(() => window.__interactionAnimations.length);
  const home = page.getByRole("link", { name: /home$/ }).first();
  await home.focus();
  await home.press("Enter");
  await expect(page).toHaveURL(/#top$/);
  // Keyboard navigation still works, and reduced motion records no new effect.
  expect(await page.evaluate(() => window.__interactionAnimations.length)).toBe(before);
});
