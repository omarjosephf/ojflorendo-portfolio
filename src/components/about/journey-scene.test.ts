import { describe, expect, it } from "vitest";
import {
  ASTEROIDS,
  BUILDING_STAGE,
  GALAXY_STAGE,
  JOURNEY_BUDGET,
  KIND,
  MOONS,
  OBJ,
  OBJECT_SLOTS,
  POINT_STRIDE,
  STAGES,
  STAGE_ANCHORS,
  VIEW_DISTANCE,
  buildJourney,
  buildProgressFor,
  cameraZFor,
  journeyCountsFor,
  landmarkZ,
  landmarks,
  nameFrame,
  pointTotal,
  sampleMaskEvenly,
  travel,
  type JourneyCounts,
} from "./journey-scene";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const NONE: JourneyCounts = {
  tunnel: 0, name: 0, nebula: 0, ringed: 0, planet: 0, moon: 0, belt: 0, cluster: 0, comet: 0, asteroid: 0, galaxy: 0,
};

describe("journey budget (ADR-0030)", () => {
  it("caps frames, pixel ratio and points, with fewer on phones", () => {
    expect(JOURNEY_BUDGET.fpsCap).toBeLessThanOrEqual(60);
    expect(JOURNEY_BUDGET.idleFps).toBeLessThanOrEqual(30);
    expect(JOURNEY_BUDGET.dprCap).toBeLessThanOrEqual(2);
    expect(pointTotal(JOURNEY_BUDGET.counts.desktop)).toBeLessThanOrEqual(20_000);
    expect(pointTotal(JOURNEY_BUDGET.counts.compact)).toBeLessThan(pointTotal(JOURNEY_BUDGET.counts.desktop) / 2);
    expect(journeyCountsFor(390)).toBe(JOURNEY_BUDGET.counts.compact);
    expect(journeyCountsFor(1440)).toBe(JOURNEY_BUDGET.counts.desktop);
  });

  it("has one camera anchor per stage plus the end of the page, evenly spaced and moving forward", () => {
    expect(STAGES).toHaveLength(8);
    expect(STAGE_ANCHORS).toHaveLength(STAGES.length + 1);
    for (let i = 1; i < STAGES.length; i += 1) {
      expect(STAGE_ANCHORS[i] - STAGE_ANCHORS[i - 1]).toBe(STAGE_ANCHORS[1] - STAGE_ANCHORS[0]);
    }
    expect(STAGE_ANCHORS[STAGES.length]).toBeLessThan(STAGE_ANCHORS[STAGES.length - 1]);
  });
});

describe("camera path", () => {
  const tops = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];

  it("starts at the first anchor and ends at the last", () => {
    expect(cameraZFor(-50, tops)).toBe(STAGE_ANCHORS[0]);
    expect(cameraZFor(0, tops)).toBe(STAGE_ANCHORS[0]);
    expect(cameraZFor(3000, tops)).toBe(STAGE_ANCHORS[3]);
    expect(cameraZFor(99_999, tops)).toBe(STAGE_ANCHORS[8]);
  });

  it("keeps moving through every stage instead of holding still", () => {
    let previous = cameraZFor(0, tops);
    for (let y = 25; y <= 8000; y += 25) {
      const z = cameraZFor(y, tops);
      expect(z).toBeLessThan(previous);
      previous = z;
    }
  });

  it("has no jumps: small scrolls make small moves", () => {
    for (let y = 0; y < 8000; y += 10) {
      expect(Math.abs(cameraZFor(y + 10, tops) - cameraZFor(y, tops))).toBeLessThan(2);
    }
  });

  it("slows mid-stage, where the landmark is framed, and holds the name at the start", () => {
    const rate = (f: number, first: boolean) => (travel(f + 0.01, first) - travel(f, first)) / 0.01;
    expect(rate(0.5, false)).toBeLessThan(rate(0.02, false));
    expect(rate(0.5, false)).toBeLessThan(rate(0.97, false));
    expect(rate(0, true)).toBeLessThan(0.05);
    expect(travel(0, false)).toBe(0);
    expect(travel(1, false)).toBeCloseTo(1, 10);
    expect(travel(0.5, false)).toBeCloseTo(0.5, 10);
  });

  it("frames each landmark mid-stage at the viewing distance", () => {
    for (let stage = 1; stage < GALAXY_STAGE; stage += 1) {
      const mid = cameraZFor((tops[stage] + tops[stage + 1]) / 2, tops);
      expect(mid - landmarkZ(stage)).toBeCloseTo(VIEW_DISTANCE, 6);
    }
    expect(landmarkZ(GALAXY_STAGE)).toBeLessThan(STAGE_ANCHORS[8]);
  });

  it("settles the orbits on the way into the Building stage", () => {
    expect(buildProgressFor(STAGE_ANCHORS[BUILDING_STAGE - 1])).toBe(0);
    expect(buildProgressFor(STAGE_ANCHORS[0])).toBe(0);
    expect(buildProgressFor(landmarkZ(BUILDING_STAGE) + VIEW_DISTANCE)).toBe(1);
  });
});

describe("landmarks", () => {
  it("keep right of the content column on wide screens and centred on phones", () => {
    const wide = landmarks(16 / 9, false);
    const phone = landmarks(390 / 844, true);
    for (let stage = 1; stage < STAGES.length; stage += 1) {
      expect(wide[stage].x).toBeGreaterThan(0);
      expect(Math.abs(phone[stage].x)).toBeLessThan(wide[stage].x);
      expect(phone[stage].scale).toBeLessThan(wide[stage].scale);
    }
  });
});

