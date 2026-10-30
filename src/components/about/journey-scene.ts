/**
 * The About page's journey scene (ADR-0030, About addendum). A perspective
 * camera flies along -z through a corridor of stars as the reader scrolls,
 * always moving, slowest in the middle of each stage. At the start, stars
 * assemble into the owner's name. Each later stage has its own landmark
 * ahead of the camera, framed mid-stage and passed on the way to the next:
 * a nebula (origin), a ringed planet (teaching), the gold "planet of running
 * work" with its four moons (building), an asteroid belt round a small star
 * (experience), a star cluster (skills), a comet among tumbling asteroids
 * (now) and, at the end, a spiral galaxy (credentials).
 *
 * Pure module: geometry, budget and shaders only. AboutSky.tsx owns WebGL.
 */

export const JOURNEY_BUDGET = {
  /** Frame cap while the camera travels or the name assembles. */
  fpsCap: 60,
  /** Frame cap once everything has settled. */
  idleFps: 30,
  dprCap: 1.5,
  /** Hard cap on backing-store pixels, for unusually tall viewports. */
  maxPixels: 4_000_000,
  compactBelow: 768,
  counts: {
    desktop: {
      tunnel: 2400, name: 4000, nebula: 1500, ringed: 2000, planet: 2200, moon: 140,
      belt: 1800, cluster: 1400, comet: 900, asteroid: 160, galaxy: 2600,
    },
    compact: {
      tunnel: 1000, name: 1800, nebula: 600, ringed: 800, planet: 900, moon: 70,
      belt: 700, cluster: 600, comet: 400, asteroid: 80, galaxy: 1100,
    },
  },
  brightness: 1,
  /** Everything but the name, on phones, where text spans the screen. */
  compactOthers: 0.38,
  /** Seconds for the name to assemble after the scene starts. */
  assembleSeconds: 2.4,
} as const;

export type JourneyCounts = {
  tunnel: number;
  name: number;
  nebula: number;
  ringed: number;
  planet: number;
  moon: number;
  belt: number;
  cluster: number;
  comet: number;
  asteroid: number;
  galaxy: number;
};

export function journeyCountsFor(width: number): JourneyCounts {
  return width < JOURNEY_BUDGET.compactBelow ? JOURNEY_BUDGET.counts.compact : JOURNEY_BUDGET.counts.desktop;
}

export const MOONS = 4;
export const ASTEROIDS = 3;

/** Every point the scene draws for a set of counts. */
export function pointTotal(c: JourneyCounts): number {
  return (
    c.tunnel + c.name + c.nebula + c.ringed + c.planet + c.moon * MOONS + c.belt + c.cluster + c.comet +
    c.asteroid * ASTEROIDS + c.galaxy
  );
}

/** The page's stages, in order. Each carries `data-stage`. */
export const STAGES = ["about", "origin", "teaching", "building", "experience", "skills", "now", "education"] as const;
export const BUILDING_STAGE = 3;
export const GALAXY_STAGE = 7;

/**
 * Camera z where each stage begins, and a last value for the end of the page.
 * Evenly spaced, so the journey keeps one pace however long a stage is.
 */
export const STAGE_ANCHORS = [10, -60, -130, -200, -270, -340, -410, -480, -530] as const;

/** Fraction of the viewport, from the top, that reads as "where the reader is". */
export const READING_LINE = 0.45;
export const NAME_Z = -18;
export const FOV = (55 * Math.PI) / 180;
/** How far ahead of the camera a landmark sits when the reader is mid-stage. */
export const VIEW_DISTANCE = 40;
/** The galaxy is framed at the very end of the page, a little further off. */
export const GALAXY_DISTANCE = 50;
/** 0..1 of the way through a stage's travel is slowest at the middle. */
export const DWELL = 0.55;
/**
 * On wide screens the camera turns this far left (radians) once it leaves
 * the name, so the way ahead opens to the right of the content column and
 * landmarks come into view there rather than behind the text.
 */
export const JOURNEY_YAW = 0.36;

/**
 * Floats per point: local xyz, centre xyz, colour rgb, kind, random, size,
 * object. Colours carry their brightness; the shader adds motion and light.
 */
