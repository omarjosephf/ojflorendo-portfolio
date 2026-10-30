import type { BlogPostType } from "./types";

/**
 * The blog's star pictures (ADR-0027). Each post gets its own small star scene,
 * drawn on the server as inline SVG from its slug and type: the slug seeds a
 * random generator, so a post's picture is unique and identical on every build.
 * One motif family per post type, echoing the About journey's landmarks but
 * drawn fresh: a gold planet with orbiting systems (case study), a comet among
 * asteroids (build notes), a ringed planet in a soft nebula (explainer). A
 * version 1 post, which has no type, gets the star field alone.
 *
 * This module is pure (no DOM, no React) so its determinism and its size
 * limits can be unit-tested; BlogCover.tsx renders the result.
 */

export type CoverVariant = "featured" | "card";

/** Drawn shapes per picture at most, to keep the page's HTML light. */
export const COVER_SHAPE_LIMITS: Record<CoverVariant, number> = { featured: 250, card: 120 };

/** The picture's coordinate box. The frame crops it to fit, centred. */
export const COVER_VIEWBOX: Record<CoverVariant, { width: number; height: number }> = {
  featured: { width: 640, height: 440 },
  card: { width: 480, height: 330 },
};

/** Each type's tint, shared with its label. */
export const COVER_TINTS: Record<BlogPostType, string> = {
  "case-study": "#f2c66d",
  "build-notes": "#9ecbff",
  explainer: "#c8b8ff",
};

const STARLIGHT = ["#eef1f7", "#d3d8e3", "#a9afbf"] as const;

export type CoverShape =
  | { kind: "circle"; cx: number; cy: number; r: number; fill: string; opacity?: number; stroke?: string; strokeWidth?: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rotate: number; fill: string; opacity?: number; stroke?: string; strokeWidth?: number }
  | { kind: "path"; d: string; fill: string; opacity?: number; stroke?: string; strokeWidth?: number };

export interface CoverGradientStop {
  offset: number;
  color: string;
  opacity: number;
}

/** Gradient ids are local to one picture; the renderer prefixes them. */
export type CoverGradient =
  | { kind: "radial"; id: string; cx: number; cy: number; r: number; stops: CoverGradientStop[] }
  | {
      kind: "linear";
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      userSpace: boolean;
      stops: CoverGradientStop[];
    };

/**
 * What each group does in the one short move: `still` never moves; `glow`
 * groups brighten in turn (`delay` 0–5); `tilt` and `orbit` turn a few degrees
 * about their own centre; `drift` moves a little and settles.
 */
export type CoverRole = "still" | "glow" | "tilt" | "orbit" | "drift";

export interface CoverGroup {
  role: CoverRole;
  delay?: number;
  shapes: CoverShape[];
}

export interface CoverScene {
  width: number;
  height: number;
  gradients: CoverGradient[];
  groups: CoverGroup[];
}

export const GLOW_STEPS = 6;

/** 32-bit FNV-1a hash of the slug: the generator's seed. */
function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a small, fast, seeded generator with good spread. */
export function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** One decimal place keeps the markup short and the output stable. */
const r1 = (value: number) => Math.round(value * 10) / 10;

