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
