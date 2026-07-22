import { test, expect } from "@playwright/test";

// Asserts the actual production response headers. This protects a different
// failure mode from the in-browser CSP-violation collector: the collector
// catches policy *violations* at runtime, this catches a *missing or weakened
// policy* at the transport level. Every directive asserted below is guaranteed
// by the current production policy in src/proxy.ts and next.config.ts.
test.describe("Security response headers", () => {
  test("the homepage returns the expected security headers and CSP directives", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);

    const headers = res.headers();
    const csp = headers["content-security-policy"];

    expect(csp, "Content-Security-Policy present").toBeTruthy();
    expect(csp).toContain("nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");

    const hsts = headers["strict-transport-security"];
    expect(hsts, "Strict-Transport-Security present").toBeTruthy();
    expect(hsts).toContain("max-age=");

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("each response carries a fresh, unique CSP nonce", async ({ request }) => {
    const nonceOf = async (): Promise<string> => {
      const res = await request.get("/");
      const csp = res.headers()["content-security-policy"] ?? "";
      const match = csp.match(/'nonce-([^']+)'/);
      return match?.[1] ?? "";
    };

    const [first, second] = [await nonceOf(), await nonceOf()];
    expect(first).not.toBe("");
    expect(second).not.toBe("");
    expect(first).not.toBe(second);
  });
});
