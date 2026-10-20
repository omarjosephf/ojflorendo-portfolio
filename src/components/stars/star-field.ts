/**
 * The home page's star sky (ADR-0030): a slowly turning galaxy behind the hero
 * and a ribbon of stars that streams from it down the whole page, weaving from
 * side to side and twisting as it goes, over a sparse parallax field. Everything moves in the vertex shader from per-star random
 * values and a handful of uniforms, so the CPU's work per frame is setting
 * those uniforms and issuing one draw call.
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
  counts: {
    desktop: { field: 650, galaxy: 3200, river: 5000 },
    compact: { field: 260, galaxy: 1300, river: 1800 },
  },
  /** Text blocks the stars dim behind, measured from the DOM. */
  maxDimRects: 24,
  /** How much of a star's light survives behind a text block. */
  dimInside: 0.15,
  /** Global brightness. The owner asked for a dim sky that never competes with text. */
  brightness: 0.9,
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
 * the river stores a normal sample in r3 for the ribbon's thickness.
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
 * Pixels a second the whole river streams down the page. Every river star
 * moves at this one pace, so the ribbon flows as one piece.
 */
export const RIVER_SPEED = 12;

/** Share of the river drawn as fine dust around the ribbon rather than in it. */
export const RIVER_DUST = 0.32;

/**
 * The band the river weaves across, as fractions of the viewport width:
 * centre and swing. It crosses the whole width, right to left and back, and
 * turns out at the screen's edges, where the margins leave the sky open; text
 * blocks dim the stars behind them, so the crossing never competes with text.
 */
export function riverBand(width: number): [number, number] {
  return width < STAR_BUDGET.compactBelow ? [0.5, 0.32] : [0.5, 0.42];
}

/**
 * The ribbon's shape in pixels: the height of one sweep from one side to the
 * other (about a screen), and the ribbon's half-width.
 */
export function riverShape(width: number): { sweep: number; halfWidth: number } {
  return {
    sweep: Math.min(960, Math.max(520, width * 0.62)),
    halfWidth: Math.min(100, Math.max(36, width * 0.06)),
  };
}

/** The phase that starts the river at the galaxy's x, heading right first. */
export function riverStartPhase(width: number, galaxyX: number): number {
  const [centre, swing] = riverBand(width);
  return Math.asin(Math.max(-1, Math.min(1, (galaxyX / width - centre) / swing)));
}

/**
 * The river's centre line in document pixels, mirrored exactly by the shader.
 * `s` runs 0..1 from the galaxy to the foot of the page.
 */
export function riverPoint(
  s: number,
  width: number,
  top: number,
  docHeight: number,
  galaxyX: number = width / 2,
): [number, number] {
  const length = Math.max(docHeight - top - 80, 1);
  const along = s * length;
  const phase = riverStartPhase(width, galaxyX) + (Math.PI * along) / riverShape(width).sweep;
  const [centre, swing] = riverBand(width);
  return [width * (centre + swing * Math.sin(phase)), top + along];
}

/** Where the galaxy sits, in document pixels, for a hero of the given size. */
export function galaxyFor(width: number, heroTop: number, heroHeight: number): [number, number, number] {
  if (width < STAR_BUDGET.compactBelow) {
    return [width * 0.55, heroTop + heroHeight * 0.18, width * 0.5];
  }
  return [width * 0.555, heroTop + heroHeight * 0.44, Math.min(width * 0.42, 640)];
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
uniform vec2 u_band;
uniform vec3 u_river;
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
    float t = pow(a_a.y, 0.75);
    float arm = floor(a_a.z * 3.0);
    float ang = arm * 2.0943951 + t * 3.8 + (a_a.w - 0.5) * 0.5 * (1.0 - t * 0.4) + u_time * 0.012;
    float r = t * u_galaxy.z;
    if (a_b.w < 0.16) {
      r = a_a.y * a_a.y * u_galaxy.z * 0.22;
      ang = a_a.z * 6.2831 + u_time * 0.012;
    }
    doc = vec2(u_galaxy.x + cos(ang) * r * 1.35, u_galaxy.y + sin(ang) * r * 0.55);
    alpha = (0.24 + 0.44 * twinkle) * (1.0 - t * 0.45) * (a_b.w < 0.16 ? 1.3 : 1.0);
    size = 1.2 + step(0.95, a_b.z) * 1.4;
  } else {
    // The river: one ribbon of stars streaming down the page at one shared
    // pace, weaving from side to side (u_river: start phase, sweep height,
    // half-width) and twisting as it goes. Stars gather at the ribbon's two
    // edges, so the edges read as two strands winding round each other; a
    // share of the river is fine dust drifting in a soft haze around it. The
    // river shimmers slowly rather than twinkling, so it reads as one smooth flow.
    float len = max(u_doc - u_galaxy.y - 80.0, 1.0);
    float along = fract(a_a.y + u_time * ${RIVER_SPEED.toFixed(1)} / len) * len;
    float ph = u_river.x + PI * along / u_river.y;
    vec2 centre = vec2(u_view.x * (u_band.x + u_band.y * sin(ph)), u_galaxy.y + along);
    vec2 tangent = normalize(vec2(u_view.x * u_band.y * cos(ph) * PI / u_river.y, 1.0));
    vec2 normal = vec2(-tangent.y, tangent.x);
    float ends = smoothstep(0.0, 0.05, along / len) * (1.0 - smoothstep(0.93, 1.0, along / len));
    float shimmer = 0.78 + 0.22 * sin(u_time * (0.2 + a_b.x * 0.4) + a_b.y * 6.2831);
    if (a_b.z < ${RIVER_DUST.toFixed(2)}) {
      doc = centre + normal * u_river.z * a_a.w * 0.75;
      alpha = 0.26 * shimmer * (1.0 - abs(a_a.w) * 0.25) * ends;
      size = 1.15;
    } else {
      float twist = PI * along / (u_river.y * 0.55) - u_time * 0.08;
      float face = cos(twist);
      float c = a_a.z * 2.0 - 1.0;
      float across = sign(c) * pow(abs(c), 0.3);
      doc = centre + normal * u_river.z * (across * face + a_a.w * 0.06);
      float near = 0.8 + 0.2 * across * sin(twist);
      alpha = 0.72 * shimmer * mix(0.45, 1.0, abs(face)) * mix(0.55, 1.0, abs(across)) * near * ends;
      size = 1.6 + step(0.9, a_b.z) * 1.2;
    }
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
