/**
 * The About page's journey scene (ADR-0030, About addendum). A perspective
 * camera flies along -z through a corridor of stars, one anchor per stage of
 * the page. At the start, stars assemble into the owner's name; between stages
 * the camera warps forward and the stars streak; at the Building stage four
 * small systems settle into orbit around a planet made of gold stars, the
 * "planet of running work"; at the end the corridor opens onto a distant
 * galaxy, the next destination.
 *
 * Pure module: geometry, budget and shaders only. AboutSky.tsx owns WebGL.
 */

export const JOURNEY_BUDGET = {
  fpsCap: 30,
  dprCap: 1.5,
  /** Hard cap on backing-store pixels, for unusually tall viewports. */
  maxPixels: 4_000_000,
  compactBelow: 768,
  counts: {
    desktop: { tunnel: 2200, name: 3200, planet: 2200, moon: 120, galaxy: 1800 },
    compact: { tunnel: 900, name: 1600, planet: 1000, moon: 70, galaxy: 700 },
  },
  brightness: 0.9,
  /** Seconds for the name to assemble after the scene starts. */
  assembleSeconds: 2.4,
} as const;

export type JourneyCounts = { tunnel: number; name: number; planet: number; moon: number; galaxy: number };

export function journeyCountsFor(width: number): JourneyCounts {
  return width < JOURNEY_BUDGET.compactBelow ? JOURNEY_BUDGET.counts.compact : JOURNEY_BUDGET.counts.desktop;
}

/** Camera z at each stage, in page order. The corridor runs from +10 to -380. */
export const STAGE_ANCHORS = [10, -50, -110, -190, -270, -320, -370] as const;
/** Index of the Building stage, where the planet sits. */
export const BUILDING_STAGE = 3;
export const PLANET_Z = -228;
/** The distant galaxy the journey ends facing. */
export const GALAXY_Z = -470;
export const NAME_Z = -18;
export const MOONS = 4;
export const FOV = (55 * Math.PI) / 180;

/** Floats per point: target xyz, start xyz, kind, random. */
export const POINT_STRIDE = 8;
export const KIND = { tunnel: 0, name: 1, planet: 2, moon: 3, galaxy: 4 } as const;

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Camera z for a reading position. `stageTops` are the stages' document tops
 * and `y` is the reading line (scroll position plus part of the viewport).
 * The camera holds at a stage's anchor for most of the stage and warps to the
 * next anchor over its final stretch, so motion clusters between stages.
 */
export function cameraZFor(y: number, stageTops: readonly number[]): number {
  const anchors = STAGE_ANCHORS;
  if (stageTops.length === 0 || y <= stageTops[0]) return anchors[0];
  const last = Math.min(stageTops.length, anchors.length) - 1;
  for (let i = 0; i < last; i += 1) {
    if (y < stageTops[i + 1]) {
      const span = Math.max(stageTops[i + 1] - stageTops[i], 1);
      const f = (y - stageTops[i]) / span;
      return anchors[i] + (anchors[i + 1] - anchors[i]) * smooth(0.55, 1, f);
    }
  }
  return anchors[last];
}

