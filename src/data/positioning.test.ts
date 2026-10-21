import { describe, expect, it } from "vitest";
import { positioning } from "./positioning";
import { site } from "./site";

/** The only service maturity labels handbook 6.2 permits. */
const PERMITTED_SERVICE_STATUSES = [
  "Available now",
  "Experimental / available for collaboration",
  "Future roadmap",
] as const;

function flatten(value: unknown): string {
  return JSON.stringify(value);
}

describe("approved Track B positioning", () => {
  it("uses the approved display identity and title (ADR-0029)", () => {
    expect(site.name).toBe("Joseph Florendo");
    expect(positioning.professionalName).toBe("Joseph Florendo");
    expect(site.descriptor).toBe("AI Automation Developer");
  });

  it("never publishes the previous or private names in site copy", () => {
    const content = flatten({ positioning, site: { ...site, cvPath: null } });
    expect(content).not.toMatch(/Rayatchi|\bOJ\b/);
  });

  it("labels every service with a status the handbook permits", () => {
    expect(positioning.services.offers).toHaveLength(4);

    /*
     * Handbook 6.2 allows exactly three maturity labels. Asserting membership
     * of that set is stronger than pinning one offer's string: it catches an
     * invented status ("Coming soon", "Limited availability") on ANY offer,
     * which is the failure that would actually mislead a visitor.
     */
    for (const offer of positioning.services.offers) {
      expect(offer.status.length).toBeGreaterThan(0);
      expect(
        PERMITTED_SERVICE_STATUSES.some((s) => offer.status.startsWith(s)),
        `"${offer.status}" is not a permitted service maturity label`,
      ).toBe(true);
    }
  });

  it("orders the offers as the owner decided and keeps them scoped", () => {
    /*
     * ADR-0031 D1: the build check leads, then fixes, automation and the care
     * plan. Every offer is "Available now" by owner decision. That is a claim
     * about what is offered, not a promise to run anything a visitor asks for,
     * so the scope note is load-bearing and is asserted here. Removing it would
     * turn an honest "available" into an unscoped yes.
     */
    const titles = positioning.services.offers.map((offer) => offer.title);
    expect(titles).toEqual([
      "AI build check",
      "Fixes before launch",
      "Then automate the busywork",
      "Care plan",
    ]);
    for (const offer of positioning.services.offers) {
      expect(offer.status).toBe("Available now");
    }
    expect(positioning.services.scopeNote).toContain("defined task");
    expect(positioning.services.scopeNote).toContain("privacy review");
  });

  it("keeps verified background visible rather than deleting it", () => {
    // Training and digital/e-commerce work are verified experience. The offer
    // moved to automation; the background must not silently disappear with it.
    expect(positioning.services.relatedWork).toContain("training");
    expect(positioning.services.relatedWork).toContain("e-commerce");
  });

  it("does not contain prohibited public claims", () => {
    const content = flatten({ positioning, site });
    for (const claim of [
      "I am an AI expert",
      "I can solve any problem",
      "Built entirely by AI",
      "Claude built this website",
    ]) {
      expect(content).not.toContain(claim);
    }
  });

  it("does not imply clients or outcomes that do not exist", () => {
    /*
     * The client-focused rewrite is the first copy on this site that could
     * plausibly imply a customer base. Handbook 6.2 forbids invented clients,
     * testimonials, metrics and commercial outcomes, so the risk is guarded
     * here rather than left to review.
     */
    const content = flatten({ positioning, site }).toLowerCase();
    for (const claim of [
      "trusted by",
      "our clients",
      "my clients",
      "clients say",
      "happy customers",
      "guaranteed",
      "increase your revenue",
    ]) {
      expect(content).not.toContain(claim);
    }
  });

  it("shows only the owner-approved prices (ADR-0031)", () => {
    /*
     * The prices the owner approved on 21 October 2026, in pounds and in US
     * dollars at the 12-month average rate. Any other amount in the copy is a
     * typo or an unapproved price, and a published price is an offer.
     */
    const approved = new Set([
      "£195", "£250", "£450", "£500", "£760", "£950", "£1,000", "£2,500", "£3,150",
      "US$260", "US$600", "US$1,020", "US$1,275", "US$1,350", "US$3,350", "US$4,200",
    ]);
    const amounts = flatten({ positioning, site }).match(/US\$\d{1,3}(?:,\d{3})*|£\d{1,3}(?:,\d{3})*/g) ?? [];
    expect(amounts.length).toBeGreaterThan(0);
    for (const amount of amounts) {
      expect(approved.has(amount), `${amount} is not an approved price`).toBe(true);
    }

    const [check, fixes, automation, care] = positioning.services.offers;
    expect(check.price).toBe("£950 (US$1,275)");
    expect(check.priceDetail).toContain("£760 (US$1,020)");
    expect(fixes.price).toBe("From £1,000 (US$1,350)");
    expect(automation.priceDetail).toContain("£2,500 (US$3,350)");
    expect(care.price).toBe("£195 (US$260) a month");
    expect(positioning.services.priceNote).toContain("not VAT-registered");
  });

  it("states that scope, timing and price are agreed individually", () => {
    expect(positioning.hero.availability).toContain(
      "Scope and timing agreed individually",
    );
  });
});
