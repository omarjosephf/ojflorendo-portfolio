# ADR-0008: A Canvas-2D particle wave on phones

- Status: Accepted
- Date: 2026-08-30
- Owner: OJ Florendo
- Risk class: R2 (user-visible presentation change on mobile, touching the
  measured performance budget)

## Context

ADR-0003 keeps both WebGL scenes off phone-sized viewports. That decision is
unchanged here and is not revisited.

What ADR-0003 did not say plainly enough is what phones were left with. Two
changes shipped on 30 August 2026 gave the ambient background glow a slow drift
(ADR-0003's amendment and its follow-up), and the owner's response identified
the actual gap: he could not see **the particle wave**. He was right, and the
mismatch was in the framing rather than the implementation. Drifting two blurred
gradients is a substitute for the wave's motion; it is not a particle field, and
no amount of tuning gradients would ever produce one.

So the question was whether phones can have a real particle wave without the
cost ADR-0003 removed: a 234 KiB shared three.js chunk and ~1123 ms of script
evaluation on a throttled mobile CPU.

## Decision

Phone-sized viewports render a particle wave drawn in plain Canvas 2D, mounted
by `MobileWaveLazy` exactly where `useSceneEnabled()` denies the WebGL one. The
two are mutually exclusive: no viewport runs both, and no phone requests
three.js.

The budget is measured, not chosen. Prototyped on a blank page under CPU
throttling, drawing pre-rendered sprites grouped to avoid canvas state changes:

| points | 4x median | 4x long tasks | 6x median | 6x long tasks |
| --- | --- | --- | --- | --- |
| 400 | 3.4 ms | 0 | 4.6 ms | 0 |
| 800 | 5.2 ms | 0 | 13.9 ms | 6 |
| 1200 | 9.5 ms | 0 | 10.5 ms | 13 |
| 2000 | 13.3 ms | 9 | 20.6 ms | 51 |
| 3000 | 16.7 ms | 36 | 21.0 ms | 56 |

**600 points at 20fps**, against the WebGL wave's 5712. An initial proposal of
1200 was written before measuring and would have breached the budget it was
proposed under.

Implementation constraints that follow from the budget:

- The field projects **once** on mount. Per frame, only three sines and one
  `drawImage` per point.
- Sprites are pre-rendered into a table of 3 colours x 4 alpha buckets, and draw
  order is sorted by sprite, so canvas state changes are rare. Colour therefore
  varies by position rather than by wave height, unlike the shader.
- Device pixel ratio is pinned to 1. This is a soft out-of-focus background; a
  3x buffer costs nine times the fill for no visible gain.
- No pointer ripple. Phones do not hover, and a touch-driven ripple would be a
  new interaction surface rather than a background.

### Accessibility and comfort

`prefers-reduced-motion` draws a single static frame rather than nothing: the
picture survives, the movement does not.

Sprite alpha is bucketed to a peak of 0.27, matching the WebGL wave's point
alpha of 0.85 multiplied by its `uOpacity` of 0.32. A first pass used the 0.85
figure without the multiplier and measured 171 levels of pixel change between
frames, against the ambient glow's 8. That is precisely the hard bright point on
a dark field that the owner's astigmatism constraint rules out, and that the
fragment shader documents avoiding. Falloff is wide and gradual and blending is
plain `source-over` — no additive blending anywhere.

## Consequences

Measured on the real site, both states in one session, mobile best-of-5:

| | Performance | TBT | scriptEvaluation | paintCompositeRender |
| --- | --- | --- | --- | --- |
| Wave off | 94, 91, 93, 94, 93 | 28-49 ms | 285-380 ms | 15-26 ms |
| **Wave on** | **93, 93, 93, 93, 93** | **17-30 ms** | 572-640 ms | 155-175 ms |

The Lighthouse target is unaffected: median 93 either way, and TBT did not rise,
because each frame costs about 4 ms and nothing approaches the 50 ms long-task
threshold.

**The cost is real and is not in the score.** Main-thread script roughly doubles
and paint work rises about tenfold. That is continuous CPU and GPU on a phone,
which means battery and heat. ADR-0003 counted removing a continuous render loop
as one of its wins, and this puts a much smaller one back: no download, no parse
cost, 600 sprite blits at 20fps instead of a WebGL scene. It is a deliberate
trade, made with the numbers visible, and 400 points at 15fps remains available
as a cheaper setting if the trade proves wrong on real devices.

Verified behaviour:

| Context | Result |
| --- | --- |
| Mobile 390x844 | one canvas, no three.js chunk, animating |
| Mobile + reduced motion | canvas present, zero movement |
| Desktop 1440x900 | WebGL scenes only, mobile wave absent |

### Test coverage

The ADR-0003 e2e guard asserted **zero** canvases on phones. That assertion is
now wrong by design and has been rewritten to assert what the budget is actually
about: that no chunk over 150 KiB loads on a phone, and that one does on desktop.

A second guard asserts the wave's **effect** — two frames 1.2 s apart must differ
by more than 20 levels. This project has already shipped a background animation
that passed every gate and was invisible; asserting that an element exists would
not have caught that.

Unit tests cover the projection maths, each guarding a defect that actually
occurred during implementation: the perspective was initially inverted, putting
the largest and brightest points mid-screen over the hero text, and the plane
was initially wide enough that most near-row points fell off the canvas, leaving
the near field sparse. Both were found by looking at a screenshot, not by
reasoning, and both now fail the suite if reintroduced.

## Amendment — 30 August 2026: legible on a real phone

The version above shipped and the owner reported faint scattered dots rather
than a wave. Emulation confirmed it: the field rendered, animated and sat in the
right place, but was too thin and too soft to read as water on a phone.

Two causes, both mine:

- **The backing store was pinned to `devicePixelRatio: 1`** to save fill. Phones
  report 3, so every sprite was upscaled threefold, blurring 0.27-alpha dots
  into nothing. Every verification screenshot had been taken at DPR 1, so none
  of them showed this.
- **600 points is too sparse at phone size.** The desktop field reads as a
  surface because 5712 points merge; 600 read as scattered specks.

Now 800 points, sprites enlarged (`3.5 + perspective * 10`, drawn from a 20px
texture), and the backing store capped at 2x — legible without the fourfold fill
of a full 3x buffer. Peak alpha is unchanged at 0.27: brightness was not the
problem and the astigmatism constraint still holds.

Measured after the change, mobile best-of-5: **93, 93, 93, 92, 93**, unchanged.
`scriptEvaluation` 617-703 ms and paint 171-180 ms, against 572-640 and 155-175
before — a small rise for four times the fill, because the added cost is GPU
compositing rather than main-thread work. Frame cadence under CPU throttling
held a median 16.5 ms gap at 4x and 16.9 ms at 6x, with 0-1 long tasks.

### Testing note: WebKit and localhost

WebKit honours `Strict-Transport-Security` on localhost and upgrades
`http://localhost` to HTTPS, which fails. Chromium exempts localhost. A WebKit
run against a local production build therefore loads no JavaScript and finds no
canvas — an artifact of the test setup, not a defect. Verify WebKit against a
deployed HTTPS preview instead. This is a further argument for the mobile
WebKit e2e project already on the backlog.

## Alternatives considered

- **Tap-to-load the real WebGL wave.** Full fidelity and no Lighthouse impact,
  but it appears only when tapped, which is not an ambient background. Remains
  the fallback if the battery trade proves wrong.
- **Tune the ambient gradient drift further.** Cannot produce a particle field
  at any setting. This is what the two preceding changes did.
- **Accept no wave on phones.** The status quo ADR-0003 left in place, which the
  owner asked to revisit.

## Rollback

Remove `<MobileWaveLazy />` from `src/app/layout.tsx`. Phones return to the
drifting ambient glow with no other change. Deleting
`src/components/canvas/` removes the feature entirely.
