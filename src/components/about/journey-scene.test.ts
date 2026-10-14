import { describe, expect, it } from "vitest";
import {
  BUILDING_STAGE,
  JOURNEY_BUDGET,
  KIND,
  MOONS,
  POINT_STRIDE,
  STAGE_ANCHORS,
  buildJourney,
  buildProgressFor,
  cameraZFor,
  journeyCountsFor,
  nameFrame,
} from "./journey-scene";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("journey budget (ADR-0030)", () => {
  it("caps frames, pixel ratio and points, with fewer on phones", () => {
    expect(JOURNEY_BUDGET.fpsCap).toBeLessThanOrEqual(60);
    expect(JOURNEY_BUDGET.dprCap).toBeLessThanOrEqual(2);
    const sum = (c: { tunnel: number; name: number; planet: number; moon: number }) =>
      c.tunnel + c.name + c.planet + c.moon * MOONS;
    expect(sum(JOURNEY_BUDGET.counts.desktop)).toBeLessThanOrEqual(10_000);
    expect(sum(JOURNEY_BUDGET.counts.compact)).toBeLessThan(sum(JOURNEY_BUDGET.counts.desktop) / 2);
    expect(journeyCountsFor(390)).toBe(JOURNEY_BUDGET.counts.compact);
    expect(journeyCountsFor(1440)).toBe(JOURNEY_BUDGET.counts.desktop);
  });

  it("has one camera anchor per stage of the page, moving forward", () => {
    expect(STAGE_ANCHORS).toHaveLength(7);
    for (let i = 1; i < STAGE_ANCHORS.length; i += 1) {
      expect(STAGE_ANCHORS[i]).toBeLessThan(STAGE_ANCHORS[i - 1]);
    }
  });
});

describe("camera path", () => {
  const tops = [0, 1000, 2000, 3000, 4000, 5000, 6000];

  it("holds at each stage's anchor and only moves near the end of a stage", () => {
    expect(cameraZFor(0, tops)).toBe(STAGE_ANCHORS[0]);
    expect(cameraZFor(1000, tops)).toBe(STAGE_ANCHORS[1]);
    expect(cameraZFor(1400, tops)).toBe(STAGE_ANCHORS[1]);
    expect(cameraZFor(1999, tops)).toBeCloseTo(STAGE_ANCHORS[2], 0);
    expect(cameraZFor(99_999, tops)).toBe(STAGE_ANCHORS[6]);
  });

  it("never moves backwards as the reader scrolls down", () => {
    let previous = Infinity;
    for (let y = 0; y <= 7000; y += 50) {
      const z = cameraZFor(y, tops);
      expect(z).toBeLessThanOrEqual(previous);
      previous = z;
    }
  });

  it("settles the orbits on the way into the Building stage", () => {
    expect(buildProgressFor(STAGE_ANCHORS[BUILDING_STAGE - 1])).toBe(0);
    expect(buildProgressFor(STAGE_ANCHORS[BUILDING_STAGE])).toBe(1);
    expect(buildProgressFor(STAGE_ANCHORS[0])).toBe(0);
  });
});

describe("scene points", () => {
  it("builds every group with the right kinds", () => {
    const counts = { tunnel: 5, name: 6, planet: 7, moon: 3 };
    const samples = new Float32Array([0.1, 0.2, 0.5, 0.5, 0.9, 0.8]);
    const data = buildJourney(counts, 1.6, samples, seeded(3));
    const total = 5 + 6 + 7 + 3 * MOONS;
    expect(data.length).toBe(total * POINT_STRIDE);
    const kinds = Array.from({ length: total }, (_, i) => data[i * POINT_STRIDE + 6]);
    expect(kinds.filter((k) => k === KIND.tunnel)).toHaveLength(5);
    expect(kinds.filter((k) => k === KIND.name)).toHaveLength(6);
    expect(kinds.filter((k) => k === KIND.planet)).toHaveLength(7);
    expect(kinds.filter((k) => k === KIND.moon)).toHaveLength(3 * MOONS);
  });

  it("draws the name inside its frame", () => {
    const frame = nameFrame(1.6);
    const samples = new Float32Array([0, 0, 1, 1, 0.5, 0.5]);
    const data = buildJourney({ tunnel: 0, name: 50, planet: 0, moon: 0 }, 1.6, samples, seeded(5));
    for (let i = 0; i < 50; i += 1) {
      const x = data[i * POINT_STRIDE];
      const y = data[i * POINT_STRIDE + 1];
      expect(Math.abs(x)).toBeLessThanOrEqual(frame.width / 2 + 1e-6);
      expect(Math.abs(y - frame.y)).toBeLessThanOrEqual(frame.height / 2 + 1e-6);
    }
  });

  it("scatters the name points as plain stars when there are no samples", () => {
    const data = buildJourney({ tunnel: 0, name: 10, planet: 0, moon: 0 }, 1.6, new Float32Array(), seeded(9));
    for (let i = 0; i < 10; i += 1) {
      const o = i * POINT_STRIDE;
      expect([data[o], data[o + 1], data[o + 2]]).toEqual([data[o + 3], data[o + 4], data[o + 5]]);
    }
  });
});
