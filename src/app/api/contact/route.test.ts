// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { LIMITS } from "@/lib/contact/schema";

// Screening performs a DNS lookup. Mock it so these tests never touch the
// network — otherwise the suite is slow and flaky in CI.
const resolveMx = vi.fn();
const resolve4 = vi.fn();
vi.mock("node:dns", () => ({
  promises: {
    resolveMx: (...args: unknown[]) => resolveMx(...args),
    resolve4: (...args: unknown[]) => resolve4(...args),
  },
}));

beforeEach(() => {
  resolveMx.mockReset();
  resolve4.mockReset();
  // Default: the sender's domain accepts mail.
  resolveMx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
});

const validBody = {
  name: "Jane Recruiter",
  email: "jane@example.com",
  company: "Acme",
  enquiryType: "job",
  subject: "Frontend role",
  message: "We have an opening that fits your profile nicely.",
  consent: true,
};

// Each test uses a distinct client IP so the module-level rate limiter cannot
// cause cross-test interference — deterministic isolation, no test-only bypass.
function post(ip: string, body: unknown, raw?: string): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: raw ?? JSON.stringify(body),
  });
}

/** Flatten captured console.error arguments into one searchable string. */
function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map((a: unknown) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/contact", () => {
  it("valid mock-mode request returns ok/delivered:false and makes no network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await POST(post("t-valid", validBody));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      delivered: false,
      mode: "mock",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("silently accepts a honeypot submission, delivering nothing and making no network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await POST(
      post("t-honeypot", { ...validBody, website: "http://spam.example" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.delivered).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 413 for an oversized valid JSON body (unrelated large field)", async () => {
    const oversized = { ...validBody, filler: "x".repeat(40 * 1024) };
    const res = await POST(post("t-big-json", oversized));
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      message: "Request body is too large.",
    });
  });

  it("returns 413 (not 400) for an oversized non-JSON body", async () => {
    const res = await POST(post("t-big-raw", null, "x".repeat(40 * 1024)));
    expect(res.status).toBe(413);
  });

  it("returns 400 for malformed JSON that is within the size limit", async () => {
    const res = await POST(post("t-badjson", null, "{ not valid json"));
    expect(res.status).toBe(400);
  });

  it("rejects missing / too-short fields with 422 and field errors", async () => {
    const res = await POST(
      post("t-missing", { ...validBody, name: "", subject: "" }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.fieldErrors.name).toBeDefined();
    expect(json.fieldErrors.subject).toBeDefined();
  });

  it("rejects an invalid email server-side", async () => {
    const res = await POST(post("t-email", { ...validBody, email: "nope" }));
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors.email).toBeDefined();
  });

  it("enforces consent server-side", async () => {
    const res = await POST(post("t-consent", { ...validBody, consent: false }));
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors.consent).toBeDefined();
  });

  it("enforces field length limits server-side", async () => {
    const res = await POST(
      post("t-limit", { ...validBody, message: "x".repeat(LIMITS.message + 1) }),
    );
    expect(res.status).toBe(422);
    expect((await res.json()).fieldErrors.message).toBeDefined();
  });

  it("returns 429 once the rate limit is exceeded", async () => {
    const ip = "t-ratelimit";
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await POST(post(ip, validBody))).status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it("returns a controlled 502 and leaks no secret/message/stack when the transport reports failure", async () => {
    vi.stubEnv("RESEND_API_KEY", "secret-key-value");
    vi.stubEnv("CONTACT_TO_EMAIL", "to@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "from@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(post("t-fail502", validBody));
    expect(res.status).toBe(502);

    const responseText = JSON.stringify(await res.json());
    expect(responseText).not.toContain("secret-key-value");
    expect(responseText.toLowerCase()).not.toContain("stack");

    const logs = loggedText(errSpy);
    expect(logs).not.toContain("secret-key-value");
    expect(logs).not.toContain(validBody.message);
  });

  it("returns a controlled 502 and leaks nothing when the network request fails", async () => {
    // The transport absorbs network failures and timeouts into ok:false, so a
    // rejected fetch surfaces as the accurate "couldn't be sent" 502 rather than
    // a generic 500 (ADR-0001 item 13).
    vi.stubEnv("RESEND_API_KEY", "secret-key-value");
    vi.stubEnv("CONTACT_TO_EMAIL", "to@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "from@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("boom secret-key-value")),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(post("t-fail-network", validBody));
    expect(res.status).toBe(502);

    const responseText = JSON.stringify(await res.json());
    expect(responseText).not.toContain("secret-key-value");
    expect(responseText).not.toContain("boom");

    const logs = loggedText(errSpy);
    expect(logs).not.toContain("secret-key-value");
    expect(logs).not.toContain("boom");
    expect(logs).not.toContain(validBody.message);
  });

  it("rejects the submission when Turnstile is enforced and denies the token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 200 }),
      ),
    );

    const res = await POST(
      post("t-turnstile-denied", { ...validBody, turnstileToken: "bad" }),
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("rejects a submission with no token once Turnstile is enforced", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-test-secret");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(post("t-turnstile-missing", validBody));

    expect(res.status).toBe(403);
    // A missing token is decided locally; Cloudflare is never called.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts the submission when Turnstile confirms the token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );

    const res = await POST(
      post("t-turnstile-ok", { ...validBody, turnstileToken: "good" }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      delivered: false,
      mode: "mock",
    });
  });

  it("lets the enquiry through and shouts when OUR Turnstile secret is wrong", async () => {
    // Cloudflare answers 200 + success:false for a bad secret exactly as it does
    // for a bad token. Blaming the visitor would block every genuine enquiry
    // behind "we couldn't confirm you're human" — a total contact outage caused
    // by one mistyped variable.
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-wrong-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            "error-codes": ["invalid-input-secret"],
          }),
          { status: 200 },
        ),
      ),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    const res = await POST(
      post("t-turnstile-badsecret", { ...validBody, turnstileToken: "good" }),
    );

    expect(res.status).toBe(200);

    // The operator must be able to find this, and the code must name the fault.
    const logged = loggedText(errorSpy);
    expect(logged).toContain("turnstile_misconfigured");
    expect(logged).toContain("invalid-input-secret");
    // Never the secret itself.
    expect(logged).not.toContain("0x-wrong-secret");
  });

  it("allows the submission but warns when Turnstile is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x-test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    const res = await POST(
      post("t-turnstile-down", { ...validBody, turnstileToken: "any" }),
    );

    // Fail open: an outage at Cloudflare must not cost a genuine enquiry.
    expect(res.status).toBe(200);
    expect(loggedText(warnSpy)).toContain("turnstile_unavailable");
  });

  it("rejects a disposable email address with a field error", async () => {
    const res = await POST(
      post("t-disposable", { ...validBody, email: "throwaway@mailinator.com" }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors?: { email?: string } };
    expect(body.fieldErrors?.email).toMatch(/permanent email/i);
  });

  it("rejects an email domain that cannot receive mail", async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error(), { code: "ENOTFOUND" }));
    resolve4.mockRejectedValue(Object.assign(new Error(), { code: "ENOTFOUND" }));

    const res = await POST(
      post("t-undeliverable", { ...validBody, email: "jane@no-such.invalid" }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors?: { email?: string } };
    expect(body.fieldErrors?.email).toMatch(/couldn't verify that email domain/i);
  });

  it("rejects a link-flooded message", async () => {
    const message = Array.from(
      { length: 12 },
      (_, i) => `https://spam${i}.example`,
    ).join(" ");

    const res = await POST(post("t-linkflood", { ...validBody, message }));

    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors?: { message?: string } };
    expect(body.fieldErrors?.message).toMatch(/fewer links/i);
  });

  it("returns a controlled 500 and leaks no secret/message/stack when the transport itself throws", async () => {
    // The transport is not expected to throw, but the route's catch is a
    // deliberate backstop. Replace the transport with one that rejects so that
    // backstop stays covered rather than becoming untested dead code.
    vi.resetModules();
    vi.doMock("@/lib/email", () => ({
      getEmailTransport: () => ({
        mode: "resend",
        send: () => Promise.reject(new Error("boom secret-key-value")),
      }),
    }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      // Fresh module instance (and therefore a fresh rate limiter).
      const { POST: postWithThrowingTransport } = await import("./route");
      const res = await postWithThrowingTransport(
        post("t-fail500", validBody),
      );
      expect(res.status).toBe(500);

      const responseText = JSON.stringify(await res.json());
      expect(responseText).not.toContain("secret-key-value");
      expect(responseText).not.toContain("boom");

      const logs = loggedText(errSpy);
      expect(logs).not.toContain("secret-key-value");
      expect(logs).not.toContain("boom");
      expect(logs).not.toContain(validBody.message);
    } finally {
      vi.doUnmock("@/lib/email");
      vi.resetModules();
    }
  });
});
