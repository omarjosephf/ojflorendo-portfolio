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

  test("phones load no three.js chunk (ADR-0003)", async ({ page }) => {
    // The whole mobile Lighthouse budget rests on `useSceneEnabled()` refusing
    // to mount either WebGL scene below 768px, and nothing else asserts it.
    //
    // This deliberately does NOT assert the absence of a canvas. Phones have
    // carried one (ADR-0008, withdrawn) and will again (ADR-0009), so the count
    // is not the invariant. What must never come back is the ~234 KiB three.js
    // chunk, which is what the budget is actually about. The desktop half is
    // not decoration -- without it, a gate that loaded nothing anywhere would
    // still pass.
    const bigChunks = (p: typeof page) =>
      p.evaluate(
        () =>
          performance
            .getEntriesByType("resource")
            .filter(
              (r) => /chunks/.test(r.name) && (r as PerformanceResourceTiming).transferSize > 150_000,
            ).length,
      );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("load");
    expect(await bigChunks(page)).toBe(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("canvas")).not.toHaveCount(0);
    expect(await bigChunks(page)).toBeGreaterThan(0);
  });

  test("the phone wave covers the screen width (ADR-0009)", async ({ page }) => {
    // ADR-0008 was withdrawn because the field was a finite plane that tapered
    // to a point, covering barely a third of the screen at mid-depth and
    // rendering as a fan. Nothing caught it: every check asserted cost, motion
    // or the presence of a canvas, never that the water covered the screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.waitForTimeout(2000);

    const withWave = (await page.screenshot()).toString("base64");
    // CSP forbids an injected <style>; a CSSOM rule is not blocked.
    await page.evaluate(() => {
      const sheet = document.styleSheets[0];
      sheet.insertRule(
        ".site-wave{display:none !important}",
        sheet.cssRules.length,
      );
    });
    await page.waitForTimeout(300);
    const without = (await page.screenshot()).toString("base64");

    const span = await page.evaluate(async ([a, b]) => {
      const load = (data: string) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = `data:image/png;base64,${data}`;
        });
      const pixels = (img: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const [pa, pb] = [pixels(ia), pixels(ib)];
      const w = pa.width;
      // A band rather than a single row: the near field is sparse by design, so
      // one row of pixels can fall between points and read as empty.
      const columns = new Uint8Array(w);
      const top = Math.round(pa.height * 0.45);
      const bottom = Math.round(pa.height * 0.7);
      for (let y = top; y < bottom; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          let d = 0;
          for (let k = 0; k < 3; k++) {
            d = Math.max(d, Math.abs(pa.data[i + k] - pb.data[i + k]));
          }
          if (d >= 2) columns[x] = 1;
        }
      }
      let min = w;
      let max = -1;
      for (let x = 0; x < w; x++) {
        if (columns[x]) {
          if (x < min) min = x;
          if (x > max) max = x;
        }
      }
      return max < 0 ? 0 : Math.round((100 * (max - min)) / w);
    }, [withWave, without]);

    // Measured at 100%. The withdrawn version scored about 35% here.
    expect(span).toBeGreaterThanOrEqual(90);
  });

  test("the phone ambient background visibly moves (ADR-0003 follow-up)", async ({
    page,
  }) => {
    // A version of this animation shipped that passed every gate and was
    // invisible: the gradients were wider than the phone, so drifting them
    // changed no pixel by more than 3/255. Cost was measured, effect was not.
    // This asserts the effect, by diffing two frames half a cycle apart.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("load");

    // Freeze everything, then seek only the ambient layers, so the hero rings
    // and scroll reveals cannot contribute to the difference.
    const seek = (time: number) =>
      page.evaluate((t) => {
        for (const a of document.getAnimations()) {
          a.pause();
          // `animationName` lives on CSSAnimation, not the Animation base type.
          const name = a instanceof CSSAnimation ? a.animationName : "";
          if (name.startsWith("ambient-drift")) a.currentTime = t;
        }
      }, time);

    await seek(0);
    const first = (await page.screenshot()).toString("base64");
    await seek(22000); // half of the 44s cycle: maximum displacement
    const second = (await page.screenshot()).toString("base64");

    const maxChange = await page.evaluate(async ([a, b]) => {
      const load = (data: string) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = `data:image/png;base64,${data}`;
        });
      const pixels = (img: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      };
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const [pa, pb] = [pixels(ia), pixels(ib)];
      let max = 0;
      for (let i = 0; i < pa.data.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          const d = Math.abs(pa.data[i + k] - pb.data[i + k]);
          if (d > max) max = d;
        }
      }
      return max;
    }, [first, second]);

    // Measured at 8-9 levels; the invisible version measured 3-4. Five is the
    // midpoint, far enough from both to be a real signal rather than noise.
    expect(maxChange).toBeGreaterThanOrEqual(5);
  });

  test("the decorative background never intercepts pointer input", async ({
    page,
  }) => {
    await page.goto("/");
    // The particle-wave canvas is fixed over the whole viewport on every page.
    // Playwright's actionability check fails if another element would receive
    // the click, so this asserts the canvas stays pointer-events: none.
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
  });
});
