import { describe, expect, it } from "vitest";
import { MOBILE_WAVE, buildField, waveHeight } from "./wave-field";

const WIDTH = 390;
const HEIGHT = 506; // 390x844 phone, band height applied

describe("mobile wave field", () => {
  describe("perspective runs the right way up", () => {
    // The defect this guards, which shipped in a spike: the near edge was
    // projected to the TOP of the canvas, so the largest and brightest points
    // landed mid-screen over the hero text and the field faded downwards.
    it("puts the near edge at the bottom and the horizon at the top", () => {
      const field = buildField(WIDTH, HEIGHT);
      const lowest = field.reduce((a, b) => (a.y > b.y ? a : b));
      const highest = field.reduce((a, b) => (a.y < b.y ? a : b));

      expect(lowest.y).toBeGreaterThan(HEIGHT * 0.8);
      expect(highest.y).toBeLessThan(HEIGHT * 0.35);
      // Nearer points are drawn larger and travel further.
      expect(lowest.size).toBeGreaterThan(highest.size);
      expect(lowest.amplitude).toBeGreaterThan(highest.amplitude);
    });

    it("bunches rows towards the horizon rather than spacing them evenly", () => {
      // Evenly spaced rows read as a dot grid, not a receding plane. Projecting
      // as 1/distance is what makes it read as water.
      const ys = [...new Set(buildField(WIDTH, HEIGHT).map((p) => p.y))].sort(
        (a, b) => a - b,
      );
      const gapNearHorizon = ys[1] - ys[0];
      const gapNearViewer = ys[ys.length - 1] - ys[ys.length - 2];
      expect(gapNearViewer).toBeGreaterThan(gapNearHorizon * 2);
    });
  });

  describe("spends its point budget on visible points", () => {
    // At a half-width of 0.95 the nearest row spanned +/-370px of a 390px
    // canvas, so most of its points fell off-screen and the near field looked
    // empty while still costing a draw call each.
    it("keeps the near rows on screen, so the near field is not sparse", () => {
      // Counting the whole field hides this: rows bunch towards the horizon, so
      // overall on-screen share stays high even when the near rows are mostly
      // off the sides. The defect is visible only in the bottom band.
      const field = buildField(WIDTH, HEIGHT);
      const nearRows = field.filter((p) => p.y > HEIGHT * 0.7);
      const visible = nearRows.filter((p) => p.x > 0 && p.x < WIDTH);
      expect(visible.length / nearRows.length).toBeGreaterThan(0.7);
    });

    it("still runs past both edges, so the field has no visible side border", () => {
      const field = buildField(WIDTH, HEIGHT);
      expect(Math.min(...field.map((p) => p.x))).toBeLessThan(0);
      expect(Math.max(...field.map((p) => p.x))).toBeGreaterThan(WIDTH);
    });
  });

  describe("respects the measured performance budget", () => {
    it("builds no more points than the budget allows", () => {
      // 1200 points measured 9.5ms per frame at 4x throttle and produced long
      // tasks at 6x. The budget is not a preference.
      expect(MOBILE_WAVE.points).toBeLessThanOrEqual(800);
      expect(buildField(WIDTH, HEIGHT)).toHaveLength(MOBILE_WAVE.points);
    });

    it("groups draw order by sprite so the canvas state rarely changes", () => {
      const sprites = buildField(WIDTH, HEIGHT).map((p) => p.sprite);
      const sorted = [...sprites].sort((a, b) => a - b);
      expect(sprites).toEqual(sorted);
    });

    it("assigns every point a sprite that exists", () => {
      const max = 3 * MOBILE_WAVE.alphaBuckets - 1;
      for (const point of buildField(WIDTH, HEIGHT)) {
        expect(point.sprite).toBeGreaterThanOrEqual(0);
        expect(point.sprite).toBeLessThanOrEqual(max);
      }
    });
  });

  describe("wave height", () => {
    it("stays within the amplitude the projection assumes", () => {
      let min = Infinity;
      let max = -Infinity;
      for (let t = 0; t < 200; t += 0.5) {
        for (let gx = -6; gx <= 6; gx += 1) {
          for (let gz = 0; gz <= 8; gz += 1) {
            const h = waveHeight(gx, gz, t);
            min = Math.min(min, h);
            max = Math.max(max, h);
          }
        }
      }
      // Three sines of 0.55 + 0.45 + 0.40 cannot exceed 1.4 either way.
      expect(max).toBeLessThanOrEqual(1.4);
      expect(min).toBeGreaterThanOrEqual(-1.4);
    });

    it("does not visibly loop: the three sines stay out of phase", () => {
      // If the periods shared a short common multiple the surface would pulse.
      // Sampling a long window, no later frame should reproduce the first.
      const first = [0, 2, 4].map((gx) => waveHeight(gx, 3, 0));
      let repeats = 0;
      for (let t = 1; t < 400; t += 1) {
        const now = [0, 2, 4].map((gx) => waveHeight(gx, 3, t));
        if (now.every((v, i) => Math.abs(v - first[i]) < 0.001)) repeats++;
      }
      expect(repeats).toBe(0);
    });
  });
});
