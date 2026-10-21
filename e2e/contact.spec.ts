import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fillValidExcept(
  page: import("@playwright/test").Page,
  overrides: { email?: string } = {},
) {
  // Scope to the form so labels can't collide with the footer's email link.
  const form = page.locator("form");
  await form.getByLabel(/your name/i).fill("Jane Baker");
  await form.getByLabel(/email address/i).fill(overrides.email ?? "jane@example.com");
  await form.getByLabel(/ai automation or workflow/i).check();
  await form
    .getByLabel(/how can i help/i)
    .fill("We run a physiotherapy studio and answer the same booking questions every day.");
  await form.getByLabel(/happy for Joseph Florendo/i).check();
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

    await page.getByRole("button", { name: /send enquiry/i }).click();
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
    await page.getByRole("button", { name: /send enquiry/i }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test("a valid submission honestly reports mock mode (no email sent)", async ({
    page,
  }) => {
    await page.goto("/#contact");
    await fillValidExcept(page);
    await page.getByRole("button", { name: /send enquiry/i }).click();

    await expect(page.getByText("Thanks.", { exact: true })).toBeVisible();
    await expect(page.getByText(/nothing was actually sent/i)).toBeVisible();
  });

  test("the full project enquiry sends, with the optional answers (ADR-0033)", async ({
    page,
  }) => {
    let sent: Record<string, unknown> | null = null;
    page.on("request", (req) => {
      if (req.url().includes("/api/contact")) sent = req.postDataJSON();
    });
    await page.goto("/#contact");
    const form = page.locator("form");
    await fillValidExcept(page);
    await form.getByLabel(/your role/i).fill("Owner");
    await form.getByLabel(/company name/i).fill("Baker Physio");
    await form.getByLabel(/company website/i).fill("bakerphysio.example");
    await form.getByLabel(/company size/i).selectOption({ label: "2–10 people" });
    await form.getByLabel(/customer enquiries/i).check();
    await form.getByLabel(/admin and paperwork/i).check();
    await form.getByLabel(/budget/i).selectOption({ label: "£1,000–£2,500" });
    await page.getByRole("button", { name: /send enquiry/i }).click();

    await expect(page.getByText("Thanks.", { exact: true })).toBeVisible();
    expect(sent).toMatchObject({
      enquiryType: "automation",
      companySize: "2-10",
      areas: ["enquiries", "admin"],
      budget: "1000-2500",
    });
  });

  test("the section names no build check and hides booking until a link is set", async ({
    page,
  }) => {
    await page.goto("/#contact");
    const section = page.locator("#contact");
    await expect(section.getByRole("heading", { name: "Tell me what you want to build" })).toBeVisible();
    await expect(section).not.toContainText(/build check|job opportunity|sponsorship/i);
    // site.bookingUrl is null until the owner creates the Cal.com account.
    await expect(section.getByRole("link", { name: /book a free 30-minute call/i })).toHaveCount(0);
    await expect(section.getByRole("link", { name: "Email Joseph" })).toBeVisible();
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
    await page.getByRole("button", { name: /send enquiry/i }).click();

    await expect(page.getByText("Thanks.", { exact: true })).toBeVisible();
    expect(cloudflareRequests).toEqual([]);
  });
});
