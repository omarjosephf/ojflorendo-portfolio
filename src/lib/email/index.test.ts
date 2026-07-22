import { describe, it, expect, vi, afterEach } from "vitest";
import { getEmailTransport } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const message = {
  name: "Jane",
  email: "jane@example.com",
  enquiryType: "job" as const,
  subject: "Hello",
  message: "A message long enough to pass validation.",
  consent: true,
};

describe("getEmailTransport", () => {
  it("returns the mock transport when no secrets are configured", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    vi.stubEnv("CONTACT_FROM_EMAIL", "");
    expect(getEmailTransport().mode).toBe("mock");
  });

  it("mock transport reports delivered:false and honestly sends nothing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getEmailTransport().send(message);

    expect(result).toEqual({ ok: true, delivered: false, mode: "mock" });
    expect(fetchSpy).not.toHaveBeenCalled(); // no network in mock mode
  });

  it("selects the resend transport only when all secrets are set", () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("CONTACT_TO_EMAIL", "to@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "from@example.com");
    expect(getEmailTransport().mode).toBe("resend");
  });
});
