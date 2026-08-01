// @vitest-environment node
// Server-only module: exercised under Node so AbortSignal and DOMException match
// production. jsdom's differ and have hidden a vacuous test before.
import { describe, it, expect, vi, afterEach } from "vitest";
import { isTurnstileEnforced, verifyTurnstile } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A recognisable fake secret, so tests can assert it never reaches a log. */
const FAKE_SECRET = "0x_TEST_SECRET_must_never_be_logged";
const TOKEN = "test-turnstile-token";

function stubEnv(fetchImpl: () => Promise<Response>) {
  vi.stubEnv("TURNSTILE_SECRET_KEY", FAKE_SECRET);
  const fetchSpy = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>(
    fetchImpl,
  );
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

const resolves = (response: Response) => stubEnv(() => Promise.resolve(response));
const rejects = (error: unknown) => stubEnv(() => Promise.reject(error));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Flatten captured console output into one searchable string. */
function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map((a: unknown) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
}

describe("isTurnstileEnforced", () => {
  it("is off when no secret is configured", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(isTurnstileEnforced()).toBe(false);
  });

  it("is on once a secret is configured", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", FAKE_SECRET);
    expect(isTurnstileEnforced()).toBe(true);
  });
});

describe("verifyTurnstile", () => {
  it("allows everything and makes no network call when unconfigured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(verifyTurnstile(undefined)).resolves.toEqual({
      ok: true,
      outcome: "disabled",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses a submission carrying no token, without calling Cloudflare", async () => {
    const fetchSpy = resolves(jsonResponse({ success: true }));

    await expect(verifyTurnstile(undefined)).resolves.toEqual({
      ok: false,
      outcome: "missing-token",
    });
    await expect(verifyTurnstile("")).resolves.toEqual({
      ok: false,
      outcome: "missing-token",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare confirms", async () => {
    const fetchSpy = resolves(jsonResponse({ success: true }));

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: true,
      outcome: "verified",
    });

    const [url, init] = fetchSpy.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("secret")).toBe(FAKE_SECRET);
    expect(body.get("response")).toBe(TOKEN);
    // Bounded, so a hung provider cannot stall the route.
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("forwards a real client IP but never the placeholder", async () => {
    const withIp = resolves(jsonResponse({ success: true }));
    await verifyTurnstile(TOKEN, "203.0.113.7");
    expect(
      new URLSearchParams(
        (withIp.mock.calls[0]![1] as RequestInit).body as string,
      ).get("remoteip"),
    ).toBe("203.0.113.7");

    vi.unstubAllGlobals();
    const unknownIp = resolves(jsonResponse({ success: true }));
    await verifyTurnstile(TOKEN, "unknown");
    expect(
      new URLSearchParams(
        (unknownIp.mock.calls[0]![1] as RequestInit).body as string,
      ).has("remoteip"),
    ).toBe(false);
  });

  it("rejects a token Cloudflare denies", async () => {
    resolves(
      jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }),
    );

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: false,
      outcome: "rejected",
    });
  });

  it("fails OPEN on a non-2xx reply, so our misconfiguration cannot block clients", async () => {
    resolves(new Response("bad secret", { status: 401 }));

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: true,
      outcome: "unavailable",
    });
  });

  it("fails OPEN on an unrecognised response shape", async () => {
    resolves(jsonResponse({ unexpected: "shape" }));

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: true,
      outcome: "unavailable",
    });
  });

  it("fails OPEN on timeout and never throws", async () => {
    rejects(new DOMException("The operation was aborted.", "TimeoutError"));

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: true,
      outcome: "unavailable",
    });
  });

  it("fails OPEN on a network error, leaking no secret to logs", async () => {
    rejects(new TypeError(`fetch failed with secret ${FAKE_SECRET}`));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(verifyTurnstile(TOKEN)).resolves.toEqual({
      ok: true,
      outcome: "unavailable",
    });

    // The thrown error is never inspected, so it cannot reach a log.
    expect(loggedText(errorSpy)).not.toContain(FAKE_SECRET);
    expect(loggedText(warnSpy)).not.toContain(FAKE_SECRET);
  });
});