function between(rand: () => number, low: number, high: number) {
  return low + (high - low) * rand();
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function stops(...entries: [number, string, number][]): CoverGradientStop[] {
  return entries.map(([offset, color, opacity]) => ({ offset, color, opacity }));
}

/** A point on an ellipse centred at (cx, cy) with radii rx, ry, turned by `rotate` degrees. */
function onEllipse(cx: number, cy: number, rx: number, ry: number, rotate: number, angle: number): [number, number] {
  const turn = (rotate * Math.PI) / 180;
  const x = rx * Math.cos(angle);
  const y = ry * Math.sin(angle);
  return [r1(cx + x * Math.cos(turn) - y * Math.sin(turn)), r1(cy + x * Math.sin(turn) + y * Math.cos(turn))];
}

/** Half of a turned ellipse: the far half passes over the top, the near half under the bottom. */
function ellipseHalf(cx: number, cy: number, rx: number, ry: number, rotate: number, half: "far" | "near") {
  const [lx, ly] = onEllipse(cx, cy, rx, ry, rotate, Math.PI);
  const [rx2, ry2] = onEllipse(cx, cy, rx, ry, rotate, 0);
  const [fromX, fromY, toX, toY] = half === "far" ? [lx, ly, rx2, ry2] : [rx2, ry2, lx, ly];
  return `M${fromX} ${fromY}A${r1(rx)} ${r1(ry)} ${r1(rotate)} 0 1 ${toX} ${toY}`;
}

interface Box {
  width: number;
  height: number;
}

/** The sparse star field every picture shares, plus the stars that brighten in turn. */
function starField(rand: () => number, box: Box, variant: CoverVariant, tint: string): CoverGroup[] {
  const count = variant === "featured" ? 118 : 54;
  const stars: CoverShape[] = [];
  const bright: [number, number][] = [];
  for (let index = 0; index < count; index += 1) {
    const cx = r1(between(rand, 4, box.width - 4));
    const cy = r1(between(rand, 4, box.height - 4));
    const large = rand() < 0.12;
    stars.push({
      kind: "circle",
      cx,
      cy,
      r: r1(large ? between(rand, 1.3, 1.9) : between(rand, 0.5, 1.1)),
      fill: rand() < 0.14 ? tint : pick(rand, STARLIGHT),
      opacity: r1(large ? between(rand, 0.75, 1) : between(rand, 0.3, 0.75)),
    });
    if (large) bright.push([cx, cy]);
  }
  // Stars that brighten in turn: a soft halo over chosen stars, invisible at rest.
  const perStep = variant === "featured" ? 3 : 2;
  const glowGroups: CoverGroup[] = [];
  for (let step = 0; step < GLOW_STEPS; step += 1) {
    const shapes: CoverShape[] = [];
    for (let index = 0; index < perStep; index += 1) {
      const [cx, cy] = bright.length > 0 ? bright.splice(Math.floor(rand() * bright.length), 1)[0] : [
        r1(between(rand, 10, box.width - 10)),
        r1(between(rand, 10, box.height - 10)),
      ];
      shapes.push({ kind: "circle", cx, cy, r: r1(between(rand, 3.2, 4.6)), fill: "url(#glow)" });
    }
    glowGroups.push({ role: "glow", delay: step, shapes });
  }
  return [{ role: "still", shapes: stars }, ...glowGroups];
}

function centre(rand: () => number, box: Box, x: number, y: number): [number, number] {
  return [r1(box.width * (x + between(rand, -0.05, 0.05))), r1(box.height * (y + between(rand, -0.05, 0.05)))];
}

/** Explainer: a ringed planet in a soft nebula. */
function ringedPlanet(rand: () => number, box: Box, tint: string): { gradients: CoverGradient[]; groups: CoverGroup[] } {
  const [cx, cy] = centre(rand, box, 0.56, 0.5);
  const radius = r1(box.height * between(rand, 0.16, 0.2));
  const tilt = r1(between(rand, -24, -12));
  const nebula: CoverShape[] = [];
  for (let index = 0; index < 6; index += 1) {
    nebula.push({
      kind: "ellipse",
      cx: r1(cx + between(rand, -0.32, 0.22) * box.width),
      cy: r1(cy + between(rand, -0.25, 0.25) * box.height),
      rx: r1(box.width * between(rand, 0.16, 0.3)),
      ry: r1(box.height * between(rand, 0.12, 0.24)),
      rotate: r1(between(rand, -40, 40)),
      fill: "url(#nebula)",
      opacity: r1(between(rand, 0.45, 0.9)),
    });
  }
  const rings = [1.75, 2.15].map((scale) => ({ rx: radius * scale, ry: radius * scale * 0.26 }));
  const ringPaths = (half: "far" | "near"): CoverShape[] =>
    rings.map((ring, index) => ({
      kind: "path",
      d: ellipseHalf(cx, cy, ring.rx, ring.ry, tilt, half),
      fill: "none",
      stroke: tint,
      strokeWidth: index === 0 ? 3 : 1.4,
      opacity: half === "far" ? 0.38 : 0.78,
    }));
  const [moonX, moonY] = onEllipse(cx, cy, radius * 2.7, radius * 1.1, tilt, between(rand, 3.4, 4.4));
  return {
    gradients: [
      { kind: "radial", id: "nebula", cx: 0.5, cy: 0.5, r: 0.5, stops: stops([0, tint, 0.2], [0.6, "#5a4b8f", 0.08], [1, "#000000", 0]) },
      { kind: "radial", id: "planet", cx: 0.36, cy: 0.32, r: 0.78, stops: stops([0, "#f3efff", 1], [0.42, tint, 1], [1, "#2c2350", 1]) },
      { kind: "linear", id: "shade", x1: 0.2, y1: 0.1, x2: 0.95, y2: 0.85, userSpace: false, stops: stops([0, "#000000", 0], [0.55, "#000000", 0.15], [1, "#000000", 0.78]) },
    ],
    groups: [
      { role: "still", shapes: nebula },
      {
        role: "tilt",
        shapes: [
          ...ringPaths("far"),
          { kind: "circle", cx, cy, r: radius, fill: "url(#planet)" },
          { kind: "circle", cx, cy, r: radius, fill: "url(#shade)" },
          ...ringPaths("near"),
        ],
      },
      { role: "still", shapes: [{ kind: "circle", cx: moonX, cy: moonY, r: r1(radius * 0.13), fill: "#d3d8e3", opacity: 0.85 }] },
    ],
  };
}

/** Case study: a gold planet with systems settled in orbit round it. */
function goldPlanet(rand: () => number, box: Box, tint: string): { gradients: CoverGradient[]; groups: CoverGroup[] } {
  const [cx, cy] = centre(rand, box, 0.52, 0.52);
  const radius = r1(box.height * between(rand, 0.11, 0.14));
  const tilt = r1(between(rand, -18, -6));
  const orbitShapes: CoverShape[] = [];
  const orbitCount = 4;
  for (let index = 0; index < orbitCount; index += 1) {
    const rx = radius * (2 + index * 0.75);
    const ry = rx * 0.36;
    orbitShapes.push({ kind: "ellipse", cx, cy, rx: r1(rx), ry: r1(ry), rotate: tilt, fill: "none", stroke: tint, strokeWidth: 1, opacity: r1(0.42 - index * 0.06) });
    const [sx, sy] = onEllipse(cx, cy, rx, ry, tilt, between(rand, 0, Math.PI * 2));
    const size = r1(between(rand, 2.6, 4.2));
    orbitShapes.push(
      { kind: "circle", cx: sx, cy: sy, r: r1(size * 2.6), fill: "url(#halo)" },
      { kind: "circle", cx: sx, cy: sy, r: r1(size * 1.9), fill: "none", stroke: tint, strokeWidth: 0.8, opacity: 0.55 },
      { kind: "circle", cx: sx, cy: sy, r: size, fill: index === orbitCount - 1 ? "#d3d8e3" : "#fff1c9" },
    );
  }
  return {
    gradients: [
      { kind: "radial", id: "halo", cx: 0.5, cy: 0.5, r: 0.5, stops: stops([0, tint, 0.45], [1, tint, 0]) },
      { kind: "radial", id: "planet", cx: 0.36, cy: 0.32, r: 0.78, stops: stops([0, "#fff4d6", 1], [0.45, tint, 1], [1, "#5a3f12", 1]) },
      { kind: "linear", id: "shade", x1: 0.2, y1: 0.1, x2: 0.95, y2: 0.85, userSpace: false, stops: stops([0, "#000000", 0], [0.55, "#000000", 0.15], [1, "#000000", 0.75]) },
    ],
    groups: [
      { role: "orbit", shapes: orbitShapes },
      {
        role: "still",
        shapes: [
          { kind: "circle", cx, cy, r: r1(radius * 2.1), fill: "url(#halo)", opacity: 0.55 },
          { kind: "circle", cx, cy, r: radius, fill: "url(#planet)" },
          { kind: "circle", cx, cy, r: radius, fill: "url(#shade)" },
        ],
      },
    ],
  };
}

/** Build notes: a comet among tumbling asteroids. */
function cometField(rand: () => number, box: Box, tint: string): { gradients: CoverGradient[]; groups: CoverGroup[] } {
  const [hx, hy] = centre(rand, box, 0.62, 0.44);
  const heading = between(rand, 0.55, 0.85); // radians below the horizontal, travelling down and right
  const back: [number, number] = [-Math.cos(heading), -Math.sin(heading)];
  const across: [number, number] = [-back[1], back[0]];
  const length = box.width * between(rand, 0.34, 0.42);
  const [tx, ty] = [r1(hx + back[0] * length), r1(hy + back[1] * length)];
  const tail = (spread: number, reach: number) => {
    const w = box.height * spread;
    const [ex, ey] = [r1(hx + back[0] * length * reach), r1(hy + back[1] * length * reach)];
    const [ax, ay] = [r1(hx + across[0] * w), r1(hy + across[1] * w)];
    const [bx, by] = [r1(hx - across[0] * w), r1(hy - across[1] * w)];
    const [mx, my] = [r1(hx + back[0] * length * reach * 0.55), r1(hy + back[1] * length * reach * 0.55)];
    return `M${ax} ${ay}Q${r1(mx + across[0] * w * 1.4)} ${r1(my + across[1] * w * 1.4)} ${ex} ${ey}Q${r1(mx - across[0] * w * 0.6)} ${r1(my - across[1] * w * 0.6)} ${bx} ${by}Z`;
  };
  const asteroids: CoverShape[] = [];
  for (let index = 0; index < 7; index += 1) {
    const ax = between(rand, 0.08, 0.92) * box.width;
    const ay = between(rand, 0.12, 0.9) * box.height;
    if (Math.hypot(ax - hx, ay - hy) < box.height * 0.14) continue;
    const size = box.height * between(rand, 0.025, 0.06);
    const sides = 7 + Math.floor(rand() * 3);
    const points: string[] = [];
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      const reach = size * between(rand, 0.72, 1.15);
      points.push(`${r1(ax + Math.cos(angle) * reach)} ${r1(ay + Math.sin(angle) * reach)}`);
    }
    asteroids.push(
      { kind: "path", d: `M${points.join("L")}Z`, fill: "#1c2130", stroke: "#3a4155", strokeWidth: 1.2 },
      { kind: "circle", cx: r1(ax - size * 0.25), cy: r1(ay - size * 0.3), r: r1(size * 0.22), fill: "#2a3042" },
    );
  }
  return {
    gradients: [
      { kind: "linear", id: "tail", x1: hx, y1: hy, x2: tx, y2: ty, userSpace: true, stops: stops([0, tint, 0.85], [0.35, tint, 0.3], [1, tint, 0]) },
      { kind: "radial", id: "coma", cx: 0.5, cy: 0.5, r: 0.5, stops: stops([0, "#ffffff", 0.95], [0.3, tint, 0.6], [1, tint, 0]) },
    ],
    groups: [
      { role: "still", shapes: asteroids },
      {
        role: "drift",
        shapes: [
          { kind: "path", d: tail(0.05, 1), fill: "url(#tail)", opacity: 0.55 },
          { kind: "path", d: tail(0.022, 0.8), fill: "url(#tail)" },
          { kind: "circle", cx: hx, cy: hy, r: r1(box.height * 0.075), fill: "url(#coma)" },
          { kind: "circle", cx: hx, cy: hy, r: r1(box.height * 0.016), fill: "#ffffff" },
        ],
      },
    ],
  };
}

