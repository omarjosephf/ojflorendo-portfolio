import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { hasNoHorizontalOverflow, watchPage } from "./helpers";

/**
 * E.V, end to end.
 *
 * Every assistant response is synthetic and intercepted at the portfolio route.
 * This keeps the browser suite deterministic, prevents paid calls, and leaves
 * answer quality to the separately governed evaluation set. This layer proves
 * the browser-owned boundary: tab storage, request history, cancellation,
 * focus, CSP, network origins, accessibility, and responsive presentation.
 */

const SESSION_KEY = "oj.smart-assistant.session.v1";
const SESSION_VERSION = 1;
const SESSION_EXCHANGE_LIMIT = 20;
const SESSION_BYTE_LIMIT = 32 * 1024;
const RESPONSE_BYTE_LIMIT = 48 * 1024;

const GROUNDED = {
  state: "answered",
  answer: "OJ has two published projects: Cited and this portfolio platform.",
  citations: [
    {
      quote: "OJ has two published projects",
      label: "About OJ",
      href: "/about#about",
    },
  ],
  modelRoute: "primary",
} as const;

type RequestBody = {
  question: string;
  history: { question: string; sources: string[] }[];
};

/** Intercept the route so no request leaves the machine and none is paid for. */
async function stubAssistant(
  page: Page,
  body: unknown | ((request: RequestBody) => unknown) = GROUNDED,
  status = 200,
) {
  const requests: RequestBody[] = [];
  await page.route("**/api/assistant", async (route) => {
    const request = route.request().postDataJSON() as RequestBody;
    requests.push(request);
    const response = typeof body === "function" ? body(request) : body;
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
  return requests;
}

async function openAssistant(page: Page) {
  await page.getByRole("button", { name: "Open E.V", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Message E.V", { exact: true })).toBeEnabled();
  return dialog;
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Message E.V", { exact: true }).fill(question);
  await page
    .getByRole("button", { name: "Send message to E.V", exact: true })
    .click();
}

function storedRecord(
  exchanges: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify({
    version: SESSION_VERSION,
    createdAt: 1,
    updatedAt: 2,
    exchanges,
    ...overrides,
  });
}

function storedExchange(question: string, result: unknown = GROUNDED) {
  return { question, result };
}

async function readStored(page: Page) {
  return page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY);
}

async function seedStored(page: Page, raw: string) {
  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, value),
    { key: SESSION_KEY, value: raw },
  );
}

function outcomes(page: Page) {
  return page.getByRole("dialog").locator("article");
}

function visibleNotices(page: Page) {
  return page.getByRole("dialog").locator("p:not(.sr-only)");
}

test.describe("E.V", () => {
  test("presents the minimal interface with accessible privacy and source disclosure", async ({
    page,
  }) => {
    await stubAssistant(page);
    await page.goto("/");
    const dialog = await openAssistant(page);

    await expect(
      dialog.getByRole("heading", { name: "E.V", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText("Beta", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("combobox")).toHaveCount(0);
    await expect(
      dialog.getByAltText("Illustrated avatar of E.V", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText("OJ’s portfolio AI assistant", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Hi, I'm E.V.", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText("How can I help you?", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Message E.V", { exact: true })).toHaveAttribute(
      "placeholder",
      "Write a message…",
    );
    await expect(dialog.getByText(/suggested questions/i)).toBeHidden();
    await expect(
      dialog.getByRole("button", { name: "Clear chat", exact: true }),
    ).toHaveCount(0);

    const disclosureButton = dialog.getByRole("button", {
      name: "About & privacy",
      exact: true,
    });
    await expect(disclosureButton).toHaveAttribute("aria-expanded", "false");
    await expect(disclosureButton).toHaveAttribute("aria-controls", /.+/);
    await disclosureButton.click();
    await expect(disclosureButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      dialog.getByRole("region", { name: "About & privacy", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "AI answers from OJ’s published portfolio, with sources. Not OJ.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/questions go through oj's server to google, with openai as a backup/i),
    ).toBeVisible();
    await expect(dialog.getByText(/up to 20 recent completed exchanges/i)).toBeVisible();
    await expect(dialog.getByText(/duplicated tab may begin with a copy/i)).toBeVisible();
    await expect(
      dialog.getByText(/clear chat removes this tab's saved copy/i),
    ).toBeVisible();

    const initialHeight = await dialog.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Clear chat", exact: true }),
    ).toBeVisible();
    expect(
      await dialog.evaluate((element) => element.getBoundingClientRect().height),
    ).toBe(initialHeight);
    await dialog.getByText("1 source", { exact: true }).click();
    await expect(dialog.getByText(`“${GROUNDED.citations[0].quote}”`)).toBeVisible();
    await expect(dialog.getByRole("link", { name: "About OJ" })).toHaveAttribute(
      "href",
      "/about#about",
    );
  });

  test("answers with a working source and no CSP violation", async ({ page }) => {
    const watcher = await watchPage(page);
    await stubAssistant(page);

    await page.goto("/");
    const dialog = await openAssistant(page);
    await ask(page, "What projects has OJ built?");

    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await dialog.getByText("1 source", { exact: true }).click();
    await dialog.getByRole("link", { name: "About OJ" }).click();
    // The About source now lives on its own route, so following the citation is
    // a navigation rather than a scroll. Asserting the URL as well as the
    // section keeps this a real check that the link resolves.
    await expect(page).toHaveURL(/\/about(#about)?$/);
    await expect(page.locator("#about")).toBeVisible();

    expect(watcher.consoleErrors).toEqual([]);
    expect(await watcher.cspViolations()).toEqual([]);
  });

  test("discloses fallback use visually and to screen readers after response and restore", async ({
    page,
  }) => {
    await stubAssistant(page, { ...GROUNDED, modelRoute: "fallback" });
    await page.goto("/");
    const dialog = await openAssistant(page);
    await ask(page, "What projects has OJ built?");

    await expect(
      outcomes(page).getByText("Backup model used", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole("status")).toHaveText(
      `E.V: Backup model used. ${GROUNDED.answer}`,
    );
    await expect.poll(() => readStored(page)).toContain('"modelRoute":"fallback"');

    await page.reload();
    const restoredDialog = await openAssistant(page);
    await expect(
      outcomes(page).getByText("Backup model used", { exact: true }),
    ).toBeVisible();
    await expect(restoredDialog.getByRole("status")).toHaveText("");
  });

  test("talks only to this origin — no new client-side network origin", async ({
    page,
  }) => {
    const origins = new Set<string>();
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    await stubAssistant(page);

    await page.goto("/");
    const siteOrigin = new URL(page.url()).origin;
    await openAssistant(page);
    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();

    expect([...origins]).toEqual([siteOrigin]);
  });

  test("offers OJ when the corpus does not cover a question", async ({ page }) => {
    await stubAssistant(page, {
      state: "not-covered",
      answer: "OJ has not published that detail.",
    });

    await page.goto("/");
    const dialog = await openAssistant(page);
    await ask(page, "What are OJ's hobbies?");

    await expect(
      outcomes(page).getByText("I can't answer that from the information I have. You can contact OJ directly.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(outcomes(page).getByText("OJ has not published that detail.", { exact: true })).toHaveCount(0);
    await dialog.getByRole("link", { name: /contact oj/i }).click();
    await expect(page.locator("#contact")).toBeVisible();
  });

  test("is honest when unavailable and the rest of the site remains usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stubAssistant(page, { state: "unavailable" }, 502);
    await page.goto("/");
    const dialog = await openAssistant(page);
    await ask(page, "What does OJ build?");

    await expect(outcomes(page).getByText(/i can't answer right now/i)).toBeVisible();
    await expect(dialog.getByText("1 source", { exact: true })).toBeHidden();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    const results = await new AxeBuilder({ page })
      .include('[data-testid="oj-assistant"]')
      .analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Discuss your website", exact: true }).click();
    await expect(page.locator("#contact")).toBeVisible();
  });

  test("keeps a completed exchange through close, reopen and refresh without resending", async ({
    page,
  }) => {
    const requests = await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await expect.poll(() => readStored(page)).not.toBeNull();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await openAssistant(page);
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();

    await page.reload();
    await openAssistant(page);
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test("clear chat removes live and saved history and starts a new conversation", async ({
    page,
  }) => {
    const requests = await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Clear chat", exact: true }).click();
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeHidden();
    expect(await readStored(page)).toBeNull();
    await expect(page.getByLabel("Message E.V", { exact: true })).toBeFocused();

    await ask(page, "What services does OJ offer?");
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]?.history).toEqual([]);
  });

  test("refresh discards a pending request and never resends it", async ({ page }) => {
    let assistantCalls = 0;
    await page.route("**/api/assistant", () => {
      assistantCalls += 1;
      // Leaving this synthetic route unresolved keeps the browser in its real
      // pending state until navigation cancels the document and its fetch.
    });

    await page.goto("/");
    await openAssistant(page);
    await ask(page, "A request that must not be replayed");
    await expect(page.getByTestId("oj-assistant").getByRole("status")).toHaveText("Thinking…");
    await expect(page.getByRole("list", { name: "Conversation with E.V" }).getByText("Thinking…")).toHaveCount(0);
    expect(await readStored(page)).toBeNull();

    await page.reload();
    await openAssistant(page);
    await expect(page.getByText("A request that must not be replayed")).toBeHidden();
    expect(await readStored(page)).toBeNull();
    expect(assistantCalls).toBe(1);
  });

  test("fresh tabs have independent history", async ({ page, context }) => {
    await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "History in the first tab");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await expect.poll(() => readStored(page)).not.toBeNull();

    const freshPage = await context.newPage();
    await freshPage.goto("/");
    await openAssistant(freshPage);
    await expect(freshPage.getByText("History in the first tab")).toBeHidden();
    expect(await readStored(freshPage)).toBeNull();
  });

  test("an opener-created tab starts with a copy and then diverges", async ({ page }) => {
    await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "Copied from the opener");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await expect.poll(() => readStored(page)).not.toBeNull();

    const popupPromise = page.waitForEvent("popup");
    await page.evaluate(() => window.open(window.location.href, "_blank"));
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await openAssistant(popup);
    await expect(popup.getByText("Copied from the opener")).toBeVisible();

    await popup.getByRole("button", { name: "Clear chat", exact: true }).click();
    expect(await readStored(popup)).toBeNull();
    expect(await readStored(page)).not.toBeNull();

    await ask(page, "Only the opener changes now");
    await expect(page.getByText("Only the opener changes now")).toBeVisible();
    await expect(popup.getByText("Only the opener changes now")).toBeHidden();
  });

  test("never saves or transmits blocked sensitive input", async ({ page }) => {
    const requests = await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "Email me at visitor@example.com");

    await expect(
      outcomes(page).getByText(/message was not sent anywhere/i),
    ).toBeVisible();
    expect(requests).toEqual([]);
    expect((await readStored(page)) ?? "").not.toContain("visitor@example.com");

    await page.reload();
    await openAssistant(page);
    await expect(page.getByText("Email me at visitor@example.com")).toBeHidden();
  });

  for (const invalid of [
    { name: "malformed", raw: "{definitely-not-json" },
    {
      name: "unknown-version",
      raw: storedRecord([storedExchange("Do not restore")], { version: 2 }),
    },
    { name: "oversized", raw: "x".repeat(SESSION_BYTE_LIMIT + 1) },
  ]) {
    test(`rejects and removes ${invalid.name} tab data`, async ({ page }) => {
      await page.goto("/");
      await seedStored(page, invalid.raw);
      await openAssistant(page);

      await expect(page.getByText("Do not restore")).toBeHidden();
      expect(await readStored(page)).toBeNull();
      await expect(page.getByLabel("Message E.V", { exact: true })).toBeEnabled();
      await expect(
        visibleNotices(page).filter({ hasText: /staying in memory for now/i }),
      ).toBeVisible();
    });
  }

  test("rejects an API response above the 48 KiB browser boundary", async ({ page }) => {
    const oversizedAnswer = "x".repeat(RESPONSE_BYTE_LIMIT + 1);
    await stubAssistant(page, {
      state: "answered",
      answer: oversizedAnswer,
      citations: GROUNDED.citations,
    });
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "Reject the oversized response");

    await expect(outcomes(page).getByText(/i can't answer right now/i)).toBeVisible();
    expect(
      await page.locator('[data-testid="oj-assistant"]').textContent(),
    ).not.toContain("x".repeat(100));
  });

  test("restores only the newest 20 completed exchanges", async ({ page }) => {
    const exchanges = Array.from({ length: SESSION_EXCHANGE_LIMIT + 3 }, (_, index) =>
      storedExchange(`Stored question ${index}`),
    );
    await page.goto("/");
    await seedStored(page, storedRecord(exchanges));
    await openAssistant(page);

    await expect(page.getByText("Stored question 2", { exact: true })).toBeHidden();
    await expect(page.getByText("Stored question 3", { exact: true })).toBeVisible();
    await expect(page.getByText("Stored question 22", { exact: true })).toBeVisible();
    const restored = JSON.parse((await readStored(page)) ?? "null");
    expect(restored.exchanges).toHaveLength(SESSION_EXCHANGE_LIMIT);
  });

  test("renders unsafe API and stored hrefs as plain text", async ({ page, context }) => {
    const unsafeResult = {
      ...GROUNDED,
      citations: [
        {
          ...GROUNDED.citations[0],
          quote: "An untrusted citation",
          href: "javascript:alert(document.domain)",
        },
      ],
    };
    await stubAssistant(page, unsafeResult);
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "Test the API boundary");
    await expect(
      outcomes(page).getByText(unsafeResult.answer, { exact: true }),
    ).toBeVisible();
    await page.getByText("1 source", { exact: true }).click();
    await expect(page.getByRole("link", { name: "About OJ" })).toBeHidden();
    await expect(page.getByText("About OJ", { exact: true })).toBeVisible();

    const storedPage = await context.newPage();
    await storedPage.goto("/");
    await seedStored(
      storedPage,
      storedRecord([storedExchange("Restored unsafe source", unsafeResult)]),
    );
    await openAssistant(storedPage);
    await storedPage.getByText("1 source", { exact: true }).click();
    await expect(storedPage.getByRole("link", { name: "About OJ" })).toBeHidden();
    await expect(storedPage.getByText("About OJ", { exact: true })).toBeVisible();
  });

  test("sends only four question/source turns and excludes answer prose", async ({
    page,
  }) => {
    const requests = await stubAssistant(page, ({ question }: RequestBody) => ({
      ...GROUNDED,
      answer: `Synthetic answer for ${question}`,
      citations: [
        {
          quote: `Synthetic quote for ${question}`,
          label: "About OJ",
          href: "/about#about",
        },
      ],
    }));
    await page.goto("/");
    await openAssistant(page);

    const questions = [
      "Question 0 about projects",
      "Question 1 follow-up",
      "Question 2 follow-up",
      "Question 3 follow-up",
      "Question 4 follow-up",
      "A new topic about services",
    ];
    for (const question of questions) {
      await ask(page, question);
      await expect(
        outcomes(page).getByText(`Synthetic answer for ${question}`, {
          exact: true,
        }),
      ).toBeVisible();
    }

    expect(requests).toHaveLength(questions.length);
    expect(requests.at(-1)?.history).toEqual(
      questions.slice(1, 5).map((question) => ({
        question,
        sources: ["About OJ"],
      })),
    );
    const finalBody = JSON.stringify(requests.at(-1));
    expect(finalBody).not.toContain("Synthetic answer");
    expect(finalBody).not.toContain("Synthetic quote");
  });

  test("closing aborts the request and suppresses a stale completion", async ({ page }) => {
    let heldRoute: Route | null = null;
    await page.route("**/api/assistant", (route) => {
      heldRoute = route;
    });
    await page.goto("/");
    await openAssistant(page);
    await ask(page, "A request that should stop");
    await expect(page.getByTestId("oj-assistant").getByRole("status")).toHaveText("Thinking…");

    await page.keyboard.press("Escape");
    expect(heldRoute).not.toBeNull();
    await heldRoute!
      .fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(GROUNDED),
      })
      .catch(() => undefined);

    await openAssistant(page);
    await expect(page.getByText("A request that should stop")).toBeHidden();
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeHidden();
    expect(await readStored(page)).toBeNull();
  });

  test("keeps one stable live status through pending and answer, then clears silently", async ({
    page,
  }) => {
    let release: (() => Promise<void>) | null = null;
    await page.route("**/api/assistant", (route) => {
      release = () =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GROUNDED),
        });
    });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Open E.V", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    const input = page.getByLabel("Message E.V", { exact: true });
    await expect(input).toBeFocused();
    const status = page.getByTestId("oj-assistant").getByRole("status");
    await expect(status).toHaveCount(1);
    await expect(status).toHaveText("");
    await status.evaluate((node) =>
      node.setAttribute("data-test-stable-status", "true"),
    );
    await page.keyboard.type("What projects has OJ built?");
    await page.keyboard.press("Enter");

    await expect(status).toHaveText("Thinking…");
    await expect(status).toHaveAttribute("data-test-stable-status", "true");
    await expect(input).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Send message to E.V", exact: true }),
    ).toBeDisabled();
    await release!();
    await expect(status).toHaveText(`E.V: ${GROUNDED.answer}`);
    await expect(status).toHaveAttribute("data-test-stable-status", "true");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await expect(input).toBeFocused();

    await page.getByText("1 source", { exact: true }).click();
    await expect(status).toHaveText(`E.V: ${GROUNDED.answer}`);
    const source = page.getByRole("link", { name: "About OJ" });
    await source.focus();
    await expect(source).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();

    await openAssistant(page);
    await page.getByRole("button", { name: "Clear chat", exact: true }).click();
    await expect(status).toHaveText("");

    await seedStored(
      page,
      storedRecord([storedExchange("Restored without announcement")]),
    );
    await page.reload();
    await openAssistant(page);
    await expect(page.getByTestId("oj-assistant").getByRole("status")).toHaveText("");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
  });

  test("stays usable in memory when session storage is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("session storage disabled for this test");
      };
    });
    await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);
    await expect(
      visibleNotices(page).filter({ hasText: /staying in memory for now/i }),
    ).toBeVisible();
    await ask(page, "Memory-only question");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await openAssistant(page);
    await expect(page.getByText("Memory-only question")).toBeVisible();
  });

  test("does not leak the backend URL or secret into the client bundle", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().endsWith(".js") && response.status() === 200) {
        scripts.push(await response.text().catch(() => ""));
      }
    });

    await page.goto("/");
    await openAssistant(page);
    await page.waitForLoadState("networkidle");

    const bundle = scripts.join("\n");
    expect(bundle).not.toContain("ASSISTANT_SERVICE_SECRET");
    expect(bundle).not.toContain("fly.dev");
    expect(bundle).not.toContain("X-Assistant-Secret");
  });

  test("requests E.V’s header portrait only after she is opened", async ({ page }) => {
    const imageRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("ev-avatar") || url.includes("Turnaround")) {
        imageRequests.push(decodeURIComponent(url));
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(imageRequests.some((url) => url.includes("ev-avatar-portrait"))).toBe(false);

    await openAssistant(page);
    await expect(
      page.getByAltText("Illustrated avatar of E.V", { exact: true }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(imageRequests.some((url) => url.includes("ev-avatar-portrait"))).toBe(true);
    expect(imageRequests.some((url) => url.includes("Turnaround"))).toBe(false);
  });

  test("passes axe and avoids phone overflow with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);

    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    let results = await new AxeBuilder({ page })
      .include('[data-testid="oj-assistant"]')
      .analyze();
    expect(results.violations).toEqual([]);

    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    results = await new AxeBuilder({ page })
      .include('[data-testid="oj-assistant"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("reflows at a 200% effective CSS viewport with usable composer and sources", async ({
    page,
  }) => {
    // Reflow equivalent for a 1280x900 viewport at 200%. This deliberately
    // checks the resulting 640x450 CSS viewport; it is not a claim that
    // Playwright exercised the browser's native zoom control.
    await page.setViewportSize({ width: 640, height: 450 });
    await stubAssistant(page);
    await page.goto("/");
    await openAssistant(page);

    expect(await hasNoHorizontalOverflow(page)).toBe(true);
    await expect(page.getByLabel("Message E.V", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send message to E.V", exact: true }),
    ).toBeVisible();
    await ask(page, "What projects has OJ built?");
    await expect(
      outcomes(page).getByText(GROUNDED.answer, { exact: true }),
    ).toBeVisible();
    await page.getByText("1 source", { exact: true }).click();
    await expect(page.getByRole("link", { name: "About OJ" })).toBeVisible();
    expect(await hasNoHorizontalOverflow(page)).toBe(true);
  });
});
