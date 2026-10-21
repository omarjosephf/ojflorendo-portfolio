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
     * ADR-0032 D1: automations and workflows lead, then AI agents, games and
     * websites with care plans. Games stay "Future roadmap" until the owner's
     * first game is released (D2); the rest are "Available now". That is a
     * claim about what is offered, not a promise to run anything a visitor
     * asks for, so the scope note is load-bearing and is asserted here.
     * Removing it would turn an honest "available" into an unscoped yes.
     */
    const titles = positioning.services.offers.map((offer) => offer.title);
    expect(titles).toEqual([
      "AI automations and workflows",
      "AI agents",
      "Games",
      "Websites and care plans",
    ]);
    expect(positioning.services.offers.map((offer) => offer.status)).toEqual([
      "Available now",
      "Available now",
      "Future roadmap",
      "Available now",
    ]);
    expect(positioning.services.scopeNote).toContain("defined task");
    expect(positioning.services.scopeNote).toContain("privacy review");
    expect(positioning.services.scopeNote).toContain("without your permission");
  });

  it("offers building, not checks or fixes of other people's apps", () => {
    // ADR-0032 retires the build check and the fixes offer (amending ADR-0031).
    // The contact section is rewritten in its own step, so it is not yet held
    // to this.
    const content = flatten({ positioning: { ...positioning, contact: null }, site }).toLowerCase();
    for (const retired of ["build check", "fixes before launch", "get your app checked"]) {
      expect(content).not.toContain(retired);
    }
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

  it("publishes no fixed prices (ADR-0032)", () => {
    /*
     * On 21 October 2026 the owner withdrew the fixed prices of ADR-0031: every
     * project is quoted after a free call. A published price is an offer, so
     * any currency amount in the copy is an unapproved one.
     */
    const content = flatten({ positioning, site });
    expect(content).not.toMatch(/[£$€]\s?\d/);
    for (const offer of positioning.services.offers) {
      expect(Object.keys(offer)).not.toContain("price");
    }
    expect(positioning.services.intro).toContain("quote");
    expect(positioning.services.priceNote).toContain("not VAT-registered");
  });

  it("states that scope, timing and price are agreed individually", () => {
    expect(positioning.hero.availability).toContain(
      "Scope, timing and price agreed individually",
    );
  });
});
