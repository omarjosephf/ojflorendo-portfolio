import { describe, expect, it } from "vitest";

import {
  COVER_SHAPE_LIMITS,
  COVER_TINTS,
  buildCoverScene,
  countCoverShapes,
  seededRandom,
  type CoverScene,
  type CoverVariant,
} from "./cover-scene";
import { BLOG_POST_TYPES, type BlogPostType } from "./types";

const LIVE_SLUG = "evaluating-retrieval-systems-refusal-testing-and-quote-integrity";
const TYPES: (BlogPostType | null)[] = [...BLOG_POST_TYPES, null];
const VARIANTS: CoverVariant[] = ["featured", "card"];
const SLUGS = Array.from({ length: 60 }, (_, index) => `post-${index}-${(index * 7919).toString(36)}`);

function numbersIn(scene: CoverScene): number[] {
  const values: number[] = [];
  JSON.stringify(scene, (_key, value) => {
    if (typeof value === "number") values.push(value);
    if (typeof value === "string") {
      for (const match of value.matchAll(/-?\d+(?:\.\d+)?/g)) values.push(Number(match[0]));
    }
    return value;
  });
  return values;
}

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("blog star pictures (ADR-0027)", () => {
  it("draws the same picture for the same slug, type and size", () => {
    for (const type of TYPES) {
      for (const variant of VARIANTS) {
        expect(buildCoverScene(LIVE_SLUG, type, variant)).toEqual(buildCoverScene(LIVE_SLUG, type, variant));
      }
    }
    const first = seededRandom("seed");
    const second = seededRandom("seed");
    expect(Array.from({ length: 5 }, first)).toEqual(Array.from({ length: 5 }, second));
  });

  it("draws a different picture for a different slug", () => {
    expect(buildCoverScene("one-post", "explainer", "card")).not.toEqual(buildCoverScene("two-post", "explainer", "card"));
  });

  it("stays within the shape limits for every type, size and many slugs", () => {
    let largest = { featured: 0, card: 0 };
    for (const slug of [LIVE_SLUG, ...SLUGS]) {
      for (const type of TYPES) {
        for (const variant of VARIANTS) {
          const count = countCoverShapes(buildCoverScene(slug, type, variant));
          expect(count).toBeLessThanOrEqual(COVER_SHAPE_LIMITS[variant]);
          largest = { ...largest, [variant]: Math.max(largest[variant], count) };
        }
      }
    }
    expect(largest.featured).toBeGreaterThan(100);
    expect(largest.card).toBeGreaterThan(50);
  });

  it("uses only finite numbers and gradients it defines, each once", () => {
    for (const slug of SLUGS.slice(0, 12)) {
      for (const type of TYPES) {
        const scene = buildCoverScene(slug, type, "featured");
        expect(numbersIn(scene).every(Number.isFinite)).toBe(true);
        const ids = scene.gradients.map((gradient) => gradient.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const group of scene.groups) {
          for (const shape of group.shapes) {
            const reference = /^url\(#([a-z]+)\)$/.exec(shape.fill)?.[1];
            if (reference) expect(ids).toContain(reference);
          }
        }
      }
    }
  });

  it("gives each type its motif, and a version 1 post the star field alone", () => {
    const roles = (type: BlogPostType | null) =>
      new Set(buildCoverScene(LIVE_SLUG, type, "card").groups.map((group) => group.role));
    expect(roles("explainer")).toContain("tilt");
    expect(roles("case-study")).toContain("orbit");
    expect(roles("build-notes")).toContain("drift");
    expect([...roles(null)].sort()).toEqual(["glow", "still"]);
  });

  it("keeps every type tint at 4.5:1 or more on the label fill", () => {
    for (const tint of Object.values(COVER_TINTS)) {
      expect(contrast(tint, "#0b0d15")).toBeGreaterThanOrEqual(4.5);
    }
  });
});
