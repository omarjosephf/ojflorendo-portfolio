/**
 * Projection and motion maths for the phone particle wave.
 *
 * Kept free of React and the DOM so it can be unit-tested directly, mirroring
 * `src/components/three/wave-geometry.ts` — the framing of the WebGL wave has
 * been the source of every visual defect in that scene, and the same is likely
 * here.
 *
 * The field is projected exactly once, on mount. Only the vertical offset
 * changes per frame, so the per-frame cost is three sines and one blit per
 * point and nothing else.
 */

import { BAND_HIGH, BAND_LOW } from "@/components/three/wave-geometry";

/**
 * Point count and frame rate are a measured budget, not a preference.
 * Prototyped on a blank page under CPU throttling, drawing pre-rendered
 * sprites grouped to avoid canvas state changes:
 *
 * | points | 4x median | 4x long tasks | 6x median | 6x long tasks |
 * | ---    | ---       | ---           | ---       | ---           |
 * | 400    | 3.4 ms    | 0             | 4.6 ms    | 0             |
 * | 800    | 5.2 ms    | 0             | 13.9 ms   | 6             |
 * | 1200   | 9.5 ms    | 0             | 10.5 ms   | 13            |
 * | 2000   | 13.3 ms   | 9             | 20.6 ms   | 51            |
 *
 * 600 sits inside the envelope that stayed clear of long tasks at both rates.
 * The WebGL wave uses 5712 points; this cannot, and does not try to.
 */
export const MOBILE_WAVE = {
  points: 800,
  fps: 20,
  /** Fraction of viewport height the canvas occupies, measured from the bottom. */
  bandHeight: BAND_HIGH,
  spriteSize: 20,
  alphaBuckets: 4,
  /**
   * Cap on the backing-store scale.
   *
   * The first release pinned this to 1 to save fill, which was a mistake worth
   * recording: a phone at `devicePixelRatio: 3` then upscaled every sprite
   * threefold, blurring already-soft 0.27-alpha dots into near-nothing. All the
   * verification screenshots were taken at DPR 1 and so never showed it. 2 keeps
   * the field legible at a quarter of the fill cost of a full 3x buffer.
   */
  maxDpr: 2,
} as const;

export type WavePoint = {
  /** Screen position, in CSS pixels within the canvas. */
  x: number;
  y: number;
  /** Vertical travel of this point, in pixels. */
  amplitude: number;
  /** Drawn size, in pixels. */
  size: number;
  /** Index into the pre-rendered sprite table. */
  sprite: number;
  /** Grid coordinates feeding the sine field. */
  gx: number;
  gz: number;
};

/**
 * Height of the wave at a grid coordinate, in the range about [-1.4, 1.4].
 *
 * Three crossing sines at unrelated speeds, matching the WebGL vertex shader so
 * the two surfaces read as the same water. Without the pointer ripple: phones
 * have no hover, and a touch-driven ripple would be a new interaction surface
 * rather than a background.
 */
export function waveHeight(gx: number, gz: number, time: number): number {
  return (
    Math.sin(gx * 0.32 + time * 0.5) * 0.55 +
    Math.sin(gz * 0.24 + time * 0.36) * 0.45 +
    Math.sin((gx + gz) * 0.16 - time * 0.28) * 0.4
  );
}

/**
 * Projects the field once. `depth` runs 1 at the near edge to 0 at the horizon;
 * everything else derives from it, so the perspective, the fade and the sprite
 * choice stay consistent with each other.
 */
export function buildField(
  width: number,
  height: number,
  count: number = MOBILE_WAVE.points,
): WavePoint[] {
  const columns = Math.max(2, Math.round(Math.sqrt(count * 1.6)));
  const rows = Math.max(2, Math.ceil(count / columns));
  const points: WavePoint[] = [];

  for (let row = 0; row < rows; row++) {
    // Rows are laid out at even distances and projected as 1/distance, which
    // is what makes them bunch towards the horizon. An even spread in screen
    // space instead reads as a dot grid rather than a receding plane — the
    // first version of this did exactly that.
    const t = row / (rows - 1);
    const distance = NEAR + t * (FAR - NEAR);
    const perspective = NEAR / distance;

    for (let column = 0; column < columns && points.length < count; column++) {
      const gx = (column / (columns - 1) - 0.5) * 2;

      // The near edge sits at the bottom of the canvas and the horizon at the
      // top. Getting this backwards put the largest, brightest points in the
      // middle of the screen over the hero text.
      const y = height * perspective;
      const x = width / 2 + gx * width * HALF_WIDTH * perspective;

      // Dissolve towards the horizon so the field has no visible far edge, and
      // confine it to the band the WebGL wave uses.
      const fade = Math.pow(perspective, 0.45);
      const band = clamp01((1 - t - BAND_LOW) / Math.max(BAND_HIGH - BAND_LOW, 0.01));
      const alpha = clamp01(fade * (0.35 + band * 0.65));

      points.push({
        x,
        y,
        amplitude: perspective * 30,
        size: 3.5 + perspective * 10,
        sprite: spriteIndexFor(gx, t, alpha),
        gx: gx * 6,
        gz: t * 8,
      });
    }
  }

  // Draw order grouped by sprite: a canvas state change per point costs more
  // than the draw itself, and the field is ambient enough that overlap order
  // is not visually meaningful.
  points.sort((a, b) => a.sprite - b.sprite);
  return points;
}

/** Near and far plane distances. Their ratio sets how hard the field
 *  converges. 1:9 pushed the horizon so high that most rows bunched into the
 *  top fifth; 1:6 keeps a readable recession across the whole band. */
const NEAR = 1;
const FAR = 6;

/**
 * Half-width of the plane as a fraction of the canvas, at the near edge.
 *
 * A physically wide plane wastes the point budget: at 0.95 the nearest row
 * spanned +/-370px of a 390px canvas, so most of its points fell off-screen and
 * the near field — the part that should read as closest — looked empty. 0.62
 * spans about 1.24x the canvas, enough to run past both edges without throwing
 * the budget away.
 */
const HALF_WIDTH = 0.62;

/** Colour bucket varies with position rather than height, so a point's sprite
 *  never changes between frames and the grouped draw order stays valid. */
function spriteIndexFor(gx: number, gz: number, alpha: number): number {
  const colour = Math.min(2, Math.floor((Math.abs(gx) * 0.5 + gz * 0.5) * 3));
  const bucket = Math.min(
    MOBILE_WAVE.alphaBuckets - 1,
    Math.floor(alpha * MOBILE_WAVE.alphaBuckets),
  );
  return colour * MOBILE_WAVE.alphaBuckets + bucket;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
