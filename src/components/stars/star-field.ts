/**
 * The star sky behind the home page and the blog front page (ADR-0030,
 * ADR-0027): a two-armed galaxy behind the hero whose stars swirl outward along
 * its arms and pour off each arm's tip into a stream; the two streams braid
 * down the whole page, one crossing right to left while the other crosses left
 * to right, over a sparse parallax field. Everything moves in the vertex
 * shader from per-star random values and a handful of uniforms, so the CPU's
 * work per frame is setting those uniforms and issuing one draw call.
 *
 * This module is pure (no DOM, no WebGL calls) so its budget and geometry can
 * be unit-tested; StarSky.tsx owns the context and the frame loop.
 */

/** The performance budget ADR-0030 records. Change both together. */
export const STAR_BUDGET = {
  /** Frames drawn per second at most. The motion is slow; 30 is plenty. */
  fpsCap: 30,
  /** Backing-store cap. Points are sized in physical pixels via the shader. */
  dprCap: 1.5,
  /** Hard cap on backing-store pixels, for unusually tall viewports. */
  maxPixels: 4_000_000,
  /** Viewport width below which the compact counts apply. */
  compactBelow: 768,
  // The same totals as before the two streams (8,850 and 3,360): stars moved
  // from the galaxy to the streams, which now share them between two.
  counts: {
    desktop: { field: 650, galaxy: 2200, river: 6000 },
    compact: { field: 260, galaxy: 900, river: 2200 },
  },
  /** Text blocks the stars dim behind, measured from the DOM. */
  maxDimRects: 24,
  /** How much of a star's light survives behind a text block. */
  dimInside: 0.15,
  /** Global brightness. The owner asked for a dim sky that never competes with text. */
  brightness: 0.9,
  /**
   * Most stream stars drawn per pixel of each stream. A short page (the blog)
   * draws fewer of the budgeted stars, so its streams are no denser than the
   * home page's.
   */
  streamDensity: 0.4,
} as const;

export type StarCounts = { field: number; galaxy: number; river: number };

export const KIND = { field: 0, galaxy: 1, river: 2 } as const;

/** Floats per star: two vec4 attributes. */
export const STRIDE = 8;

export function countsFor(width: number): StarCounts {
  return width < STAR_BUDGET.compactBelow ? STAR_BUDGET.counts.compact : STAR_BUDGET.counts.desktop;
}

/** Box–Muller normal sample from a uniform source, clamped to ±3. */
function gauss(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-3, Math.min(3, g));
}

/**
 * Per-star attributes, interleaved: [kind, r1, r2, r3 | r4, r5, r6, r7].
 * The meaning of r1..r7 depends on the kind and is decoded in the shader;
 * a stream star stores a normal sample in r3 for the stream's thickness, and
 * r2 picks its stream.
 */
export function buildStars(counts: StarCounts, rand: () => number = Math.random): Float32Array {
  const total = counts.field + counts.galaxy + counts.river;
  const data = new Float32Array(total * STRIDE);
  let o = 0;
  const push = (kind: number, r3: number) => {
    data[o++] = kind;
    data[o++] = rand();
    data[o++] = rand();
    data[o++] = r3;
    for (let i = 0; i < 4; i += 1) data[o++] = rand();
  };
  for (let i = 0; i < counts.field; i += 1) push(KIND.field, rand());
  for (let i = 0; i < counts.galaxy; i += 1) push(KIND.galaxy, rand());
  for (let i = 0; i < counts.river; i += 1) push(KIND.river, gauss(rand));
  return data;
}

/**
 * Pixels a second the stars flow: outward along the galaxy's arms and on down
 * the two streams. Every flowing star moves at this one pace, so the arms and
 * the streams read as one piece.
 */
export const RIVER_SPEED = 12;

/** Share of the streams drawn as fine dust around them rather than in them. */
export const RIVER_DUST = 0.22;

/**
 * The galaxy's shape: two arms, each winding this many radians from the core
 * to its tip, on a disc seen at a slant (its x and y stretch). The arms keep
 * their shape while their stars flow outward along them, and the core turns
 * slowly (`GALAXY_TURN` radians a second).
 */
