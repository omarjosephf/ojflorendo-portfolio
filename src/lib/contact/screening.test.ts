// @vitest-environment node
// Server-only module. DNS is mocked throughout: the suite must never depend on
// a network resolver, or it would be slow and flaky in CI.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const resolveMx = vi.fn();
const resolve4 = vi.fn();

vi.mock("node:dns", () => ({
  promises: {
    resolveMx: (...args: unknown[]) => resolveMx(...args),
    resolve4: (...args: unknown[]) => resolve4(...args),
  },
}));

const { countLinks, domainOf, domainAcceptsMail, screenContact } = await import(
  "./screening"
);

/** A DNS error carrying the `code` property Node sets. */
function dnsError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

const validEnquiry = {
  name: "Jane Recruiter",
  email: "jane@example.com",
  enquiryType: "job" as const,
  subject: "Frontend role",
  message: "We have an opening that fits your profile nicely.",
  consent: true,
};

beforeEach(() => {
  resolveMx.mockReset();
  resolve4.mockReset();
  // Default: a normal domain with mail.
  resolveMx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("domainOf", () => {
  it("takes the part after the final @ and lowercases it", () => {
    expect(domainOf("jane@Example.COM")).toBe("example.com");
    expect(domainOf("odd@name@sub.example.org")).toBe("sub.example.org");
  });
});

describe("countLinks", () => {
  it("counts http, https and bare www links", () => {
    expect(countLinks("no links here")).toBe(0);
    expect(
      countLinks("see https://a.com and http://b.com plus www.c.com"),
    ).toBe(3);
  });
});

describe("domainAcceptsMail", () => {
  it("accepts a domain publishing MX records", async () => {
    await expect(domainAcceptsMail("example.com")).resolves.toBe(true);
  });

  it("rejects a domain that does not exist", async () => {
    resolveMx.mockRejectedValue(dnsError("ENOTFOUND"));
    await expect(domainAcceptsMail("nope.invalid")).resolves.toBe(false);
  });

  it("accepts a domain with no MX but a usable address record (RFC 5321)", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockResolvedValue(["203.0.113.10"]);
    await expect(domainAcceptsMail("small.example")).resolves.toBe(true);
  });

  it("rejects a domain with neither MX nor address record", async () => {
    resolveMx.mockRejectedValue(dnsError("ENODATA"));
    resolve4.mockRejectedValue(dnsError("ENODATA"));
    await expect(domainAcceptsMail("empty.example")).resolves.toBe(false);
  });

  it("returns no verdict when the resolver itself fails", async () => {
    // ESERVFAIL is an infrastructure problem, not evidence about the domain.
    resolveMx.mockRejectedValue(dnsError("ESERVFAIL"));
    await expect(domainAcceptsMail("example.com")).resolves.toBeNull();
  });
});

describe("screenContact", () => {
  it("accepts an ordinary enquiry", async () => {
    await expect(screenContact(validEnquiry)).resolves.toEqual({
      ok: true,
      outcome: "accepted",
    });
  });

  it("allows a realistic number of links", async () => {
    // A real recruiter may include company, spec, LinkedIn and a calendar link.
    const message =
      "Role: https://acme.com/jobs/1 about https://acme.com " +
      "profile www.linkedin.com/in/someone booking https://cal.com/x";
    await expect(
      screenContact({ ...validEnquiry, message }),
    ).resolves.toEqual({ ok: true, outcome: "accepted" });
  });

  it("rejects a link-flooded message", async () => {
    const message = Array.from(
      { length: 12 },
      (_, i) => `https://spam${i}.example`,
    ).join(" ");
    await expect(
      screenContact({ ...validEnquiry, message }),
    ).resolves.toEqual({ ok: false, outcome: "link-flood" });
  });

  it("rejects a disposable email domain without a DNS lookup", async () => {
    await expect(
      screenContact({ ...validEnquiry, email: "someone@mailinator.com" }),
    ).resolves.toEqual({ ok: false, outcome: "disposable-domain" });
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it("rejects an email domain that cannot receive mail", async () => {
    resolveMx.mockRejectedValue(dnsError("ENOTFOUND"));
    resolve4.mockRejectedValue(dnsError("ENOTFOUND"));
    await expect(
      screenContact({ ...validEnquiry, email: "jane@does-not-exist.invalid" }),
    ).resolves.toEqual({ ok: false, outcome: "undeliverable-domain" });
  });

  it("FAILS OPEN when DNS is unavailable, so an outage cannot lose a client", async () => {
    resolveMx.mockRejectedValue(dnsError("ESERVFAIL"));
    await expect(screenContact(validEnquiry)).resolves.toEqual({
      ok: true,
      outcome: "accepted",
    });
  });

  it("FAILS OPEN when the resolver hangs past the timeout", async () => {
    resolveMx.mockImplementation(() => new Promise(() => {}));
    resolve4.mockImplementation(() => new Promise(() => {}));
    await expect(screenContact(validEnquiry)).resolves.toEqual({
      ok: true,
      outcome: "accepted",
    });
  }, 10_000);
});
