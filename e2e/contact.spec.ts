import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fillValidExcept(
  page: import("@playwright/test").Page,
  overrides: { email?: string } = {},
) {
  // Scope to the form so labels can't collide with the footer's email link.
  const form = page.locator("form");
  await form.getByLabel(/full name/i).fill("Jane Recruiter");
  await form.getByLabel(/email/i).fill(overrides.email ?? "jane@example.com");
  await form.getByLabel(/enquiry type/i).selectOption("job");
  await form.getByLabel(/subject/i).fill("Frontend role");
  await form
    .getByLabel(/message/i)
    .fill("We have an opening that fits your profile nicely.");
  await form.getByLabel(/happy for OJ Florendo/i).check();
}

test.describe("Contact form", () => {
  test("required-field validation blocks submission (no API call)", async ({
    page,
  }) => {
    let apiCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/contact")) apiCalls += 1;
    });
    await page.goto("/#contact");

    await page.getByRole("button", { name: /send project enquiry/i }).click();
    await expect(page.getByText(/please enter your name/i)).toBeVisible();
    expect(apiCalls).toBe(0);

    // The form must stay accessible once validation errors are shown.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("an invalid email is rejected on the client", async ({ page }) => {
    await page.goto("/#contact");
    await fillValidExcept(page, { email: "not-an-email" });
    await page.getByRole("button", { name: /send project enquiry/i }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test("a valid submission honestly reports mock mode (no email sent)", async ({
    page,
  }) => {
    await page.goto("/#contact");
    await fillValidExcept(page);
    await page.getByRole("button", { name: /send project enquiry/i }).click();

    await expect(page.getByText(/thanks for reaching out/i)).toBeVisible();
    await expect(page.getByText(/nothing was actually sent/i)).toBeVisible();
  });

  test("Turnstile is absent — and costs nothing — until it is configured", async ({
    page,
  }) => {
    // The bot check is opt-in (ADR-0005). Unconfigured, the form must behave
    // exactly as before and must not fetch anything from Cloudflare. This guards
    // the graceful-degradation promise: enabling Turnstile is the owner's step,
    // and forgetting it must never break the contact route.
    const cloudflareRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("challenges.cloudflare.com")) {
        cloudflareRequests.push(req.url());
      }
    });

    await page.goto("/#contact");
    await fillValidExcept(page);
    await page.getByRole("button", { name: /send project enquiry/i }).click();

    await expect(page.getByText(/thanks for reaching out/i)).toBeVisible();
    expect(cloudflareRequests).toEqual([]);
  });
});
