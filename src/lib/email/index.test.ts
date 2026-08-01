// @vitest-environment node
// This module is server-only, so it is exercised under the Node environment —
// matching `src/app/api/contact/route.test.ts`. It also keeps `AbortSignal` and
// `DOMException` identical to production; jsdom's differ.
import { describe, it, expect, vi, afterEach } from "vitest";
import { getEmailTransport } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

/** A recognisable fake secret, so tests can assert it never reaches a log. */
const FAKE_KEY = "re_test_SECRET_VALUE_must_never_be_logged";

/**
 * Configure a complete Resend environment with an explicit fetch behaviour.
 *
 * The resolve/reject choice is stated by the caller rather than inferred from
 * the argument's type: inferring it once made a rejection test pass vacuously.
 */
function stubResendEnv(fetchImpl: () => Promise<Response>) {
  vi.stubEnv("RESEND_API_KEY", FAKE_KEY);
  vi.stubEnv("CONTACT_TO_EMAIL", "inbox@example.com");
  vi.stubEnv("CONTACT_FROM_EMAIL", "enquiries@send.example.com");
  // Typed with fetch's own signature so the recorded call arguments stay typed.
  const fetchSpy = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>(
    fetchImpl,
  );
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

type FetchSpy = ReturnType<typeof stubResendEnv>;

/** The request options the transport passed to fetch on its first call. */
function sentInit(fetchSpy: FetchSpy): RequestInit {
  return fetchSpy.mock.calls[0]![1]!;
}

/** Resend replies with `response`. */
function stubResendResolves(response: Response) {
  return stubResendEnv(() => Promise.resolve(response));
}

/** The request fails outright (network error or abort). */
function stubResendRejects(error: unknown) {
  return stubResendEnv(() => Promise.reject(error));
}

/** Read the JSON body the transport sent to Resend. */
function sentBody(fetchSpy: FetchSpy): Record<string, unknown> {
  return JSON.parse(sentInit(fetchSpy).body as string) as Record<
    string,
    unknown
  >;
}

/** Flatten captured console output into one searchable string. */
function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map((a: unknown) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
}

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

  it("stays silent when all three variables are absent (the local default)", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    vi.stubEnv("CONTACT_FROM_EMAIL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getEmailTransport().mode).toBe("mock");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns naming the missing variables — and no values — when partly configured", () => {
    vi.stubEnv("RESEND_API_KEY", FAKE_KEY);
    vi.stubEnv("CONTACT_TO_EMAIL", "inbox@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getEmailTransport().mode).toBe("mock");

    const logged = loggedText(warn);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(logged).toContain("CONTACT_FROM_EMAIL");
    // Only the absent variable is named, and no configured value leaks.
    expect(logged).not.toContain("RESEND_API_KEY");
    expect(logged).not.toContain(FAKE_KEY);
    expect(logged).not.toContain("inbox@example.com");
  });
});

describe("resend transport", () => {
  it("posts to the Resend API with bearer auth and a JSON content type", async () => {
    const fetchSpy = stubResendResolves(new Response("{}", { status: 200 }));

    const result = await getEmailTransport().send(message);

    expect(result).toEqual({ ok: true, delivered: true, mode: "resend" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    expect(fetchSpy.mock.calls[0]![0]).toBe("https://api.resend.com/emails");
    const init = sentInit(fetchSpy);
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends plain text only, addressed correctly, replying to the enquirer", async () => {
    const fetchSpy = stubResendResolves(new Response("{}", { status: 200 }));

    await getEmailTransport().send(message);
    const body = sentBody(fetchSpy);

    expect(body.from).toBe("enquiries@send.example.com");
    expect(body.to).toEqual(["inbox@example.com"]);
    // Replies must reach the enquirer, not the configured sender address.
    expect(body.reply_to).toBe(message.email);
    expect(body.subject).toBe("[Portfolio] Job opportunity: Hello");
    expect(body.text).toContain(message.message);
    expect(body.text).toContain(message.email);
    // ADR-0001 item 7: outbound email is plain text; submitted HTML is never rendered.
    expect(body).not.toHaveProperty("html");
  });

  it("bounds the attempt with an abort signal so a hung provider cannot hang the request", async () => {
    const fetchSpy = stubResendResolves(new Response("{}", { status: 200 }));

    await getEmailTransport().send(message);

    expect(sentInit(fetchSpy).signal).toBeInstanceOf(AbortSignal);
  });

  it("reports failure without reading or logging the provider response body", async () => {
    // A rejection body could echo submitted content, so it must never be touched.
    const body = "provider-detail-that-must-not-be-logged";
    const res = new Response(body, { status: 403 });
    const fetchSpy = stubResendResolves(res);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getEmailTransport().send(message);

    expect(result).toEqual({ ok: false, delivered: false, mode: "resend" });
    expect(res.bodyUsed).toBe(false);
    expect(loggedText(errorSpy)).not.toContain(body);
    expect(loggedText(warnSpy)).not.toContain(body);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("resolves (never throws) when the request times out", async () => {
    // What AbortSignal.timeout produces once the deadline passes.
    stubResendRejects(
      new DOMException("The operation was aborted.", "TimeoutError"),
    );

    await expect(getEmailTransport().send(message)).resolves.toEqual({
      ok: false,
      delivered: false,
      mode: "resend",
    });
  });

  it("resolves (never throws) on a network failure, leaking no secret to logs", async () => {
    stubResendRejects(new TypeError(`fetch failed for key ${FAKE_KEY}`));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getEmailTransport().send(message);

    expect(result).toEqual({ ok: false, delivered: false, mode: "resend" });
    // The thrown error is never inspected, so its contents cannot reach a log.
    expect(loggedText(errorSpy)).not.toContain(FAKE_KEY);
    expect(loggedText(warnSpy)).not.toContain(FAKE_KEY);
  });
});
