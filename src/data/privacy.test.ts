import { describe, expect, it } from "vitest";
import { privacySections } from "./privacy";
import { site } from "./site";

const text = privacySections.flatMap((section) => section.paragraphs).join(" ");

describe("privacy notice", () => {
  it("names each service that handles visitor data", () => {
    for (const service of ["Resend", "Cloudflare Turnstile", "Gemini", "OpenAI", "Vercel", "Fly.io"]) {
      expect(text).toContain(service);
    }
  });

  it("states that enquiries are not stored and questions are not logged", () => {
    expect(text).toContain("isn't saved in a database");
    expect(text).toContain("never your question");
  });

  it("says there is no analytics while none is installed (handbook §27)", () => {
    expect(text).toContain("no analytics");
  });

  it("shows the booking section only once a booking link exists (ADR-0033)", () => {
    const hasBooking = privacySections.some((section) => section.id === "booking");
    expect(hasBooking).toBe(site.bookingUrl !== null);
  });

  it("gives a contact address and the regulator", () => {
    expect(text).toContain(site.email);
    expect(text).toContain("Information Commissioner's Office");
  });

  it("uses only the public name", () => {
    expect(text).not.toMatch(/Rayatchi|\bOJ\b/);
  });

  it("gives every section a unique anchor", () => {
    const ids = privacySections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
