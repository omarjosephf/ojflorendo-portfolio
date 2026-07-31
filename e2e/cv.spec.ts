import { test, expect } from "@playwright/test";

test.describe("Reviewed public CV", () => {
  test("the navigation link and published PDF are available", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const cvLink = page.getByRole("link", { name: /view cv/i });
    await expect(cvLink).toBeVisible();
    await expect(cvLink).toHaveAttribute(
      "href",
      "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
    );
    await expect(cvLink).toHaveAttribute("target", "_blank");

    const response = await request.get(
      "/documents/OJ_Florendo_Rayatchi_Public_CV.pdf",
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    expect((await response.body()).byteLength).toBeGreaterThan(50_000);
  });
});
