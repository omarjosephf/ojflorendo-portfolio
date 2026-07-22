import { test, expect } from "@playwright/test";

test.describe("SEO & metadata routes", () => {
  test("robots.txt is served and references the sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Sitemap");
  });

  test("sitemap.xml is served and includes the case-study route", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/projects/personal-portfolio-website");
  });

  test("manifest.webmanifest is valid JSON with the brand name", async ({
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = JSON.parse(await res.text());
    expect(manifest.name).toContain("OJ Florendo");
  });

  test("an unknown route returns HTTP 404", async ({ request }) => {
    const res = await request.get("/this-route-does-not-exist");
    expect(res.status()).toBe(404);
  });
});
