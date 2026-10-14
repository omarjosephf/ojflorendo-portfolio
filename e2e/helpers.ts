import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

export interface PageWatcher {
  readonly consoleErrors: string[];
  cspViolations(): Promise<string[]>;
}

/**
 * Attach console-error, page-error and CSP-violation collectors to a page.
 * Call BEFORE `page.goto` so the init script is installed for the navigation.
 */
export async function watchPage(page: Page): Promise<PageWatcher> {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push(event.violatedDirective);
    });
  });

  return {
    consoleErrors,
    cspViolations: () => page.evaluate(() => window.__cspViolations),
  };
}

/** True when the page has no horizontal overflow at the current viewport. */
export function hasNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
}

/**
 * Makes WebGL report a hardware renderer. Headless Chromium draws WebGL in
 * software, where the star scenes deliberately draw nothing (ADR-0030); the
 * tests that check the scenes themselves use this to run them. Software
 * rendering spreads across every CPU thread, so those tests keep their
 * viewport small (SCENE_VIEWPORT) or they starve the rest of the suite.
 */
export async function simulateHardwareWebGL(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (this: WebGLRenderingContext, parameter: number) {
      if (parameter === 0x9246 || parameter === 0x1f01) return "ANGLE (Playwright test GPU)";
      return original.call(this, parameter);
    };
  });
}

/** A small viewport for tests that run a star scene in software rendering. */
export const SCENE_VIEWPORT = { width: 480, height: 320 } as const;