/** How settled the Building stage's orbits are, 0..1, from the camera's z. */
export function buildProgressFor(cameraZ: number): number {
  const from = STAGE_ANCHORS[BUILDING_STAGE - 1];
  const to = STAGE_ANCHORS[BUILDING_STAGE];
  return smooth(0, 1, (from - cameraZ) / (from - to));
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
 * Builds every point. `nameSamples` are [x, y] pairs in 0..1 across the name's
 * frame (y down), taken from the rendered text; when there are none (fonts
 * not ready, or no 2D canvas) the name points scatter as extra stars.
 */
export function buildJourney(
  counts: JourneyCounts,
  aspect: number,
  nameSamples: Float32Array,
  rand: () => number = Math.random,
): Float32Array {
  const moonTotal = counts.moon * MOONS;
  const total = counts.tunnel + counts.name + counts.planet + moonTotal + counts.galaxy;
  const data = new Float32Array(total * POINT_STRIDE);
  let o = 0;
  const push = (tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, kind: number) => {
    data[o++] = tx;
    data[o++] = ty;
    data[o++] = tz;
    data[o++] = sx;
    data[o++] = sy;
    data[o++] = sz;
    data[o++] = kind;
    data[o++] = rand();
  };

  for (let i = 0; i < counts.tunnel; i += 1) {
    const x = (rand() * 2 - 1) * 70;
    const y = (rand() * 2 - 1) * 45;
    const z = 20 - rand() * 460;
    push(x, y, z, x, y, z, KIND.tunnel);
  }

  const frame = nameFrame(aspect);
  const samples = nameSamples.length / 2;
  for (let i = 0; i < counts.name; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    const r = 30 + rand() * 40;
    const sx = Math.sin(phi) * Math.cos(theta) * r;
    const sy = Math.sin(phi) * Math.sin(theta) * r * 0.6;
    const sz = NAME_Z - 10 + Math.cos(phi) * r * 0.5;
    if (samples > 0) {
      const j = Math.floor(rand() * samples) * 2;
      const tx = (nameSamples[j] - 0.5) * frame.width;
      const ty = frame.y - (nameSamples[j + 1] - 0.5) * frame.height;
      push(tx, ty, NAME_Z + (rand() - 0.5) * 0.6, sx, sy, sz, KIND.name);
    } else {
      push(sx, sy, sz, sx, sy, sz, KIND.name);
    }
  }

  // A Fibonacci sphere: even coverage without clumping at the poles.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < counts.planet; i += 1) {
    const y = 1 - (i / Math.max(counts.planet - 1, 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const a = golden * i;
    const r = 9 * (0.97 + rand() * 0.06);
    push(Math.cos(a) * ring * r, y * r, Math.sin(a) * ring * r, 0, 0, 0, KIND.planet);
  }

  for (let moon = 0; moon < MOONS; moon += 1) {
    for (let i = 0; i < counts.moon; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(rand() * 2 - 1);
      const r = 1.3 * Math.cbrt(rand());
      push(Math.sin(phi) * Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r, Math.cos(phi) * r, moon, 0, 0, KIND.moon);
    }
  }

  // A three-armed spiral in its own plane; the shader tilts and turns it.
  for (let i = 0; i < counts.galaxy; i += 1) {
    const core = rand() < 0.15;
    const t = core ? Math.pow(rand(), 2) * 0.18 : Math.pow(rand(), 0.75);
    const arm = Math.floor(rand() * 3);
    const angle = core ? rand() * Math.PI * 2 : arm * ((2 * Math.PI) / 3) + t * 3.8 + (rand() - 0.5) * 0.5 * (1 - t * 0.4);
    const r = t * 16;
    push(Math.cos(angle) * r, (rand() - 0.5) * 1.2 * (1 - t), Math.sin(angle) * r, t, 0, 0, KIND.galaxy);
  }
  return data;
}

export const JOURNEY_VERTEX = `
precision highp float;
attribute vec3 a_target;
attribute vec3 a_start;
attribute float a_kind;
attribute float a_rand;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform float u_time;
uniform float u_assemble;
uniform float u_build;
uniform vec3 u_planet;
uniform vec3 u_galaxy;
uniform float u_others;
uniform float u_scale;
uniform float u_dpr;
uniform float u_bright;
uniform float u_warp;
uniform float u_camZ;
varying float v_alpha;
varying vec3 v_color;

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }

void main() {
  float twinkle = 0.55 + 0.45 * sin(u_time * (0.7 + a_rand * 2.0) + a_rand * 40.0);
  vec3 p;
  float size;
  float alpha;
  vec3 color = vec3(0.918, 0.949, 1.0);
  if (a_kind < 0.5) {
    p = a_target;
    size = 0.09 + step(0.94, a_rand) * 0.08;
    alpha = 0.55 * twinkle * u_others;
    if (a_rand > 0.85) color = vec3(0.769, 0.839, 1.0);
  } else if (a_kind < 1.5) {
    float e = 1.0 - pow(1.0 - u_assemble, 3.0);
    vec3 drift = vec3(sin(u_time * 0.6 + a_rand * 30.0), cos(u_time * 0.5 + a_rand * 20.0), 0.0) * 0.05;
    p = mix(a_start, a_target, e) + drift;
    size = 0.11;
    alpha = (0.65 + 0.45 * e) * (0.82 + 0.18 * twinkle);
  } else if (a_kind < 2.5) {
    p = u_planet + rotY(u_time * 0.05) * a_target;
    size = 0.16;
    alpha = 0.7 * (0.7 + 0.3 * twinkle) * mix(0.25, 1.0, u_build) * u_others;
    color = vec3(0.949, 0.776, 0.427);
  } else if (a_kind < 3.5) {
    float i = a_start.x;
    float radius = 10.5 + i * 2.2;
    float angle = u_time * (0.22 - i * 0.035) + i * 1.7;
    vec3 orbit = rotX(0.35 - i * 0.18) * vec3(cos(angle) * radius, 0.0, sin(angle) * radius);
    vec3 far = vec3((i - 1.5) * 42.0, (mod(i, 2.0) < 0.5 ? 1.0 : -1.0) * 28.0, 70.0);
    float e = 1.0 - pow(1.0 - u_build, 3.0);
    p = u_planet + mix(far, orbit, e) + a_target;
    size = 0.12;
    // Three live systems in gold; the fourth, still in progress, pale and dim.
    bool live = i < 2.5;
    alpha = (live ? 0.75 : 0.4) * (0.7 + 0.3 * twinkle) * u_others;
    color = live ? vec3(0.949, 0.776, 0.427) : vec3(0.62, 0.66, 0.74);
  } else {
    p = u_galaxy + rotX(0.55) * rotY(u_time * 0.01) * a_target;
    float t = a_start.x;
    size = 0.22;
    alpha = (0.16 + 0.22 * twinkle) * (1.0 - t * 0.55) * u_others;
    color = mix(vec3(1.0, 0.906, 0.769), vec3(0.769, 0.839, 1.0), t);
  }
  vec4 eye = u_view * vec4(p, 1.0);
  float depth = -eye.z;
  float fade = smoothstep(0.6, 5.0, depth) * (1.0 - smoothstep(110.0, 170.0, depth));
  gl_Position = u_proj * eye;
  float px = size * u_scale / max(depth, 0.1) * (1.0 + u_warp * 0.8);
  gl_PointSize = clamp(px, 1.0, 7.0) * u_dpr;
  v_alpha = alpha * fade * u_bright;
  v_color = color;
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
  v_alpha = u_warp * 0.5 * smoothstep(0.6, 6.0, depth) * (1.0 - smoothstep(60.0, 120.0, depth)) * (1.0 - a_tail * 0.85);
}
`;

export const STREAK_FRAGMENT = `
precision mediump float;
varying float v_alpha;
void main() {
  gl_FragColor = vec4(vec3(0.8, 0.86, 1.0) * v_alpha, 1.0);
}
`;
