# ADR-0003: No WebGL scenes on phone-sized viewports

- Status: Accepted
- Date: 2026-07-31
- Ratified: 2026-08-02 by OJ Florendo
- Owner: OJ Florendo
- Risk class: R2 (user-visible presentation change on mobile)

## Context

`CLAUDE.md` §12 sets a Lighthouse Performance target of 90+ on a representative
production mobile test. Production measured **85** at best on mobile, against
**100** on desktop, so only mobile missed the target.

The cause was measured, not assumed. Both 3D scenes — the hero Digital Core and
the site-wide particle wave — share a single three.js / React Three Fiber chunk:

- 234 KiB transferred, 896 KB parsed
- ~1123 ms of script evaluation on Lighthouse's 4x-throttled mobile CPU
- 123 KiB of it never executed

That evaluation dominated Total Blocking Time (464–662 ms locally, scoring
60/100 on that audit alone) and was the entire gap to 90.

One alternative was tried first and rejected on evidence: deferring the dynamic
import to `load` + `requestIdleCallback`. Measured best-of-5 went 80 → 82 with
TBT 464 ms → 480 ms — inside the noise band. Lighthouse observes until the main
thread goes quiet, so deferring *within* that window relocates the cost without
removing it. Main-thread total actually rose. That change was reverted.

## Decision

Phone-sized viewports (`max-width: 767px`) do not mount either WebGL scene. The
shared `useSceneEnabled()` hook returns `false` there, so the dynamic import
never runs and the chunk is never requested.

Those viewports keep the CSS presentations that already exist and are already
the documented no-JS / no-WebGL state:

- the `body::before` gradient glow, in place of the particle wave
- `DigitalCoreFallback`, in place of the hero core

Desktop and tablet behaviour is unchanged.

## Consequences

Measured, best-of-5 local production builds:

| | Performance | TBT | Scripts |
| --- | --- | --- | --- |
| Mobile before | 65–80 | 464–662 ms | 14 |
| **Mobile after** | **91, 92, 92, 93, 93** | **28–62 ms** | 11 |
| Desktop after | 100 (×3) | 32–44 ms | 14 |

Accessibility, Best Practices and SEO stay at 100 throughout.

Beyond the score: phones stop downloading 234 KiB and stop running a continuous
WebGL render loop, which returns battery and thermal headroom on the devices
least able to spare either.

The cost is that phone visitors no longer see the particle wave or the animated
core. They see the static presentations instead. This is a deliberate trade of
decorative motion for responsiveness on the constrained device class, and it is
the change most visible to real visitors, so it needs owner sign-off before
release rather than after.

Every mobile run also became *stable* (91–93, spread of 2) where the baseline
swung between 52 and 85. The variance was the WebGL work colliding with host
CPU contention; removing it removed the variance.

### Known limitation

A phone held in landscape is wider than 767px and still loads WebGL. The
breakpoint deliberately matches the one the scenes already use for their compact
tuning (`useCompactViewport`); adding a second, different heuristic for the same
concept would be worse than the gap it closes.

### Numbering

This ADR takes 0003. An unshipped branch prepared a curated-assistant ADR under
the same number; that feature is a V1.5 roadmap item and is not released, so it
renumbers to 0004 when it lands.

## Alternatives considered

- **Defer the import to idle** — measured, no benefit, reverted (see Context).
- **Drop `@react-three/drei`** — used for only `AdaptiveDpr` and `Line`. Would
  trim tens of KiB, not the ~1.1s of three.js evaluation, so it could not reach
  90 alone. `Line` also provides thick lines that native WebGL lines cannot, so
  removing it would change the Digital Core's appearance.
- **Load scenes on first interaction** — would also clear the target, but leaves
  the hero on its fallback until the visitor touches the page on *every* device,
  including desktop where performance is already 100.
- **Accept 85** — leaves a documented target unmet with no plan to meet it.

## Rollback

Make `useSceneEnabled()` ignore the media query. Both scenes return to loading
wherever WebGL exists, and mobile Performance returns to its previous range.

