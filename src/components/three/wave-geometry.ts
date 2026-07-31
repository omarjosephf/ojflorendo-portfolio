/**
 * Framing and sizing maths for the site-wide particle wave.
 *
 * Kept free of three.js and React so the geometry can be reasoned about and
 * unit-tested on its own — the way the field sits on screen has been the source
 * of every visual defect in this scene, and those are cheap to assert here and
 * expensive to eyeball on six viewports.
 */

/** Perspective camera used by the scene. */
export const CAMERA = { fov: 55, near: 0.1, far: 160 } as const;
export const CAMERA_POSITION = [0, 3.4, 10] as const;
export const CAMERA_TARGET = [0, 0.5, -16] as const;

/** Centre of the water plane, on the camera's axis. */
export const PLANE_Z = -14;

/**
 * Vertical extent of the water as a fraction of viewport height, measured from
 * the bottom: solid below BAND_LOW, gone by BAND_HIGH. Confines it to the lower
 * half so the upper half — where most reading happens — stays clear.
 */
export const BAND_LOW = 0.4;
export const BAND_HIGH = 0.6;

export type WaveConfig = {
  columns: number;
  rows: number;
  spacing: number;
  size: number;
  fps: number;
};

/**
 * Point counts and frame rates are a deliberate performance budget. This layer
 * is on screen the whole time, and on the homepage it runs alongside the Digital
 * Core; two animating WebGL scenes measurably competed for the frame budget at
 * 30fps. The wave is a slow ambient drift where 20–24fps is indistinguishable,
 * so it yields the headroom rather than the foreground scene.
 */
export const DESKTOP: WaveConfig = {
  columns: 120,
  rows: 72,
  spacing: 0.62,
  size: 2.4,
  fps: 24,
};

export const COMPACT: WaveConfig = {
  columns: 84,
  rows: 68,
  spacing: 0.62,
  size: 2.2,
  fps: 20,
};

export const halfWidthOf = (c: WaveConfig) => ((c.columns - 1) * c.spacing) / 2;
export const halfDepthOf = (c: WaveConfig) => ((c.rows - 1) * c.spacing) / 2;

/** World-space z of the plane's leading (nearest to camera) edge. */
export const nearEdgeZ = (c: WaveConfig) => PLANE_Z + halfDepthOf(c);

/**
 * World-space z at which the ray through the *bottom* of the viewport meets the
 * water. The plane's near edge must lie beyond this, otherwise the bottom strip
 * of the screen contains no geometry and the water reads as a band floating in
 * mid-screen instead of a shoreline running off the bottom of the page.
 */
export function bottomOfScreenReachZ(): number {
  const [, camY, camZ] = CAMERA_POSITION;
  const [, targetY, targetZ] = CAMERA_TARGET;
  // How far the camera is already tilted down, plus half the vertical FOV, is
  // the angle of the ray through the bottom edge of the frame.
  const pitch = Math.atan2(camY - targetY, camZ - targetZ);
  const bottomRay = pitch + (CAMERA.fov * Math.PI) / 360;
  return camZ - camY / Math.tan(bottomRay);
}

/**
 * Distance at which the field has fully dissolved. Derived from the geometry so
 * it always lands just short of the real far edge — the grid must never end in
 * a visible straight line.
 */
export const fadeFarOf = (c: WaveConfig) =>
  CAMERA_POSITION[2] - PLANE_Z + halfDepthOf(c) - 2;

/**
 * How far the field must be stretched horizontally to reach past the frustum at
 * the current aspect ratio. Without this the plane's lateral edges are visible
 * on 16:9 and ultrawide desktops, and on phones held in landscape — the field is
 * sized for the viewport rather than assuming one.
 */
export function horizontalScale(config: WaveConfig, aspect: number): number {
  const fovRadians = (CAMERA.fov * Math.PI) / 180;
  const required = Math.tan(fovRadians / 2) * aspect * fadeFarOf(config);
  return Math.max(1, required / halfWidthOf(config));
}
