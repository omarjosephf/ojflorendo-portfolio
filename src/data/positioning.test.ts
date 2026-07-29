import { describe, expect, it } from "vitest";
import { positioning } from "./positioning";
import { site } from "./site";

function flatten(value: unknown): string {
  return JSON.stringify(value);
}

describe("approved Track B positioning", () => {
  it("uses the approved display and professional identities", () => {
    expect(site.name).toBe("OJ Florendo Rayatchi");
    expect(positioning.professionalName).toBe("OJ Florendo");
    expect(site.descriptor).toBe(
      "Software Developer · AI-Focused Builder · Creative Developer",
    );
  });

  it("labels current and experimental services honestly", () => {
    expect(positioning.services.availableNow).toHaveLength(4);
    expect(positioning.services.experimental).toContain("experimental projects");
    expect(positioning.services.scopeNote).toContain("discovery phase");
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
});
