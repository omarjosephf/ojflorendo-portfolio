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
