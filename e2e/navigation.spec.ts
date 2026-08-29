import { test, expect, type Page } from "@playwright/test";
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

// ---------------------------------------------------------------------------
// Regression coverage for the v1.1 case-study navigation bug: the persistent
// Nav froze its active link, and Next's router concatenated the hash across a
// sub-route round trip ("/#projects#projects").
//
// Active state is exposed by the desktop primary-nav links via
// `aria-current="true"` — those links live in the DOM at every viewport (they
// are only visually hidden on mobile), so a CSS/href locator reads the active
// section regardless of viewport. The mobile menu markup is a sibling OUTSIDE
// `nav[aria-label="Primary"]`, so these locators never collide with it.
// Timing is handled by auto-retrying assertions (toHaveURL / toHaveAttribute /
// toBeInViewport), so no fixed waits are needed for IntersectionObserver.
// ---------------------------------------------------------------------------

const primaryNav = (page: Page) =>
  page.getByRole("navigation", { name: "Primary" });

/** The desktop primary-nav link for a section id (carries `aria-current`). */
const activeLink = (page: Page, id: string) =>
  page.locator(`nav[aria-label="Primary"] a[href="/#${id}"]`);

/** Any currently-active primary-nav link (there is at most one). */
const anyActive = (page: Page) =>
  page.locator('nav[aria-label="Primary"] a[aria-current="true"]');

/**
 * Deterministically activate `id`'s primary-nav link by driving a real
 * IntersectionObserver threshold crossing.
 *
 * The app's active-state observer watches a thin centre band
 * (rootMargin "-45% 0px -50% 0px") with coarse ratio thresholds [0,.25,.5,1].
 * Sections are far taller than that band, so a section's intersectionRatio is
 * tiny (~0.02) and never leaves the (0,.25) bucket: nudging the band *within* a
 * section that is already intersecting crosses no threshold, fires no callback,
 * and leaves `active` on its previous value. Real users scroll continuously (or
 * via smooth-scroll), which does cross 0 at each section boundary, so this only
 * affects instant test jumps — it is not a production/UX defect.
 *
 * Deterministic steps: (0) wait for the network to settle — the dynamically
 * imported 3D hero and web fonts shift layout after load, which otherwise moves
 * the target out of where we scrolled it; (1) scroll the target fully out of the
 * band; (2) wait one observation cycle of a mirror IntersectionObserver using
 * the *same* rootMargin, i.e. the frame in which the app's observer records the
 * out-of-band (ratio 0) state; (3) centre the target on the viewport's true
 * midpoint, computed via scrollTo so scroll-padding-top cannot offset it — now a
 * real 0 -> >0 crossing the app's observer must report. Instant scrolls, no
 * fixed delays, no retries; test-only — the app is unchanged.
 */
