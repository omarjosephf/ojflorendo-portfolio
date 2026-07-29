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
  });

  test("manifest.webmanifest uses the approved identity", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = JSON.parse(await response.text());
    expect(manifest.name).toBe(
      "OJ Florendo Rayatchi — Portfolio & Professional Platform",
    );
    expect(manifest.short_name).toBe("OJ Florendo");
  });

  test("structured data includes the display and alternate names", async ({
    page,
  }) => {
    await page.goto("/");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(jsonLd).toContain("OJ Florendo Rayatchi");
    expect(jsonLd).toContain('"alternateName":"OJ Florendo"');
  });

  test("an unknown route returns HTTP 404", async ({ request }) => {
    const response = await request.get("/this-route-does-not-exist");
    expect(response.status()).toBe(404);
  });
});
