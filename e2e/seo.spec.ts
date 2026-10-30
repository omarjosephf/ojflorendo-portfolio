import { test, expect } from "@playwright/test";

test.describe("SEO & metadata routes", () => {
  test("robots.txt is served and references the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Sitemap");
  });

  test("sitemap.xml includes the case-study route", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/projects/personal-portfolio-website");
    // The background sections live here now; omitting it would hide them.
    expect(body).toContain("/about");
    expect(body).toContain("/blog");
  });

  test("manifest.webmanifest uses the approved identity", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = JSON.parse(await response.text());
    expect(manifest.name).toBe("Joseph Florendo — AI Automation Developer");
    expect(manifest.short_name).toBe("Joseph Florendo");
  });

  test("structured data names Joseph Florendo and no earlier name", async ({
    page,
  }) => {
    await page.goto("/");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(jsonLd).toContain('"name":"Joseph Florendo"');
    expect(jsonLd).toContain('"jobTitle":"AI Automation Developer"');
    expect(jsonLd).not.toMatch(/Rayatchi|"OJ /);
  });

  // ADR-0031 D5: every public page type carries its own share image, and its
  // search description is a whole sentence short enough not to be cut.
  for (const path of [
    "/",
    "/about",
    "/blog",
    "/blog/evaluating-retrieval-systems-refusal-testing-and-quote-integrity",
    "/projects/cited",
    "/projects/personal-portfolio-website",
  ]) {
    test(`${path} has a loading share image and a whole search description`, async ({ page, request }) => {
      await page.goto(path);

      const image = page.locator('meta[property="og:image"]');
      await expect(image).toHaveCount(1);
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      const response = await request.get(new URL((await image.getAttribute("content"))!).pathname);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");

      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description!.length).toBeLessThanOrEqual(160);
      expect(description).toMatch(/\.$/);
    });
  }

  test("an unknown route returns HTTP 404", async ({ request }) => {
    const response = await request.get("/this-route-does-not-exist");
    expect(response.status()).toBe(404);
  });
});
