import { describe, expect, it } from "vitest";
import {
  KIND,
  STAR_BUDGET,
  STRIDE,
  VERTEX_SHADER,
  armLength,
  armPoint,
  armTipDirection,
  buildStars,
  countsFor,
  galaxyFor,
  RIVER_SPEED,
  strandLanes,
  strandPoint,
  streamShare,
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
    expect(sum(STAR_BUDGET.counts.desktop)).toBeLessThanOrEqual(9000);
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

  it("keeps the river's thickness sample to three standard deviations", () => {
    const data = buildStars({ field: 0, galaxy: 0, river: 2000 }, seeded(11));
    for (let i = 0; i < 2000; i += 1) {
      expect(Math.abs(data[i * STRIDE + 3])).toBeLessThanOrEqual(3);
    }
  });
});


describe("galaxy and stream geometry (ADR-0030, revision of 20 October 2026)", () => {
  const WIDTHS = [390, 768, 1024, 1440, 1920];
  const HERO = 900;

  it("places the galaxy at the hero's foot, with both arm tips on screen", () => {
    for (const width of WIDTHS) {
      const galaxy = galaxyFor(width, 0, HERO);
      expect(galaxy[1]).toBeGreaterThan(HERO * 0.85);
      expect(galaxy[1]).toBeLessThanOrEqual(HERO);
      for (const arm of [0, 1] as const) {
        const [x] = armPoint(arm, 1, galaxy);
        expect(x).toBeGreaterThan(width * 0.05);
        expect(x).toBeLessThan(width * 0.95);
      }
    }
  });

  it("starts each stream at its arm's tip, carrying on in the arm's direction", () => {
    for (const width of WIDTHS) {
      const galaxy = galaxyFor(width, 0, HERO);
      for (const arm of [0, 1] as const) {
        const tip = armPoint(arm, 1, galaxy);
        const start = strandPoint(arm, 0, width, galaxy);
        expect(start[0]).toBeCloseTo(tip[0], 6);
        expect(start[1]).toBeCloseTo(tip[1], 6);
        // The first pixel of the stream leaves along the arm's own direction.
        const next = strandPoint(arm, 1, width, galaxy);
        const [dx, dy] = armTipDirection(arm, galaxy);
        expect(next[0] - start[0]).toBeCloseTo(dx, 2);
        expect(next[1] - start[1]).toBeCloseTo(dy, 2);
      }
    }
  });

  it("braids the two streams down the page: mirrored lanes that cross, reaching both sides", () => {
    for (const width of WIDTHS) {
      const galaxy = galaxyFor(width, 0, HERO);
      const { bend, sweep, centre } = strandLanes(width);
      const samples = Array.from({ length: 81 }, (_, i) => bend + (i / 80) * 3 * sweep);
      const a = samples.map((along) => strandPoint(0, along, width, galaxy));
      const b = samples.map((along) => strandPoint(1, along, width, galaxy));
      // Past the bend, the lanes mirror each other about the page's centre...
      a.forEach(([x], i) => expect(x + b[i][0]).toBeCloseTo(2 * centre * width, 4));
      // ...so they cross, one going right to left while the other goes left to right.
      const signs = new Set(a.map(([x], i) => Math.sign(x - b[i][0])).filter(Boolean));
      expect(signs.size).toBe(2);
      const xs = a.map(([x]) => x);
      expect(Math.min(...xs)).toBeLessThan(width * 0.25);
      expect(Math.max(...xs)).toBeGreaterThan(width * 0.75);
      expect(sweep).toBeGreaterThanOrEqual(520);
      expect(sweep).toBeLessThanOrEqual(960);
    }
  });

  it("keeps both streams on the page and always flowing down after the bend", () => {
    for (const width of WIDTHS) {
      const galaxy = galaxyFor(width, 0, HERO);
      const { bend } = strandLanes(width);
      for (const arm of [0, 1] as const) {
        let previousY = -Infinity;
        for (let along = 0; along <= 6000; along += 20) {
          const [x, y] = strandPoint(arm, along, width, galaxy);
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(width);
          if (along >= bend) {
            expect(y).toBeGreaterThan(previousY);
            previousY = y;
          }
        }
      }
    }
  });

  it("moves every flowing star at one shared pace, along the arms and down the streams", () => {
    expect(RIVER_SPEED).toBeGreaterThan(0);
    expect(VERTEX_SHADER).toContain(`fract(a_a.y + u_time * ${RIVER_SPEED.toFixed(1)} / len)`);
    expect(VERTEX_SHADER).toContain("fract(a_a.y + u_time * u_armFlow)");
    for (const width of WIDTHS) expect(armLength(galaxyFor(width, 0, HERO))).toBeGreaterThan(width * 0.3);
  });

  it("draws fewer stream stars on a short page, so no stream is denser than the budget", () => {
    for (const width of WIDTHS) {
      const galaxy = galaxyFor(width, 0, HERO);
      const perStream = countsFor(width).river / 2;
      for (const docHeight of [1600, 3000, 8000, 12000]) {
        const length = docHeight - armPoint(0, 1, galaxy)[1] - 80;
        const share = streamShare(width, docHeight, galaxy);
        expect(share).toBeGreaterThan(0);
        expect(share).toBeLessThanOrEqual(1);
        expect((share * perStream) / length).toBeLessThanOrEqual(STAR_BUDGET.streamDensity + 1e-9);
      }
    }
    expect(VERTEX_SHADER).toContain("> u_share) size = 0.0");
  });
});
