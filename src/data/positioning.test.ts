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
  it("uses the approved display and professional identities", () => {
    expect(site.name).toBe("OJ Florendo Rayatchi");
    expect(positioning.professionalName).toBe("OJ Florendo");
    expect(site.descriptor).toBe("Web developer · AI product builder");
  });

  it("labels every service with a status the handbook permits", () => {
    expect(positioning.services.offers).toHaveLength(3);

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

  it("keeps the document-assistant offer scoped rather than open-ended", () => {
    /*
     * This offer moved from "Experimental" to "Available now" on the strength
     * of two systems that were actually built and deployed. That is a claim
     * about capability, not a promise to run anything a visitor asks for — so
     * the scope note is load-bearing and is asserted here. Removing it would
     * turn an honest "available" into an unscoped yes.
     */
    const assistant = positioning.services.offers.at(-1);
    expect(assistant?.status).toBe("Available now");
    expect(assistant?.title.toLowerCase()).toContain("document assistant");
    expect(positioning.services.scopeNote).toContain("defined set of documents");
    expect(positioning.services.scopeNote).toContain("privacy review");
  });

  it("keeps verified background visible rather than deleting it", () => {
    // Training and digital/e-commerce work are verified experience. The offer
    // narrowed to websites; the background must not silently disappear with it.
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

  it("does not imply clients, outcomes or prices that do not exist", () => {
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
      "starting from £",
    ]) {
      expect(content).not.toContain(claim);
    }
  });

  it("states that scope, timing and price are agreed individually", () => {
    expect(positioning.hero.availability).toContain(
      "Scope and timing agreed individually",
    );
  });
});
