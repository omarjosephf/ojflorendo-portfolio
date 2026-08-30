import { describe, expect, it } from "vitest";
import { lookAt, modelView, perspective, rgb } from "./gl";
import {
  CAMERA,
  CAMERA_POSITION,
  CAMERA_TARGET,
  COMPACT,
  DESKTOP,
  PLANE_Z,
  fadeFarOf,
  halfWidthOf,
  horizontalScale,
} from "@/components/three/wave-geometry";

/** Applies a column-major mat4 to a point, returning clip-space xyzw. */
function apply(m: Float32Array, p: [number, number, number]) {
  const [x, y, z] = p;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

describe("webgl maths", () => {
  describe("perspective", () => {
    it("keeps points in front of the camera at positive w", () => {
      const m = perspective(Math.PI / 3, 0.46, 0.1, 160);
      const [, , , w] = apply(m, [0, 0, -10]);
      expect(w).toBeGreaterThan(0);
    });

    it("maps the near and far planes to -1 and 1 in NDC", () => {
      const near = 0.1;
      const far = 160;
      const m = perspective(Math.PI / 3, 1, near, far);
      const atNear = apply(m, [0, 0, -near]);
      const atFar = apply(m, [0, 0, -far]);
      expect(atNear[2] / atNear[3]).toBeCloseTo(-1, 4);
      expect(atFar[2] / atFar[3]).toBeCloseTo(1, 4);
    });

    it("narrows the horizontal field as aspect ratio drops", () => {
      // A portrait phone must not see more of the scene sideways than a wide
      // desktop does; if it did, the plane's lateral edges would show.
      const portrait = perspective(Math.PI / 3, 0.46, 0.1, 160);
      const wide = perspective(Math.PI / 3, 1.78, 0.1, 160);
      expect(portrait[0]).toBeGreaterThan(wide[0]);
    });
  });

  describe("lookAt", () => {
    it("puts the target straight down the camera's -z axis", () => {
      const view = lookAt(CAMERA_POSITION, CAMERA_TARGET);
      const [x, y, z] = apply(view, [...CAMERA_TARGET] as [number, number, number]);
      expect(x).toBeCloseTo(0, 5);
      expect(y).toBeCloseTo(0, 5);
      expect(z).toBeLessThan(0);
    });

    it("puts the camera itself at the origin of view space", () => {
      const view = lookAt(CAMERA_POSITION, CAMERA_TARGET);
      const [x, y, z] = apply(view, [...CAMERA_POSITION] as [number, number, number]);
      expect(Math.hypot(x, y, z)).toBeCloseTo(0, 5);
    });
  });

  describe("modelView", () => {
    it("stretches x and pushes the plane back, matching the r3f scene", () => {
      // The desktop scene renders <points position={[0,0,PLANE_Z]}
      // scale={[xScale,1,1]} />; this must agree with it exactly, or the two
      // renderers would show the same water in different places.
      const view = lookAt(CAMERA_POSITION, CAMERA_TARGET);
      const xScale = 2.5;
      const mv = modelView(view, xScale, PLANE_Z);

      const direct = apply(mv, [4, 0, 3]);
      const equivalent = apply(view, [4 * xScale, 0, 3 + PLANE_Z]);
      for (let i = 0; i < 4; i++) {
        expect(direct[i]).toBeCloseTo(equivalent[i], 5);
      }
    });
  });

  describe("the field covers the screen at every depth", () => {
    // This is the defect that shipped in ADR-0008 and was withdrawn: a plane
    // narrower than the frustum tapers to a point, so the field rendered as a
    // fan covering roughly a third of the screen width at mid-depth. Reusing
    // horizontalScale() makes it structurally impossible, and this asserts it
    // rather than trusting that.
    const ASPECTS = [
      ["iPhone portrait", 390 / 844],
      ["small phone portrait", 320 / 568],
      ["phone landscape", 844 / 390],
      ["tablet", 768 / 1024],
      ["ultrawide", 21 / 9],
    ] as const;

    it.each(ASPECTS)("%s: the plane reaches past the frustum", (_name, aspect) => {
      for (const config of [COMPACT, DESKTOP]) {
        const stretched = halfWidthOf(config) * horizontalScale(config, aspect);
        // Half-width of the frustum at the distance the field fades out.
        const required =
          Math.tan((CAMERA.fov * Math.PI) / 360) * aspect * fadeFarOf(config);
        expect(stretched).toBeGreaterThanOrEqual(required - 1e-9);
      }
    });
  });

  describe("rgb", () => {
    it("parses the palette hexes the shader expects", () => {
      expect(rgb("#2dd4bf").map((v) => Math.round(v * 255))).toEqual([45, 212, 191]);
      expect(rgb("#38bdf8").map((v) => Math.round(v * 255))).toEqual([56, 189, 248]);
    });
  });
});
