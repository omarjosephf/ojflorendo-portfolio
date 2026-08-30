# ADR-0009: The phone particle wave runs on raw WebGL

- Status: Accepted
- Date: 2026-08-31
- Owner: OJ Florendo
- Risk class: R2 (user-visible presentation change on mobile, touching the
  measured performance budget)
- Supersedes: ADR-0008 (withdrawn)

## Context

ADR-0003 keeps phones off the shared three.js chunk. ADR-0008 tried to give them
a wave in Canvas 2D instead and was withdrawn: the field rendered as a fan
covering barely a third of the screen at mid-depth, and even with that corrected,
800 sprites cannot resemble 5712 GPU-rendered points.

The owner reviewed three releases on his phone and could not see a wave in any
of them. He asked for the best available solution, including a new tool if one
was needed, and was willing to drop the feature entirely.

The key observation is that **ADR-0003's measured objection was to three.js, not
to WebGL**: 234 KiB transferred, 896 KB parsed and ~1123 ms of script evaluation.
None of that is inherent to the platform. The wave's only real dependencies on
the library are context setup, camera matrices and a pointer raycast that phones
do not need, because they do not hover.

## Decision

Phones render the particle wave through a WebGL context opened by hand, running
**the same GLSL the desktop scene runs**. The shaders moved to
`src/components/three/wave-shaders.ts` and both renderers import them, so the two
cannot drift apart — they are meant to be the same water.

`src/components/webgl/` holds the renderer and about forty lines of matrix maths.
No new dependency: pulling in a maths package to supply `perspective` and
`lookAt` would reintroduce exactly the bundle weight ADR-0003 removed.

Geometry comes from the existing `wave-geometry.ts` helpers, and that is
load-bearing rather than tidy. `horizontalScale()` stretches the plane so it
reaches past the frustum at every depth; reusing it makes the ADR-0008 wedge
**structurally impossible** instead of merely fixed.

Deliberate differences from desktop:

- **No pointer ripple.** Phones do not hover, and a touch-driven ripple would be
  a new interaction surface rather than a background.
- **Backing store capped at 2x** rather than the 3x phones report. The shader
  sizes points in physical pixels through `uPixelRatio`, so this trades a little
  sharpness for a quarter of the fill.
- **`COMPACT` config at 20fps** — the profile the scenes already used for phones.

Everything else — uniforms, colours, `uOpacity: 0.32`, non-additive blending,
the band confining the water to the lower half — matches the desktop material
exactly.

## Consequences

Measured on a local production build, mobile Lighthouse best-of-5:

| | Performance | TBT | scriptEvaluation | paint |
| --- | --- | --- | --- | --- |
| Wave off (control) | 94, 91, 93, 94, 93 | 28-49 ms | 285-380 ms | 15-26 ms |
| ADR-0008 Canvas 2D | 93, 93, 93, 92, 93 | 19-39 ms | 617-703 ms | 171-180 ms |
| **This, raw WebGL** | **94, 93, 93, 93, 93** | **35-63 ms** | 656-704 ms | 167-195 ms |

Accessibility, Best Practices and SEO stay at 100.

Frame cadence on the real page under CPU throttling: median rAF gap 16.6 ms at
both 4x and 6x, p95 19-19.5 ms, and **zero long tasks at either rate** — better
than the Canvas-2D version, which produced them at 6x.

Total JavaScript on a phone is 203 KiB, with the wave's own chunks at 8-12 KB
raw, roughly 3-4 KB transferred. The budget allowed 25 KB.

Coverage, measured by differencing rendered frames with the layer hidden:

| Band, down the viewport | Horizontal span | Columns lit |
| --- | --- | --- |
| 45-55% (the horizon) | 100% | 96% |
| 55-70% | 100% | 78% |
| 70-85% | 99% | 40% |
| 85-100% (near field) | 78% | 6% |

The withdrawn version measured about 35% at mid-depth. The sparse near field is
perspective working correctly: points spread apart as they approach the viewer,
exactly as on desktop.

### A caveat on the script figures

`scriptEvaluation` is no lower than the Canvas-2D version, which is surprising
for GPU work. Headless Chrome rasterises WebGL in software, so these numbers
include work a real phone's GPU would do instead. The frame-cadence and
long-task results are the more trustworthy signal, and they improved. This is
recorded rather than presented as a clean win.

## Verified behaviour

| Context | Result |
| --- | --- |
| Chromium 390x844 | one canvas, buffer 780x1688 at DPR 2 |
| **WebKit, iPhone 13, DPR 3** | one canvas, buffer 780x1328, animating |
| Reduced motion | one static frame, no loop |
| Desktop | three.js scenes only; the two never both mount |

WebKit matters here: every check during ADR-0008 ran in Chromium, and the engine
OJ actually uses had never been tested. Note that WebKit honours HSTS on
localhost and upgrades `http://localhost` to HTTPS, where nothing is listening,
so a local production build must be tested through a route shim that rewrites
the URL back and strips the header.

## Test coverage

- **Unit**: the matrix maths, and an invariant asserting the plane reaches past
  the frustum at five aspect ratios for both configs. Verified to fail when
  `horizontalScale()` is stubbed to 1 — the ADR-0008 defect.
- **e2e**: the rendered field must span at least 90% of the screen width through
  the 45-70% band, measured by differencing frames with the layer hidden. The
  withdrawn version would score about 35%.

Both assert the *effect*. This project has now shipped two background features
that passed every cost-based gate and looked wrong.

## Alternatives considered

- **Tap-to-load the three.js scene.** Full fidelity with no Lighthouse impact,
  but it only appears when tapped, so it is not an ambient background.
- **Repair the Canvas-2D field.** The wedge is fixable; the quality ceiling at
  800 sprites is not.
- **Drop the wave on phones.** The owner's stated fallback, and still the
  fallback if this regresses.

## Rollback

Remove `<MobileWaveGLLazy />` from `src/app/layout.tsx`; phones return to the
ambient glow. Deleting `src/components/webgl/` removes the feature. The shader
extraction is independent and can stay either way.