describe("scene points", () => {
  it("builds every group with the right kinds and fills the object table", () => {
    const counts: JourneyCounts = {
      tunnel: 5, name: 6, nebula: 40, ringed: 30, planet: 7, moon: 3, belt: 60, cluster: 70, comet: 40, asteroid: 4, galaxy: 70,
    };
    const samples = new Float32Array([0.1, 0.2, 0.5, 0.5, 0.9, 0.8]);
    const { data, objects } = buildJourney(counts, 1.6, samples, { rand: seeded(3) });
    const total = pointTotal(counts);
    expect(data.length).toBe(total * POINT_STRIDE);
    expect(objects.length).toBe(OBJECT_SLOTS * 4);
    const kinds = Array.from({ length: total }, (_, i) => data[i * POINT_STRIDE + 9]);
    expect(kinds.filter((k) => k === KIND.tunnel)).toHaveLength(5);
    expect(kinds.filter((k) => k === KIND.name)).toHaveLength(6);
    expect(kinds.filter((k) => k === KIND.moon)).toHaveLength(3 * MOONS);
    for (const kind of [KIND.sphere, KIND.disc, KIND.cloud, KIND.comet, KIND.belt]) {
      expect(kinds.filter((k) => k === kind).length).toBeGreaterThan(0);
    }
    const objectIds = new Set(Array.from({ length: total }, (_, i) => data[i * POINT_STRIDE + 12]));
    for (const id of [OBJ.nebula, OBJ.ringed, OBJ.planet, OBJ.belt, OBJ.cluster, OBJ.comet, OBJ.galaxy]) {
      expect(objectIds.has(id)).toBe(true);
    }
    for (let k = 0; k < ASTEROIDS; k += 1) expect(objectIds.has(OBJ.asteroid + k)).toBe(true);
    // Each moon orbits outside the planet.
    for (let moon = 0; moon < MOONS; moon += 1) expect(objects[(OBJ.moon + moon) * 4 + 3]).toBeGreaterThan(9);
  });

  it("places each landmark's points around its stage's spot", () => {
    const { data } = buildJourney({ ...NONE, planet: 50 }, 1.6, new Float32Array(), { compact: false, rand: seeded(4) });
    const spot = landmarks(1.6, false)[BUILDING_STAGE];
    for (let i = 0; i < 50; i += 1) {
      const o = i * POINT_STRIDE;
      expect([data[o + 3], data[o + 4], data[o + 5]]).toEqual([spot.x, spot.y, spot.z].map((v) => Math.fround(v)));
      expect(Math.hypot(data[o], data[o + 1], data[o + 2])).toBeLessThanOrEqual(9 * 1.03 + 1e-4);
    }
  });

  it("draws the name inside its frame and scatters points beyond the samples", () => {
    const frame = nameFrame(1.6);
    const samples = new Float32Array([0, 0, 1, 1, 0.5, 0.5]);
    const { data } = buildJourney({ ...NONE, name: 10 }, 1.6, samples, { rand: seeded(5) });
    for (let i = 0; i < 10; i += 1) {
      const o = i * POINT_STRIDE;
      if (i < 3) {
        expect(Math.abs(data[o])).toBeLessThanOrEqual(frame.width / 2 + 1e-4);
        expect(Math.abs(data[o + 1] - frame.y)).toBeLessThanOrEqual(frame.height / 2 + 1e-4);
      } else {
        expect([data[o], data[o + 1], data[o + 2]]).toEqual([data[o + 3], data[o + 4], data[o + 5]]);
      }
    }
  });
});

describe("name sampling", () => {
  // A ring, like the letter "o": ink between radius 20 and 40 around (50, 50).
  const size = 100;
  const ring = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot(x - 50, y - 50);
      ring[y * size + x] = r >= 20 && r <= 40 ? 1 : 0;
    }
  }

  it("never returns more points than asked, all on the ink, none repeated", () => {
    const points = sampleMaskEvenly(ring, size, size, 300, seeded(7));
    expect(points.length / 2).toBeLessThanOrEqual(300);
    expect(points.length / 2).toBeGreaterThan(200);
    const seen = new Set<string>();
    for (let i = 0; i < points.length; i += 2) {
      const x = Math.floor(points[i] * size);
      const y = Math.floor(points[i + 1] * size);
      expect(ring[y * size + x]).toBe(1);
      const key = `${x},${y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("traces both outlines, so the hole of an \"o\" stays clear", () => {
    const points = sampleMaskEvenly(ring, size, size, 300, seeded(8));
    let inner = 0;
    let outer = 0;
    for (let i = 0; i < points.length; i += 2) {
      const r = Math.hypot(points[i] * size - 50, points[i + 1] * size - 50);
      if (r < 21.5) inner += 1;
      if (r > 38.5) outer += 1;
    }
    expect(inner).toBeGreaterThan(20);
    expect(outer).toBeGreaterThan(30);
  });

  it("spreads points evenly: no two closer than a third of the average spacing", () => {
    const points = sampleMaskEvenly(ring, size, size, 200, seeded(9));
    const area = Math.PI * (40 ** 2 - 20 ** 2);
    const spacing = Math.sqrt(area / (points.length / 2));
    let closest = Infinity;
    for (let i = 0; i < points.length; i += 2) {
      for (let j = i + 2; j < points.length; j += 2) {
        closest = Math.min(closest, Math.hypot((points[i] - points[j]) * size, (points[i + 1] - points[j + 1]) * size));
      }
    }
    expect(closest).toBeGreaterThan(spacing / 3);
  });

  it("returns nothing for an empty mask", () => {
    expect(sampleMaskEvenly(new Uint8Array(16), 4, 4, 10)).toHaveLength(0);
  });
});
