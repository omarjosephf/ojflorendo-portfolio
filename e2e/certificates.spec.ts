import { test, expect } from "@playwright/test";
import { certifications } from "../src/data/education";

test.describe("Published credential evidence", () => {
  test("every credential renders a certificate link", async ({ page }) => {
    await page.goto("/");

    const credentialLinks = page.getByRole("link", {
      name: /^View certificate for /,
    });
    await expect(credentialLinks).toHaveCount(certifications.length);

    for (const credential of certifications) {
      const link = page.getByRole("link", {
        name: `View certificate for ${credential.title}, ${credential.issuer}, ${credential.date} (PDF)`,
      });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", credential.certificatePath!);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("issuer verification stays available alongside the documents", async ({
    page,
  }) => {
    await page.goto("/");

    const verified = certifications.filter(
      (credential) => credential.verificationUrl,
    );
    await expect(
      page.getByRole("link", { name: /^Verify with issuer for / }),
    ).toHaveCount(verified.length);
  });

  test("each published certificate is served as a PDF", async ({ request }) => {
    for (const credential of certifications) {
      const response = await request.get(credential.certificatePath!);
      expect(
        response.status(),
        `${credential.certificatePath} did not return 200`,
      ).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/pdf");
      // The smallest published certificate is ~175 KB; anything far below that
      // means a truncated or placeholder file was committed.
      expect((await response.body()).byteLength).toBeGreaterThan(100_000);
    }
  });
});