export const GALAXY_SHAPE = { arms: 2, winding: 3.8, stretchX: 1.35, stretchY: 0.55 } as const;
export const GALAXY_TURN = 0.012;

export type Galaxy = [x: number, y: number, radius: number];

/**
 * Where the galaxy sits, in document pixels, for a hero of the given size: at
 * the hero's foot, so its arm tips sit in open sky below the hero's text and
 * its streams pour down the page from there. Sized so both tips, at the disc's
 * left and right ends, stay on screen.
 */
export function galaxyFor(width: number, heroTop: number, heroHeight: number): Galaxy {
  if (width < STAR_BUDGET.compactBelow) {
    return [width * 0.5, heroTop + heroHeight * 0.96, width * 0.28];
  }
  return [width * 0.5, heroTop + heroHeight * 0.9, Math.min(width * 0.27, 420)];
}

/**
 * A point on arm `arm` (0 or 1) at `t` from the core (0) to the tip (1),
 * mirrored by the shader. Arm 0 ends at the disc's right end, arm 1 at its left.
 */
export function armPoint(arm: 0 | 1, t: number, [gx, gy, radius]: Galaxy): [number, number] {
  const angle = arm * Math.PI + GALAXY_SHAPE.winding * (t - 1);
  const r = t * radius;
  return [gx + Math.cos(angle) * r * GALAXY_SHAPE.stretchX, gy + Math.sin(angle) * r * GALAXY_SHAPE.stretchY];
}

/** The unit direction an arm leaves its tip in, so its stream carries straight on. */
export function armTipDirection(arm: 0 | 1, galaxy: Galaxy): [number, number] {
  const [x0, y0] = armPoint(arm, 1 - 1e-4, galaxy);
  const [x1, y1] = armPoint(arm, 1, galaxy);
  const length = Math.hypot(x1 - x0, y1 - y0) || 1;
  return [(x1 - x0) / length, (y1 - y0) / length];
}

/** An arm's length in pixels, so its stars flow at RIVER_SPEED like the streams. */
export function armLength(galaxy: Galaxy): number {
  let length = 0;
  let previous = armPoint(0, 0, galaxy);
  for (let step = 1; step <= 64; step += 1) {
    const next = armPoint(0, step / 64, galaxy);
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
    previous = next;
  }
  return Math.max(length, 1);
}

/**
 * The lanes the two streams braid along, as fractions of the viewport width
 * (centre and swing), with the height of one sweep from one side to the other
 * (about a screen), the distance over which a stream bends from its arm into
 * its lane, and a stream's half-width. The lanes mirror each other, so one
 * stream crosses right to left while the other crosses left to right.
 */
export function strandLanes(width: number) {
  const compact = width < STAR_BUDGET.compactBelow;
  const sweep = Math.min(960, Math.max(520, width * 0.62));
  return {
    centre: 0.5,
    swing: compact ? 0.34 : 0.42,
    sweep,
    bend: sweep * 0.45,
    halfWidth: Math.min(90, Math.max(30, width * 0.05)),
  };
}

/**
 * The lanes' starting phase: stream 0 begins level with its arm's tip and
 * heads back across the page, so the two streams cross below the galaxy.
 */
export function strandPhase(width: number, galaxy: Galaxy): number {
  const { centre, swing } = strandLanes(width);
  const [tipX] = armPoint(0, 1, galaxy);
  return Math.PI - Math.asin(Math.max(-1, Math.min(1, (tipX / width - centre) / swing)));
}

/**
 * A stream's centre line in document pixels, mirrored exactly by the shader.
 * `along` runs from the arm's tip (0) down the page. The stream leaves the tip
 * in the arm's own direction and bends into its lane.
 */