/** A soft radial glow for the stars that brighten in turn. */
function glowGradient(tint: string): CoverGradient {
  return { kind: "radial", id: "glow", cx: 0.5, cy: 0.5, r: 0.5, stops: stops([0, "#ffffff", 1], [0.25, tint, 0.65], [1, tint, 0]) };
}

/** Builds one post's picture. Same slug, type and variant: same picture. */
export function buildCoverScene(slug: string, type: BlogPostType | null, variant: CoverVariant): CoverScene {
  const rand = seededRandom(`${slug}:${variant}`);
  const box = COVER_VIEWBOX[variant];
  const tint = type ? COVER_TINTS[type] : STARLIGHT[0];
  const sky = starField(rand, box, variant, tint);
  const motif =
    type === "case-study"
      ? goldPlanet(rand, box, tint)
      : type === "build-notes"
        ? cometField(rand, box, tint)
        : type === "explainer"
          ? ringedPlanet(rand, box, tint)
          : { gradients: [], groups: [] };
  return {
    width: box.width,
    height: box.height,
    gradients: [glowGradient(tint), ...motif.gradients],
    // The star field sits behind the motif; the halos that brighten sit on top.
    groups: [sky[0], ...motif.groups, ...sky.slice(1)],
  };
}

export function countCoverShapes(scene: CoverScene): number {
  return scene.groups.reduce((total, group) => total + group.shapes.length, 0);
}