export const POINT_STRIDE = 13;
export const KIND = { tunnel: 0, name: 1, sphere: 2, disc: 3, moon: 4, cloud: 5, comet: 6, belt: 7 } as const;
/** Slots in the shader's per-object table (u_obj): tilt, spin and one extra value each. */
export const OBJECT_SLOTS = 16;
export const OBJ = { nebula: 1, ringed: 2, planet: 3, belt: 4, cluster: 5, comet: 6, galaxy: 7, moon: 8, asteroid: 12 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * Share of a stage's travel done at fraction `f` of the stage. The camera is
 * always moving, slowest mid-stage where the stage's landmark is framed and
 * quickest between stages. The arrival starts slowly, so the name holds.
 */
export function travel(f: number, first: boolean): number {
  const t = clamp01(f);
  if (first) return t * t;
  return t + (DWELL * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
}

/**
 * Camera z for a reading position. `stageTops` are the document positions
 * where each stage starts (the first is where the reading line sits at the
 * top of the page) followed by the reading line's position at the end of the
 * page, one value per anchor.
 */
export function cameraZFor(y: number, stageTops: readonly number[]): number {
  const anchors = STAGE_ANCHORS;
  const n = Math.min(stageTops.length, anchors.length);
  if (n < 2 || y <= stageTops[0]) return anchors[0];
  for (let i = 0; i < n - 1; i += 1) {
    if (y < stageTops[i + 1]) {
      const span = Math.max(stageTops[i + 1] - stageTops[i], 1);
      return anchors[i] + (anchors[i + 1] - anchors[i]) * travel((y - stageTops[i]) / span, i === 0);
    }
  }
  return anchors[n - 1];
}

/** Where a stage's landmark sits along the corridor. */
export function landmarkZ(stage: number): number {
  if (stage >= GALAXY_STAGE) return STAGE_ANCHORS[STAGE_ANCHORS.length - 1] - GALAXY_DISTANCE;
  return (STAGE_ANCHORS[stage] + STAGE_ANCHORS[stage + 1]) / 2 - VIEW_DISTANCE;
}

/** The camera's turn to the left: none at the name, full once past it, none on phones. */
export function yawFor(cameraZ: number, compact: boolean): number {
  if (compact) return 0;
  return JOURNEY_YAW * smooth(0, 1, (STAGE_ANCHORS[0] - cameraZ) / 45);
}

/** How settled the Building stage's orbits are, 0..1, from the camera's z. */
export function buildProgressFor(cameraZ: number): number {
  const distance = cameraZ - landmarkZ(BUILDING_STAGE);
  return smooth(0, 1, (120 - distance) / 65);
}

/**
 * Screen spots for each stage's landmark at its framing distance, as
 * fractions of the half-width and half-height from the centre (y up). Wide
 * screens keep every landmark right of the content column; phones centre
 * them high, smaller and dimmer, because the text spans the screen.
 */
const WIDE_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.64, 0.3], [0.66, -0.2], [0.6, 0.04], [0.64, -0.12], [0.66, 0.26], [0.62, 0.16], [0.56, 0.42],
];
const COMPACT_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.25, 0.5], [-0.2, 0.5], [0, 0.48], [0.2, 0.5], [-0.15, 0.52], [0.2, 0.5], [0, 0.45],
];

export type Landmark = { x: number; y: number; z: number; scale: number };

/** Where each stage's landmark sits for this screen shape (index 0, the arrival, is unused). */
export function landmarks(aspect: number, compact: boolean): Landmark[] {
  const tanV = Math.tan(FOV / 2);
  const spots = compact ? COMPACT_SPOTS : WIDE_SPOTS;
  const yaw = compact ? 0 : JOURNEY_YAW;
  return STAGES.map((_, stage) => {
    const d = stage === GALAXY_STAGE ? GALAXY_DISTANCE : VIEW_DISTANCE;
    const [fx, fy] = spots[stage];
    // The x that lands on screen spot fx once the camera has turned by `yaw`.
    const x = d * Math.tan(Math.atan(fx * tanV * aspect) - yaw);
    return { x, y: fy * tanV * d, z: landmarkZ(stage), scale: compact ? 0.55 : 1 };
  });
}

/**
 * The world-space box the name is drawn into, for a camera at the first anchor
 * looking down -z: the visible width and height at the name's depth.
 */
export function nameFrame(aspect: number): { width: number; height: number; y: number } {
  const distance = STAGE_ANCHORS[0] - NAME_Z;
  const visibleHeight = 2 * distance * Math.tan(FOV / 2);
  const visibleWidth = visibleHeight * aspect;
  const compact = aspect < 0.9;
  return {
    width: visibleWidth * (compact ? 0.86 : 0.7),
    height: visibleHeight * (compact ? 0.3 : 0.34),
    y: visibleHeight * (compact ? 0.22 : 0.17),
  };
}