export function strandPoint(arm: 0 | 1, along: number, width: number, galaxy: Galaxy): [number, number] {
  const { centre, swing, sweep, bend } = strandLanes(width);
  const [tipX, tipY] = armPoint(arm, 1, galaxy);
  const [dx, dy] = armTipDirection(arm, galaxy);
  const side = arm === 0 ? 1 : -1;
  const laneX = width * (centre + side * swing * Math.sin(strandPhase(width, galaxy) + (Math.PI * along) / sweep));
  const u = Math.max(0, Math.min(1, along / bend));
  const blend = u * u * (3 - 2 * u);
  const [nearX, nearY] = [tipX + dx * along, tipY + dy * along];
  return [nearX + (laneX - nearX) * blend, nearY + (tipY + along - nearY) * blend];
}

/**
 * The share of the budgeted stream stars to draw on a page of this height, so
 * every stream carries at most STAR_BUDGET.streamDensity stars a pixel.
 */
export function streamShare(width: number, docHeight: number, galaxy: Galaxy): number {
  const perStream = countsFor(width).river / GALAXY_SHAPE.arms;
  const length = Math.max(docHeight - armPoint(0, 1, galaxy)[1] - 80, 1);
  return Math.min(1, (STAR_BUDGET.streamDensity * length) / perStream);
}

