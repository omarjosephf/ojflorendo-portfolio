import { describe, expect, it } from "vitest";
import {
  BAND_HIGH,
  BAND_LOW,
  COMPACT,
  DESKTOP,
  bottomOfScreenReachZ,
  fadeFarOf,
  halfDepthOf,
  halfWidthOf,
  horizontalScale,
  nearEdgeZ,
} from "./wave-geometry";

const PROFILES = [
  ["desktop", DESKTOP],
  ["compact", COMPACT],
] as const;

describe("particle wave geometry", () => {
  describe("reaches the bottom of the viewport", () => {
    // The defect this guards: with too few rows the field stops short of the
    // bottom edge, leaving an empty strip and making the water read as a band
    // floating in mid-screen instead of running off the bottom of the page.
    it.each(PROFILES)("%s field extends past the bottom edge", (_name, config) => {
      expect(nearEdgeZ(config)).toBeGreaterThan(bottomOfScreenReachZ());
    });

    it("keeps headroom so the edge stays off-screen, not just touching it", () => {
      for (const [, config] of PROFILES) {
        expect(nearEdgeZ(config) - bottomOfScreenReachZ()).toBeGreaterThan(0.5);
      }
    });
  });

  describe("never shows a straight edge", () => {
    it.each(PROFILES)("%s dissolves before its far edge", (_name, config) => {
      // Distance from the camera to the geometric far edge.
      const farEdgeDistance = 10 - (-14 - halfDepthOf(config));
      expect(fadeFarOf(config)).toBeLessThan(farEdgeDistance);
    });

    it.each(PROFILES)(
      "%s stretches wide enough for ultrawide and landscape phones",
      (_name, config) => {
        // 21:9 desktop, and a phone held in landscape, are the widest real cases.
        for (const aspect of [2.4, 844 / 390]) {
          const reach = halfWidthOf(config) * horizontalScale(config, aspect);
          const needed = Math.tan((55 * Math.PI) / 360) * aspect * fadeFarOf(config);
          expect(reach).toBeGreaterThanOrEqual(needed - 0.001);
        }
      },
    );

    it("never shrinks the field below its authored width", () => {
      // Portrait phones need far less width; the scale must clamp at 1 rather
      // than squeezing the grid and changing the wave's proportions.
      expect(horizontalScale(DESKTOP, 0.46)).toBe(1);
    });
  });

  describe("stays out of the reading area", () => {
    it("confines the water to the lower half of the viewport", () => {
      expect(BAND_LOW).toBeLessThan(BAND_HIGH);
      // Fully faded by the vertical midpoint plus a small margin, so the upper
      // half of every page stays clear for text.
      expect(BAND_HIGH).toBeLessThanOrEqual(0.65);
    });
  });

  describe("performance budget", () => {
    it.each(PROFILES)("%s stays within its point budget", (_name, config) => {
      const points = config.columns * config.rows;
      expect(points).toBeLessThanOrEqual(config === DESKTOP ? 9000 : 6000);
    });

    it.each(PROFILES)("%s runs at an ambient frame rate", (_name, config) => {
      // This layer shares the frame budget with the Digital Core on the
      // homepage; it is a slow drift and must not ask for more than it needs.
      expect(config.fps).toBeLessThanOrEqual(24);
    });
  });
});
