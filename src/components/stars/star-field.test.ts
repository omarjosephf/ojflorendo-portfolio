import { describe, expect, it } from "vitest";
import {
  KIND,
  STAR_BUDGET,
  STRIDE,
  VERTEX_SHADER,
  buildStars,
  countsFor,
  galaxyFor,
  riverBand,
  riverPoint,
} from "./star-field";

/** A small deterministic generator so the geometry tests are repeatable. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("star sky budget (ADR-0030)", () => {
  it("caps frames, pixel ratio and star counts", () => {
    expect(STAR_BUDGET.fpsCap).toBeLessThanOrEqual(60);
    expect(STAR_BUDGET.dprCap).toBeLessThanOrEqual(2);
    const sum = (c: { field: number; galaxy: number; river: number }) => c.field + c.galaxy + c.river;
    expect(sum(STAR_BUDGET.counts.desktop)).toBeLessThanOrEqual(8000);
    expect(sum(STAR_BUDGET.counts.compact)).toBeLessThan(sum(STAR_BUDGET.counts.desktop) / 2);
  });

  it("keeps the sky dim, and dimmer still behind text", () => {
    expect(STAR_BUDGET.brightness).toBeLessThanOrEqual(1);
    expect(STAR_BUDGET.dimInside).toBeLessThanOrEqual(0.25);
    expect(VERTEX_SHADER).toContain(`if (i >= u_rectCount) break;`);
  });

  it("uses the compact counts on phones", () => {
    expect(countsFor(390)).toBe(STAR_BUDGET.counts.compact);
    expect(countsFor(1440)).toBe(STAR_BUDGET.counts.desktop);
  });
});

describe("star attributes", () => {
  it("packs every star in two vec4 attributes, grouped by kind", () => {
    const counts = { field: 3, galaxy: 4, river: 5 };
    const data = buildStars(counts, seeded(7));
    expect(data.length).toBe((3 + 4 + 5) * STRIDE);
    const kinds = Array.from({ length: 12 }, (_, i) => data[i * STRIDE]);
    expect(kinds).toEqual([0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2].map((k) => [KIND.field, KIND.galaxy, KIND.river][k]));
  });

  it("keeps the river's sideways spread to three standard deviations", () => {
    const data = buildStars({ field: 0, galaxy: 0, river: 2000 }, seeded(11));
    for (let i = 0; i < 2000; i += 1) {
      expect(Math.abs(data[i * STRIDE + 3])).toBeLessThanOrEqual(3);
    }
  });
});

describe("river and galaxy geometry", () => {
  it("keeps the river inside its band from the galaxy to the foot of the page", () => {
    for (const width of [390, 1440]) {
      const [centre, swing] = riverBand(width);
      for (let s = 0; s <= 1; s += 0.05) {
        const [x, y] = riverPoint(s, width, 400, 6000);
        expect(x).toBeGreaterThanOrEqual(width * (centre - swing) - 0.001);
        expect(x).toBeLessThanOrEqual(width * (centre + swing) + 0.001);
        expect(y).toBeGreaterThanOrEqual(400);
        expect(y).toBeLessThanOrEqual(6000 - 80 + 0.001);
      }
    }
  });

  it("keeps the river to the right of left-aligned headings on wide screens", () => {
    const [centre, swing] = riverBand(1440);
    expect(centre - swing).toBeGreaterThanOrEqual(0.5);
  });

  it("places the galaxy inside the hero", () => {
    for (const width of [390, 1440]) {
      const [x, y, radius] = galaxyFor(width, 0, 900);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(900);
      expect(radius).toBeGreaterThan(0);
    }
  });
});