export const VERTEX_SHADER = `
precision highp float;
attribute vec4 a_a;
attribute vec4 a_b;
uniform vec2 u_view;
uniform float u_scroll;
uniform float u_time;
uniform float u_doc;
uniform vec3 u_galaxy;
uniform vec4 u_tip0;
uniform vec4 u_tip1;
uniform vec4 u_lane;
uniform vec2 u_strand;
uniform float u_armFlow;
uniform float u_share;
uniform float u_dpr;
uniform float u_bright;
uniform vec4 u_rects[${STAR_BUDGET.maxDimRects}];
uniform int u_rectCount;
varying float v_alpha;
varying vec3 v_tint;
const float PI = 3.14159265;

float dimAt(vec2 p) {
  for (int i = 0; i < ${STAR_BUDGET.maxDimRects}; i++) {
    if (i >= u_rectCount) break;
    vec4 r = u_rects[i];
    if (p.x > r.x && p.x < r.x + r.z && p.y > r.y && p.y < r.y + r.w) return ${STAR_BUDGET.dimInside.toFixed(2)};
  }
  return 1.0;
}

// A stream's centre line (u_tip: arm tip and leaving direction; u_lane: lane
// centre, swing, start phase and sweep; u_strand.x: the bend distance).
vec2 strandAt(float along, vec4 tip, float side) {
  float blend = smoothstep(0.0, u_strand.x, along);
  vec2 lane = vec2(u_view.x * (u_lane.x + side * u_lane.y * sin(u_lane.z + PI * along / u_lane.w)), tip.y + along);
  return mix(tip.xy + tip.zw * along, lane, blend);
}

void main() {
  float kind = a_a.x;
  float twinkle = 0.5 + 0.5 * sin(u_time * (0.6 + a_b.x * 2.0) + a_b.y * 6.2831);
  vec2 doc;
  float alpha;
  float size;
  if (kind < 0.5) {
    float depth = 0.15 + a_a.w * 0.45;
    float span = u_view.y * 1.3;
    float y = mod(a_a.z * span - u_scroll * depth, span) - u_view.y * 0.15;
    doc = vec2(a_a.y * u_view.x, y + u_scroll);
    alpha = (0.24 + 0.4 * twinkle) * (0.6 + depth);
    size = 1.2 + step(0.93, a_b.z) * 1.3;
  } else if (kind < 1.5) {
    if (a_b.w < 0.16) {
      // The core turns slowly.
      float r = a_a.y * a_a.y * u_galaxy.z * 0.22;
      float ang = a_a.z * 6.2831 + u_time * ${GALAXY_TURN.toFixed(3)};
      doc = vec2(u_galaxy.x + cos(ang) * r * ${GALAXY_SHAPE.stretchX.toFixed(2)}, u_galaxy.y + sin(ang) * r * ${GALAXY_SHAPE.stretchY.toFixed(2)});
      alpha = (0.24 + 0.44 * twinkle) * 1.3;
    } else {
      // Two arms keep their shape while their stars swirl outward along them
      // at the streams' pace, fading as they reach the tip, where each arm's
      // stream carries on down the page.
      float arm = a_a.z < 0.5 ? 0.0 : PI;
      float t = fract(a_a.y + u_time * u_armFlow);
      float ang = arm + ${GALAXY_SHAPE.winding.toFixed(2)} * (t - 1.0) + (a_a.w - 0.5) * 0.5 * (1.0 - t * 0.5);
      float r = t * u_galaxy.z;
      doc = vec2(u_galaxy.x + cos(ang) * r * ${GALAXY_SHAPE.stretchX.toFixed(2)}, u_galaxy.y + sin(ang) * r * ${GALAXY_SHAPE.stretchY.toFixed(2)});
      alpha = (0.24 + 0.44 * twinkle) * (1.0 - t * 0.35) * smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
    }
    size = 1.2 + step(0.95, a_b.z) * 1.4;
  } else {
    // The streams: each pours off one arm's tip, carries on in the arm's own
    // direction, then bends into its lane and braids down the page with the
    // other, one crossing right to left while the other crosses left to right.
    // Every star moves at one shared pace, so each stream flows as one piece;
    // a share of it is fine dust in a soft haze around it, and it shimmers
    // slowly rather than twinkling.
    float side = a_a.z < 0.5 ? 1.0 : -1.0;
    vec4 tip = a_a.z < 0.5 ? u_tip0 : u_tip1;
    float len = max(u_doc - tip.y - 80.0, 1.0);
    float along = fract(a_a.y + u_time * ${RIVER_SPEED.toFixed(1)} / len) * len;
    vec2 centre = strandAt(along, tip, side);
    vec2 tangent = normalize(strandAt(along + 2.0, tip, side) - centre);
    vec2 normal = vec2(-tangent.y, tangent.x);
    float ends = smoothstep(0.0, 60.0, along) * (1.0 - smoothstep(0.93, 1.0, along / len));
    float shimmer = 0.78 + 0.22 * sin(u_time * (0.2 + a_b.x * 0.4) + a_b.y * 6.2831);
    if (a_b.z < ${RIVER_DUST.toFixed(2)}) {
      doc = centre + normal * u_strand.y * a_a.w * 0.6;
      alpha = 0.24 * shimmer * (1.0 - abs(a_a.w) * 0.25) * ends;
      size = 1.15;
    } else {
      doc = centre + normal * u_strand.y * a_a.w * 0.22;
      alpha = 0.9 * shimmer * (1.0 - abs(a_a.w) * 0.2) * ends;
      size = 1.7 + step(0.9, a_b.z) * 1.2;
    }
    // On a short page, draw only u_share of the stream stars (size 0 draws nothing).
    if (fract(a_b.y * 97.0 + a_a.y * 31.0) > u_share) size = 0.0;
  }
  alpha *= dimAt(doc) * u_bright;
  vec2 screen = vec2(doc.x, doc.y - u_scroll);
  gl_Position = vec4(screen.x / u_view.x * 2.0 - 1.0, 1.0 - screen.y / u_view.y * 2.0, 0.0, 1.0);
  gl_PointSize = size * 2.6 * u_dpr;
  v_alpha = alpha;
  float tint = a_b.w;
  v_tint = tint < 0.7 ? vec3(0.918, 0.949, 1.0) : (tint < 0.85 ? vec3(1.0, 0.906, 0.769) : vec3(0.769, 0.839, 1.0));
}
`;

export const FRAGMENT_SHADER = `
precision mediump float;
varying float v_alpha;
varying vec3 v_tint;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float falloff = 1.0 - smoothstep(0.0, 1.0, d);
  gl_FragColor = vec4(v_tint * v_alpha * falloff * falloff, 1.0);
}
`;

/** Text blocks the sky dims behind. Panels already carry their own dark fill. */
export const DIM_SELECTOR = [
  ".jf-hero-copy",
  ".jf-section-head",
  ".jf-steps",
  ".jf-offer-rows",
  ".jf-notes",
  ".jf-ev-copy",
  ".jf-why",
  ".jf-contact-lead",
  ".jf-footer",
].join(",");