/**
 * Picks up to `target` points spread evenly over a text mask (non-zero =
 * ink), as [x, y] pairs in 0..1 with y down. Points keep a minimum distance
 * from each other (no clumps, no gaps), and the letters' outlines are filled
 * first, so thin strokes and counters keep their shape: the bar of an "e",
 * the hole of an "o".
 */
export function sampleMaskEvenly(
  mask: Uint8Array,
  width: number,
  height: number,
  target: number,
  rand: () => number = Math.random,
): Float32Array {
  const steps = sampleMaskSteps(mask, width, height, target, rand);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

/**
 * The same work as sampleMaskEvenly, paused after each pass so a browser
 * caller can yield between them and no single task blocks the page.
 */
export function* sampleMaskSteps(
  mask: Uint8Array,
  width: number,
  height: number,
  target: number,
  rand: () => number = Math.random,
): Generator<void, Float32Array, void> {
  const ink = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] > 0;
  const edges: number[] = [];
  const fills: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!ink(x, y)) continue;
      const edge = !ink(x - 1, y) || !ink(x + 1, y) || !ink(x, y - 1) || !ink(x, y + 1);
      (edge ? edges : fills).push(x, y);
    }
  }
  const total = (edges.length + fills.length) / 2;
  if (target <= 0 || total === 0) return new Float32Array();
  const candidates = new Float32Array(edges.concat(fills));
  // Outline candidates first, each group in random order.
  const order = new Uint32Array(total);
  for (let i = 0; i < total; i += 1) order[i] = i;
  const shuffle = (from: number, to: number) => {
    for (let i = to - 1; i > from; i -= 1) {
      const j = from + Math.floor(rand() * (i - from + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  };
  shuffle(0, edges.length / 2);
  shuffle(edges.length / 2, total);
  yield;
  // The widest spacing that still places no more than `target` points.
  const guess = Math.sqrt(total / target);
  let lo = guess * 0.4;
  let hi = guess * 1.6;
  let best = spaceOut(candidates, order, hi, width, height, target);
  for (let step = 0; step < 10; step += 1) {
    yield;
    const mid = (lo + hi) / 2;
    const picked = spaceOut(candidates, order, mid, width, height, target);
    if (picked.length / 2 > target) lo = mid;
    else {
      hi = mid;
      best = picked;
    }
  }
  if (best.length / 2 > target) best = best.slice(0, target * 2);
  const out = new Float32Array(best.length);
  for (let i = 0; i < best.length; i += 2) {
    out[i] = (best[i] + 0.5) / width;
    out[i + 1] = (best[i + 1] + 0.5) / height;
  }
  return out;
}

/**
 * Accepts candidates in order unless one already accepted lies within
 * `spacing`; stops once it passes `limit`. A grid with at most one point
 * per cell keeps each check to the 5×5 cells around it.
 */
function spaceOut(
  candidates: Float32Array,
  order: Uint32Array,
  spacing: number,
  width: number,
  height: number,
  limit: number,
): number[] {
  const cell = spacing / Math.SQRT2;
  const columns = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  const taken = new Int32Array(columns * rows).fill(-1);
  const min2 = spacing * spacing;
  const out: number[] = [];
  for (let k = 0; k < order.length; k += 1) {
    const i = order[k];
    const x = candidates[i * 2];
    const y = candidates[i * 2 + 1];
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let free = true;
    for (let dy = -2; dy <= 2 && free; dy += 1) {
      const row = cy + dy;
      if (row < 0 || row >= rows) continue;
      for (let dx = -2; dx <= 2; dx += 1) {
        const column = cx + dx;
        if (column < 0 || column >= columns) continue;
        const other = taken[row * columns + column];
        if (other < 0) continue;
        if ((candidates[other * 2] - x) ** 2 + (candidates[other * 2 + 1] - y) ** 2 < min2) {
          free = false;
          break;
        }
      }
    }
    if (!free) continue;
    taken[cy * columns + cx] = i;
    out.push(x, y);
    if (out.length / 2 > limit) break;
  }
  return out;
}

export type JourneyOptions = { compact?: boolean; rand?: () => number };

/**
 * Builds every point and the per-object table the shader reads. `nameSamples`
 * are [x, y] pairs in 0..1 across the name's frame (y down), from the rendered
 * text; name points beyond the samples (or all of them, when there are none
 * because fonts or a 2D canvas were unavailable) scatter as extra stars.
 */
export function buildJourney(
  counts: JourneyCounts,
  aspect: number,
  nameSamples: Float32Array,
  { compact = aspect < 0.9, rand = Math.random }: JourneyOptions = {},
): { data: Float32Array; objects: Float32Array } {
  const data = new Float32Array(pointTotal(counts) * POINT_STRIDE);
  const objects = new Float32Array(OBJECT_SLOTS * 4);
  const setObject = (slot: number, a: number, b: number, c: number, d: number) => objects.set([a, b, c, d], slot * 4);
  let o = 0;
  const push = (
    lx: number, ly: number, lz: number,
    cx: number, cy: number, cz: number,
    color: readonly number[], intensity: number,
    kind: number, size: number, obj: number,
  ) => {
    data[o++] = lx;
    data[o++] = ly;
    data[o++] = lz;
    data[o++] = cx;
    data[o++] = cy;
    data[o++] = cz;
    data[o++] = color[0] * intensity;
    data[o++] = color[1] * intensity;
    data[o++] = color[2] * intensity;
    data[o++] = kind;
    data[o++] = rand();
    data[o++] = size;
    data[o++] = obj;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const unit = (): [number, number, number] => {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return [Math.cos(a) * r, Math.sin(a) * r, z];
  };
  const golden = Math.PI * (3 - Math.sqrt(5));
  const fibonacci = (i: number, n: number): [number, number, number] => {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const a = golden * i;
    return [Math.cos(a) * ring, y, Math.sin(a) * ring];
  };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length) % items.length];
  const marks = landmarks(aspect, compact);

  const WHITE = [0.918, 0.949, 1] as const;
  const BLUE = [0.769, 0.839, 1] as const;
  const GOLD = [0.949, 0.776, 0.427] as const;
  const PALE = [0.66, 0.7, 0.78] as const;
  const WARM = [1, 0.88, 0.7] as const;

  // The corridor: stars the whole way, kept off the camera's own path.
  for (let i = 0; i < counts.tunnel; i += 1) {
    let x = (rand() * 2 - 1) * 80;
    const y = (rand() * 2 - 1) * 50;
    if (Math.abs(x) < 3 && Math.abs(y) < 2) x += x < 0 ? -3 : 3;
    const z = 25 - rand() * 650;
    const big = rand() > 0.94;
    push(x, y, z, 0, 0, 0, rand() > 0.85 ? BLUE : WHITE, 1, KIND.tunnel, big ? 0.17 : 0.09, 0);
  }

  // The name: each point starts in a loose shell and flies to its own spot on the letters.
  const frame = nameFrame(aspect);
  const samples = nameSamples.length / 2;
  for (let i = 0; i < counts.name; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    const r = 30 + rand() * 40;
    const sx = Math.sin(phi) * Math.cos(theta) * r;
    const sy = Math.sin(phi) * Math.sin(theta) * r * 0.6;
    const sz = NAME_Z - 10 + Math.cos(phi) * r * 0.5;
    if (i < samples) {
      const tx = (nameSamples[i * 2] - 0.5) * frame.width;
      const ty = frame.y - (nameSamples[i * 2 + 1] - 0.5) * frame.height;
      push(tx, ty, NAME_Z, sx, sy, sz, [0.95, 0.96, 1], 1, KIND.name, 0.115, 0);
    } else {
      push(sx, sy, sz, sx, sy, sz, WHITE, 0.8, KIND.name, 0.09, 0);
    }
  }

  // Origin: a nebula, glowing gas in four lobes with young stars inside it.
  {
    const m = marks[1];
    const s = m.scale;
    const lobes = [
      { at: [0, 0, 0], sigma: 4.2, color: [0.86, 0.36, 0.72] },
      { at: [5, 2.5, -2], sigma: 3.4, color: [0.42, 0.5, 1] },
      { at: [-4.5, 3, 1], sigma: 3, color: [0.3, 0.78, 0.92] },
      { at: [2, -3.5, 2], sigma: 2.6, color: [0.95, 0.5, 0.55] },
    ];
    for (let i = 0; i < counts.nebula; i += 1) {
      const lobe = pick(lobes);
      const share = i / Math.max(counts.nebula, 1);
      if (share < 0.05) {
        // The bright young star at the heart.
        push(gauss() * 0.35 * s, gauss() * 0.35 * s, gauss() * 0.35 * s, m.x, m.y, m.z, [1, 0.94, 0.82], 0.95, KIND.cloud, 0.2 + rand() * 0.12, OBJ.nebula);
      } else if (share < 0.3) {
        const k = 0.8 * lobe.sigma * s;
        push(lobe.at[0] * s + gauss() * k, lobe.at[1] * s + gauss() * k, lobe.at[2] * s + gauss() * k * 0.5, m.x, m.y, m.z, rand() > 0.5 ? WHITE : BLUE, 0.5 + rand() * 0.45, KIND.cloud, 0.1 + rand() * 0.07, OBJ.nebula);
      } else {
        const k = lobe.sigma * s;
        push(lobe.at[0] * s + gauss() * k, lobe.at[1] * s + gauss() * k, lobe.at[2] * s + gauss() * k * 0.5, m.x, m.y, m.z, lobe.color, 0.07 + rand() * 0.08, KIND.cloud, (0.9 + rand() * 1.2) * s, OBJ.nebula);
      }
    }
    setObject(OBJ.nebula, 0.2, 0.1, 0.008, 0);
  }

  // Teaching: a ringed planet, banded like a gas giant, its ring hidden behind it.
  {
    const m = marks[2];
    const R = 6.2 * m.scale;
    const body = Math.round(counts.ringed * 0.5);
    for (let i = 0; i < body; i += 1) {
      const [x, y, z] = fibonacci(i, body);
      const band = 0.5 + 0.5 * Math.sin(y * 9 + Math.sin(Math.atan2(z, x) * 3) * 0.3);
      const color = [0.78 + 0.18 * band, 0.58 + 0.29 * band, 0.4 + 0.28 * band];
      const r = R * (0.985 + rand() * 0.03);
      push(x * r, y * r, z * r, m.x, m.y, m.z, color, 0.9 + rand() * 0.1, KIND.sphere, 0.17, OBJ.ringed);
    }
    for (let i = body; i < counts.ringed; i += 1) {
      let r = 0;
      do r = R * (1.45 + 0.95 * Math.sqrt(rand()));
      while (r > R * 1.9 && r < R * 1.98);
      const a = rand() * Math.PI * 2;
      push(Math.cos(a) * r, gauss() * 0.04 * m.scale, Math.sin(a) * r, m.x, m.y, m.z, [0.86, 0.8, 0.7], 0.45 + rand() * 0.4, KIND.disc, 0.11, OBJ.ringed);
    }
    setObject(OBJ.ringed, 0.42, -0.32, 0.05, R);
  }

  // Building: the planet of running work, with four systems in orbit (three live, one in progress).
  {
    const m = marks[BUILDING_STAGE];
    const R = 9 * m.scale;
    for (let i = 0; i < counts.planet; i += 1) {
      const [x, y, z] = fibonacci(i, counts.planet);
      const band = 0.5 + 0.5 * Math.sin(y * 5 + Math.cos(Math.atan2(z, x) * 2) * 0.8);
      const r = R * (0.97 + rand() * 0.06);
      push(x * r, y * r, z * r, m.x, m.y, m.z, GOLD, 0.8 + 0.3 * band, KIND.sphere, 0.18, OBJ.planet);
    }
    setObject(OBJ.planet, 0.18, -0.12, 0.05, 0);
    for (let moon = 0; moon < MOONS; moon += 1) {
      for (let i = 0; i < counts.moon; i += 1) {
        const [x, y, z] = unit();
        const r = 1.4 * m.scale * Math.cbrt(rand());
        const live = moon < 3;
        push(x * r, y * r, z * r, m.x, m.y, m.z, live ? GOLD : PALE, live ? 1 : 0.75, KIND.moon, 0.15, OBJ.moon + moon);
      }
      // Incline, phase, speed and orbit radius.
      setObject(OBJ.moon + moon, 0.35 - moon * 0.18, moon * 1.7, 0.22 - moon * 0.035, (12.5 + moon * 2.6) * m.scale);
    }
  }

  // Experience: an asteroid belt round a small star.
  {
    const m = marks[4];
    const s = m.scale;
    const star = Math.round(counts.belt * 0.07);
    const glow = Math.round(counts.belt * 0.01);
    const rock = [
      [0.74, 0.66, 0.56],
      [0.62, 0.62, 0.64],
      [0.82, 0.72, 0.6],
      [0.55, 0.5, 0.46],
    ];
    for (let i = 0; i < counts.belt; i += 1) {
      if (i < star) {
        push(gauss() * 0.5 * s, gauss() * 0.5 * s, gauss() * 0.5 * s, m.x, m.y, m.z, [1, 0.86, 0.58], 1, KIND.cloud, 0.26, OBJ.belt);
      } else if (i < star + glow) {
        push(gauss() * 0.6 * s, gauss() * 0.6 * s, gauss() * 0.6 * s, m.x, m.y, m.z, [1, 0.7, 0.35], 0.1, KIND.cloud, 2.4 * s, OBJ.belt);
      } else {
        const r = Math.min(16, Math.max(8.5, 12 + gauss() * 1.7)) * s;
        const a = rand() * Math.PI * 2;
        const chunk = rand() > 0.85;
        push(Math.cos(a) * r, gauss() * 0.3 * s, Math.sin(a) * r, m.x, m.y, m.z, pick(rock), (0.45 + rand() * 0.5) * (chunk ? 1.15 : 1), KIND.belt, chunk ? 0.17 + rand() * 0.12 : 0.08 + rand() * 0.05, OBJ.belt);
      }
    }
    setObject(OBJ.belt, 0.38, 0.22, 0.07, 0.9 * s);
  }

  // Skills: a globular star cluster, dense at the core and thinning out.
  {
    const m = marks[5];
    const s = m.scale;
    const glow = Math.round(counts.cluster * 0.015);
    for (let i = 0; i < counts.cluster; i += 1) {
      if (i < glow) {
        push(gauss() * 1.4 * s, gauss() * 1.4 * s, gauss() * 1.4 * s, m.x, m.y, m.z, WARM, 0.1, KIND.cloud, 2.4 * s, OBJ.cluster);
        continue;
      }
      let r = (2 * s) / Math.sqrt(Math.pow(rand() + 1e-6, -2 / 3) - 1 + 1e-6);
      if (r > 13 * s) r = 13 * s * rand();
      const [x, y, z] = unit();
      const tone = rand();
      const color = tone < 0.6 ? [1, 0.92, 0.78] : tone < 0.85 ? [0.78, 0.86, 1] : [1, 0.72, 0.48];
      push(x * r, y * r, z * r, m.x, m.y, m.z, color, 0.7 + rand() * 0.3, KIND.cloud, 0.11 + rand() * 0.08, OBJ.cluster);
    }
    setObject(OBJ.cluster, 0, 0, 0.015, 0);
  }

  // Now: a comet streaming its tail, with three asteroids tumbling past.
  {
    const m = marks[6];
    const s = m.scale;
    const head = Math.round(counts.comet * 0.08);
    const coma = Math.round(counts.comet * 0.03);
    for (let i = 0; i < counts.comet; i += 1) {
      if (i < head) {
        push(gauss() * 0.3 * s, gauss() * 0.3 * s, gauss() * 0.3 * s, m.x, m.y, m.z, [0.88, 0.96, 1], 1, KIND.cloud, 0.22, OBJ.comet);
      } else if (i < head + coma) {
        push(gauss() * 1.1 * s, gauss() * 1.1 * s, gauss() * 1.1 * s, m.x, m.y, m.z, [0.6, 0.85, 1], 0.12, KIND.cloud, 1.8 * s, OBJ.comet);
      } else {
        const ion = rand() < 0.45;
        push(rand(), gauss() * 0.7 * s, gauss() * 0.7 * s, m.x, m.y, m.z, ion ? [0.5, 0.72, 1] : [0.98, 0.9, 0.78], 0.95, KIND.comet, 0.15 + rand() * 0.12, OBJ.comet);
      }
    }
    // Tilt and spin are unused for the comet; the last value is the tail's length.
    setObject(OBJ.comet, 0, 0, 0, 20 * s);
    const rocks = [
      { at: [5, -8, 4], radius: 1.3 },
      { at: [12, -2, -4], radius: 0.9 },
      { at: [9, 8, -9], radius: 1.6 },
    ];
    for (let k = 0; k < ASTEROIDS; k += 1) {
      const rockAt = rocks[k];
      const phase = [rand() * 6, rand() * 6, rand() * 6];
      for (let i = 0; i < counts.asteroid; i += 1) {
        const [x, y, z] = unit();
        const lump = 1 + 0.22 * Math.sin(3 * x + phase[0]) * Math.sin(2 * y + phase[1]) + 0.15 * Math.sin(4 * z + phase[2]);
        const r = rockAt.radius * s * lump * (0.85 + rand() * 0.15);
        push(x * r, y * r, z * r, m.x + rockAt.at[0] * s, m.y + rockAt.at[1] * s, m.z + rockAt.at[2] * s, [0.66, 0.6, 0.54], 0.6 + rand() * 0.4, KIND.sphere, 0.13, OBJ.asteroid + k);
      }
      setObject(OBJ.asteroid + k, 0.7 * k + 0.3, 0.5 * k, 0.35 + 0.15 * k, 0);
    }
  }

  // Credentials: a three-armed spiral galaxy, warm at the core and blue in the arms.
  {
    const m = marks[GALAXY_STAGE];
    const R = 18 * m.scale;
    const halo = Math.round(counts.galaxy * 0.015);
    for (let i = 0; i < counts.galaxy; i += 1) {
      if (i < halo) {
        push(gauss() * R * 0.15, gauss() * R * 0.05, gauss() * R * 0.15, m.x, m.y, m.z, WARM, 0.05, KIND.cloud, 3 * m.scale, OBJ.galaxy);
        continue;
      }
      const core = rand() < 0.18;
      const t = core ? Math.pow(rand(), 2) * 0.16 : Math.pow(rand(), 0.7);
      const arm = Math.floor(rand() * 3);
      const angle = core ? rand() * Math.PI * 2 : arm * ((2 * Math.PI) / 3) + t * 4.2 + (rand() - 0.5) * 0.55 * (1 - t * 0.35);
      const r = t * R;
      const y = gauss() * 0.5 * (1 - t) * m.scale;
      if (core) {
        push(Math.cos(angle) * r, y, Math.sin(angle) * r, m.x, m.y, m.z, WARM, 0.7 + rand() * 0.3, KIND.disc, 0.22, OBJ.galaxy);
      } else if (rand() < 0.04) {
        push(Math.cos(angle) * r, y, Math.sin(angle) * r, m.x, m.y, m.z, [1, 0.55, 0.78], 0.9, KIND.disc, 0.2, OBJ.galaxy);
      } else {
        const color = [1 - 0.3 * t, 0.9 - 0.1 * t, 0.78 + 0.22 * t];
        push(Math.cos(angle) * r, y, Math.sin(angle) * r, m.x, m.y, m.z, color, 0.45 + rand() * 0.4, KIND.disc, 0.16 + rand() * 0.06, OBJ.galaxy);
      }
    }
    setObject(OBJ.galaxy, 0.5, 0.28, 0.012, 0);
  }
  return { data, objects };
}

export const JOURNEY_VERTEX = `
precision highp float;
attribute vec3 a_local;
attribute vec3 a_center;
attribute vec3 a_color;
attribute float a_kind;
attribute float a_rand;
attribute float a_size;
attribute float a_obj;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform vec3 u_cam;
uniform vec4 u_obj[${OBJECT_SLOTS}];
uniform float u_time;
uniform float u_assemble;
uniform float u_build;
uniform float u_others;
uniform float u_scale;
uniform float u_dpr;
uniform float u_bright;
uniform float u_warp;
varying float v_alpha;
varying vec3 v_color;

const vec3 LIGHT = vec3(-0.6, 0.42, 0.68);

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

// Lit from one side, and dim on the half that faces away, so a ball of points reads as solid.
float shade(vec3 normal, vec3 center) {
  float lit = 0.28 + 0.72 * max(0.0, dot(normal, normalize(LIGHT)));
  float facing = dot(normal, normalize(u_cam - center));
  return lit * mix(0.22, 1.0, smoothstep(-0.15, 0.15, facing));
}

// Points on the far side of a body at the centre (radius r) are hidden by it.
float behind(vec3 q, vec3 center, float r) {
  vec3 toCam = normalize(u_cam - center);
  float along = dot(q, toCam);
  return (r > 0.0 && along < 0.0 && length(q - toCam * along) < r) ? 0.1 : 1.0;
}

void main() {
  float twinkle = 0.55 + 0.45 * sin(u_time * (0.7 + a_rand * 2.0) + a_rand * 40.0);
  vec4 o = u_obj[int(a_obj + 0.5)];
  mat3 tilt = rotZ(o.y) * rotX(o.x);
  vec3 p;
  float alpha;
  float maxPx = 7.0;
  float dim = u_others;
  if (a_kind < 0.5) {
    p = a_local;
    alpha = 0.6 * twinkle;
  } else if (a_kind < 1.5) {
    float e = 1.0 - pow(1.0 - u_assemble, 3.0);
    vec3 drift = vec3(sin(u_time * 0.6 + a_rand * 30.0), cos(u_time * 0.5 + a_rand * 20.0), 0.0) * 0.03;
    p = mix(a_center, a_local, e) + drift;
    alpha = (0.55 + 0.45 * e) * (0.88 + 0.12 * twinkle);
    dim = 1.0;
  } else if (a_kind < 2.5) {
    // A solid body spinning on a tilted axis.
    vec3 q = tilt * (rotY(u_time * o.z) * a_local);
    p = a_center + q;
    alpha = shade(normalize(q + 1e-4), a_center) * (0.9 + 0.1 * twinkle);
  } else if (a_kind < 3.5) {
    // A disc turning in its own plane: a ring, or the galaxy.
    vec3 q = tilt * (rotY(u_time * o.z) * a_local);
    p = a_center + q;
    alpha = (0.8 + 0.2 * twinkle) * behind(q, a_center, o.w);
  } else if (a_kind < 4.5) {
    // A moon flies in and settles into orbit as the camera reaches the planet.
    float i = a_obj - 8.0;
    float angle = u_time * o.z + o.y;
    vec3 orbit = rotX(o.x) * vec3(cos(angle) * o.w, 0.0, sin(angle) * o.w);
    vec3 far = vec3((i - 1.5) * 42.0, (mod(i, 2.0) < 0.5 ? 1.0 : -1.0) * 28.0, 70.0);
    float e = 1.0 - pow(1.0 - u_build, 3.0);
    vec3 center = a_center + mix(far, orbit, e);
    vec3 q = rotY(u_time * 0.5) * a_local;
    p = center + q;
    alpha = shade(normalize(q + 1e-4), center) * (0.85 + 0.15 * twinkle) * smoothstep(0.0, 0.35, u_build);
  } else if (a_kind < 5.5) {
    // A cloud: nebula gas, a star cluster, a star's glow. A slow turn and a faint breath.
    float breath = 1.0 + 0.02 * sin(u_time * 0.35 + a_rand * 6.28);
    p = a_center + tilt * (rotY(u_time * o.z) * a_local) * breath;
    alpha = 0.65 + 0.35 * twinkle;
    maxPx = 22.0;
  } else if (a_kind < 6.5) {
    // A comet's tail streams away from the head and fades.
    float s = fract(a_local.x + u_time * 0.05);
    vec3 dir = normalize(vec3(0.4, 0.55, -0.73));
    vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
    vec3 up = cross(side, dir);
    p = a_center + dir * (s * o.w) + (side * a_local.y + up * a_local.z) * (0.15 + s * 1.4);
    alpha = (1.0 - s) * (1.0 - s) * (0.8 + 0.2 * twinkle);
    maxPx = 12.0;
  } else {
    // A belt: every rock at its own speed, so the belt shears slowly.
    vec3 q = tilt * (rotY(u_time * o.z * (0.6 + 0.8 * a_rand)) * a_local);
    p = a_center + q;
    alpha = (0.85 + 0.15 * twinkle) * behind(q, a_center, o.w);
  }
  vec4 eye = u_view * vec4(p, 1.0);
  float depth = -eye.z;
  // Landmarks emerge nearer than the corridor stars, so the next one never
  // crowds the current view from far off.
  float far = a_kind < 1.5 ? 175.0 : 140.0;
  float fade = smoothstep(0.6, 5.0, depth) * (1.0 - smoothstep(far - 55.0, far, depth));
  gl_Position = u_proj * eye;
  float px = a_size * u_scale / max(depth, 0.1) * (1.0 + u_warp * 0.6);
  gl_PointSize = clamp(px, 1.0, maxPx) * u_dpr;
  v_alpha = alpha * fade * u_bright * dim;
  v_color = a_color;
}
`;

export const JOURNEY_FRAGMENT = `
precision mediump float;
varying float v_alpha;
varying vec3 v_color;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float falloff = 1.0 - smoothstep(0.0, 1.0, d);
  gl_FragColor = vec4(v_color * v_alpha * falloff * falloff, 1.0);
}
`;

/** The warp streaks: each corridor star as a short line pointing back along z. */
export const STREAK_VERTEX = `
precision highp float;
attribute vec3 a_pos;
attribute float a_tail;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform float u_warp;
varying float v_alpha;
void main() {
  vec3 p = a_pos + vec3(0.0, 0.0, a_tail * u_warp * 9.0);
  vec4 eye = u_view * vec4(p, 1.0);
  float depth = -eye.z;
  gl_Position = u_proj * eye;
  v_alpha = u_warp * 0.45 * smoothstep(0.6, 6.0, depth) * (1.0 - smoothstep(60.0, 120.0, depth)) * (1.0 - a_tail * 0.85);
}
`;

export const STREAK_FRAGMENT = `
precision mediump float;
varying float v_alpha;
void main() {
  gl_FragColor = vec4(vec3(0.8, 0.86, 1.0) * v_alpha, 1.0);
}
`;