---

## Amendment — 30 August 2026: ambient motion returns to phones

- Status: Accepted
- Risk class: R2
- Approved by: OJ Florendo, 30 August 2026

### Context

The owner asked whether the trade this ADR records is still necessary, because
phones lose the site's motion. Re-reading the code clarified the question. The
hero fallback was never static — `.dc-ring` spins on 18s/28s/44s and `.dc-core`
pulses on 6s, on every device. The one genuinely static surface on phones was
the site-wide background standing in for the particle wave.

### Decision

The decision above is unchanged: phone-sized viewports still mount no WebGL, the
three.js chunk is still never requested, and `useSceneEnabled()` is untouched.

The ambient background is now split across `body::before` and `body::after`, one
gradient each, and on `max-width: 767px` with `prefers-reduced-motion:
no-preference` each layer drifts on a long, out-of-phase cycle (44s and 61s,
opposing directions).

Constraints the implementation holds to:

- **Transform only.** `background-position` would repaint a full-viewport layer
  every frame; `filter` and `opacity` cost more still. A composited translate
  costs the main thread nothing, which is the whole point on this device class.
- **Constant scale.** The base `scale(1.12)` is overscan that keeps the layer
  covering the viewport at maximum drift. It never animates, so the gradients
  never change size or peak brightness. The motion is drift, not brightness —
  which is what the owner's astigmatism constraint requires: no new bright
  points, no additive blending, no bloom.
- **Phones only.** Above the breakpoint the particle wave renders at `z-index:
  -1`, above these layers, so animating there would spend GPU on something no
  visitor can see. The breakpoint deliberately matches `COMPACT_QUERY`.

Nothing rejected in the original ADR is revisited. In particular the
`requestIdleCallback` deferral remains rejected on its measured evidence.

### Coverage added

The mobile gate had no automated test; a refactor could have re-enabled WebGL on
phones silently. `e2e/home.spec.ts` now asserts zero `<canvas>` at 390x844 and a
non-zero count at 1440x900, so the gate fails loudly in both directions.

### Consequences

Measured on 30 August 2026, Lighthouse 13.4.1, mobile preset, local production
build. Rather than compare against the baseline recorded a month earlier on a
machine that swings 52-85 run to run, both states were measured in the same
session, on the same server, back to back:

| Mobile, best-of-5 | Performance | TBT |
| --- | --- | --- |
| Control (animation reverted) | 93, 93, 93, 93, 90 | 18-42 ms |
| **Shipped (animation on)** | **93, 93, 93, 93, 91** | 22-95 ms |

The distributions are indistinguishable and the 90+ target holds. Accessibility,
Best Practices and SEO stayed at 100 and CLS at 0.000 across all five shipped
runs. TBT ranged higher on two shipped runs (95 ms, 70 ms) than on any control
run; the Performance score did not move and every value sits far below the
200 ms threshold, so this is read as host CPU contention across fifteen
consecutive runs rather than a cost of the animation — a composited transform
does not touch the main thread. It is recorded here rather than omitted.

The decisive evidence is not the score. A Chrome DevTools trace of five seconds
of steady-state animation at 390x844 recorded **Paint=0, Layout=0** (4 style
recalculations total, none per-frame), confirming the drift is composited and
never repaints. Under `prefers-reduced-motion: reduce` the trace is 0 across the
board and `document.getAnimations()` is empty. At 1440x900 no ambient animation
exists at all, as intended.

A first pass drifted ~19 px over 44 s (~0.9 px/s). It measured perfectly and was
close to invisible, which would have satisfied every gate while failing the
request that prompted the change. Amplitude was raised to travel roughly 47 px
on a 390 px viewport; the performance evidence above is from the raised values.

### Rollback

Delete the `@media (max-width: 767px)` animation block in `src/app/globals.css`.
The layers return to static gradients, visually identical to the state before
this amendment. No JavaScript, no bundle change and no data to unwind.