async function activateViaScroll(page: Page, id: string) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async (sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) throw new Error(`missing #${sectionId}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    // One observation cycle after the reset: a mirror observer with the app's
    // rootMargin fires its initial callback once layout is sampled, which is the
    // same frame the app's observer records the target at ratio 0.
    await new Promise<void>((resolve) => {
      const io = new IntersectionObserver(() => {
        io.disconnect();
        resolve();
      }, { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] });
      io.observe(el);
    });
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top, behavior: "instant" });
  }, id);
}

/** Assert the settled URL carries at most one literal '#'. */
function expectSingleHash(page: Page) {
  const hashes = page.url().split("#").length - 1;
  expect(hashes, `at most one '#' in ${page.url()}`).toBeLessThanOrEqual(1);
}

const CASE_STUDY = /\/projects\/personal-portfolio-website$/;

/**
 * The portfolio case study specifically, not "whichever case study is first".
 *
 * These tests assert a round trip to CASE_STUDY above, so the link they click
 * has to be the one that goes there. A looser pattern matched every project
 * card, which was unambiguous only while exactly one project had a case study —
 * it broke the moment a second was added, in a way that looked like a
 * navigation regression rather than an over-broad locator.
 */
const PORTFOLIO_CASE_STUDY_LINK = /Read the Personal Portfolio .* case study/i;

test.describe("Case study round trip (v1.1)", () => {
  test("active re-derives from the visible section and the hash stays single", async ({
    page,
  }) => {
    await page.goto("/#projects");
    await page.getByRole("link", { name: PORTFOLIO_CASE_STUDY_LINK }).click();
    await expect(page).toHaveURL(CASE_STUDY);

    // No landing nav item is active on a sub-route.
    await expect(anyActive(page)).toHaveCount(0);

    await page.getByRole("link", { name: /Back to all projects/i }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    // Re-activate Projects from scratch — proof the observer is live after the
    // round trip: reset out of the observer band, then centre it back in.
    await activateViaScroll(page, "projects");
    await expect(activeLink(page, "projects")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("repeated section <-> case-study cycles never accumulate the hash", async ({
    page,
  }) => {
    await page.goto("/");
    for (let i = 0; i < 3; i++) {
      await primaryNav(page)
        .getByRole("link", { name: "Projects", exact: true })
        .click();
      await expect(page, `cycle ${i}: at projects`).toHaveURL(/\/#projects$/);
      await page.getByRole("link", { name: PORTFOLIO_CASE_STUDY_LINK }).click();
      await expect(page, `cycle ${i}: case study`).toHaveURL(CASE_STUDY);
      await page.getByRole("link", { name: /Back to all projects/i }).click();
      await expect(page, `cycle ${i}: back`).toHaveURL(/\/#projects$/);
      expectSingleHash(page);
    }
  });

  test("browser Back/Forward around a case study keeps a single valid fragment", async ({
    page,
  }) => {
    await page.goto("/");

    await primaryNav(page)
      .getByRole("link", { name: "About", exact: true })
      .click();
    await expect(page).toHaveURL(/\/#about$/);
    expectSingleHash(page);

    await primaryNav(page)
      .getByRole("link", { name: "Projects", exact: true })
      .click();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    await page.getByRole("link", { name: PORTFOLIO_CASE_STUDY_LINK }).click();
    await expect(page).toHaveURL(CASE_STUDY);
    expectSingleHash(page);
    await expect(anyActive(page)).toHaveCount(0); // no nav item active on sub-route

    // Back -> /#projects
    await page.goBack();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    // Back -> /#about
    await page.goBack();
    await expect(page).toHaveURL(/\/#about$/);
    expectSingleHash(page);

    // The observer is responsive again after returning to the homepage: driving
    // a section into view activates its nav link.
    await activateViaScroll(page, "experience");
    await expect(activeLink(page, "experience")).toHaveAttribute(
      "aria-current",
      "true",
    );

    // Forward -> /#projects
    await page.goForward();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    // Forward -> case study
    await page.goForward();
    await expect(page).toHaveURL(CASE_STUDY);
    expectSingleHash(page);
    await expect(anyActive(page)).toHaveCount(0);
  });

  test("mobile: case-study round trip re-derives active with no hash accumulation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Reach Projects through the mobile menu.
    await page.getByRole("button", { name: /menu/i }).click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    await expect(menu).toBeHidden(); // menu closes on navigation
    expectSingleHash(page);

    // Open the case study, then return.
    await page.getByRole("link", { name: PORTFOLIO_CASE_STUDY_LINK }).click();
    await expect(page).toHaveURL(CASE_STUDY);
    expectSingleHash(page);

    await page.getByRole("link", { name: /Back to all projects/i }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    // Scrolling away releases Projects; scrolling back reactivates it. (The
    // active flag lives on the desktop links, present in the DOM at any width.)
    await activateViaScroll(page, "projects");
    await expect(activeLink(page, "projects")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("refreshing after returning to /#projects stays valid and responsive", async ({
    page,
  }) => {
    await page.goto("/#projects");
    await page.getByRole("link", { name: PORTFOLIO_CASE_STUDY_LINK }).click();
    await expect(page).toHaveURL(CASE_STUDY);
    await page.getByRole("link", { name: /Back to all projects/i }).click();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);

    // Reload: one valid fragment, correct section in view, observer responsive.
    await page.reload();
    await expect(page).toHaveURL(/\/#projects$/);
    expectSingleHash(page);
    await expect(page.locator("#projects")).toBeInViewport({ ratio: 0.01 });

    // Driving a section into view re-activates its link — proof the observer is
    // live after a full reload too.
    await activateViaScroll(page, "experience");
    await expect(activeLink(page, "experience")).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});
