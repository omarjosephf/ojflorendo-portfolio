import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadSiteUrl(): Promise<string> {
  vi.resetModules();
  return (await import("./site-url")).SITE_URL;
}

describe("SITE_URL", () => {
  it("defaults to the production domain when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(await loadSiteUrl()).toBe("https://ojfr.me");
  });

  it("uses NEXT_PUBLIC_SITE_URL when provided", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    expect(await loadSiteUrl()).toBe("https://example.com");
  });

  it("strips one or more trailing slashes", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com///");
    expect(await loadSiteUrl()).toBe("https://example.com");
  });
});
