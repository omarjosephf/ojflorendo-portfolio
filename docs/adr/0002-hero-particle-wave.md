# ADR-0002: Site-wide particle-wave background

- Status: Proposed
- Date: 2026-07-31
- Owner: OJ Florendo

## Context

The owner asked for the "particle wave" background published on 21st.dev
(`easemize/particle-wave`), via
`npx shadcn@latest add "https://21st.dev/r/easemize/particle-wave"`.

Two verified facts made that command unsuitable as issued:

1. The registry endpoint is authenticated. `GET https://21st.dev/r/easemize/particle-wave`
   returns HTTP 403 `{"error":"Authentication required"}`, so the CLI cannot
   resolve it — and the source could not be reviewed before installation, which
   §25 requires.
2. This is not a shadcn project. There is no `components.json`, no
   `src/lib/utils.ts`, and none of `clsx`, `tailwind-merge` or
   `class-variance-authority`. `shadcn add` runs `init` first, which on
   Tailwind v4 rewrites `src/app/globals.css` — the design-token source — and
   adds config and dependencies to a live repository.

The published component is built on three.js, which the project already ships
(`three`, `@react-three/fiber`, `@react-three/drei`) for the Digital Core, so the
effect was reproducible with no new dependency.

The scope grew during owner review. The background was asked to run consistently
down the whole page rather than only the hero; the owner then reported visible
stutter while scrolling, the water sitting as a band floating in mid-screen
rather than running off the bottom edge, and the motion drifting faster and
slower. The owner also reads with astigmatism, for which small bright
high-contrast points on a dark field are a specific problem.

## Decision

Implement natively as `src/components/three/ParticleWave.tsx`, mounted once in
the root layout as a **fixed, viewport-sized layer behind all content**.

1. A flat point grid displaced entirely in a GLSL vertex shader from a single
   `uTime` uniform. Per-frame CPU cost is a few uniform writes regardless of
   particle count; the geometry uploads once and draws in one call.
2. **Fixed, not scrolling.** A performance decision as much as a visual one: a
   fixed layer never moves relative to the viewport, so scrolling cannot force it
   to re-rasterise, and the scene needs no element measurement.
3. **Confined to the lower half** of the viewport in screen space, dissolving by
   the midpoint. Screen space rather than camera framing, so the band lands
   identically on every viewport shape, and the upper half — where most reading
   happens — stays clear.
4. **The field extends past the bottom edge of the frustum.** With the camera at
   y=3.4 and a 55° vertical FOV, the ray through the bottom of the screen meets
   the water at world z ≈ 4.93; the plane's near edge must clear that. Asserted
   by unit test, not left to inspection.
5. **Animation advances on wall-clock time**, never on frame deltas.
6. Performance budget: DPR pinned to 1, ~8.6k points desktop / ~5.7k compact in a
   single draw call, no antialiasing, no post-processing, no shadows, demand
   rendering at 20–24fps, loop stopped when the tab is hidden, and a single
   static frame under `prefers-reduced-motion`.
7. **Frame phases are interleaved.** The wave and the Digital Core render at the
   same rate on opposite phases, so no single animation frame pays for both.
8. Visually restrained: normal (not additive) blending, low opacity, wide soft
   point falloff.
9. Decorative only: `aria-hidden`, `pointer-events: none`, pointer read from
   `window`, so it can never intercept a control.
10. Mounted only where WebGL exists; the static `body::before` glow is the
    no-JS / no-WebGL state.

`FrameLimiter`, `useSceneActive`, `useCompactViewport` and `hasWebGL` were
extracted into shared modules so the scene throttling policy is defined once.
The framing maths lives in `wave-geometry.ts`, free of three.js and React, so it
is unit-testable directly.

## Defects found and fixed during review

Each was diagnosed against a measured baseline rather than assumed:

- **Scroll jank (severe).** The first version measured 15–18fps with 2.8–4.1s of
  long tasks during a 6s scroll, against 58–60fps on unmodified `main`. Three
  causes: `getBoundingClientRect()` in a scroll listener (forced synchronous
  layout on every scroll event); a CSS-masked layer wrapping a live canvas that
  had to re-rasterise as it moved; and excessive fill (DPR 1.5, 12.8k points).
  All three are removed by the fixed-layer design, the shader-side fade, and the
  budget above.
- **Intermittent stutter.** The two scenes ran at 24 and 30fps, drifting in and
  out of phase; frames where both rendered paid double. Fixed by interleaving.
- **Inconsistent wave speed.** Animation accumulated the render delta clamped to
  50ms. At 24fps a frame is 41.7ms, so any late frame exceeded the clamp and the
  wave silently lost time, then ran true again — reading as speed drift. Both
  scenes now use wall-clock time. The same defect existed in the Digital Core's
  rotation and was fixed there too.
- **Lateral edges visible.** A fixed-width field showed straight edges at 16:9
  and ultrawide, and on phones in landscape. The field is now stretched to the
  viewport aspect at runtime, with a lateral alpha fade as a safety net.
- **Field stopped short of the bottom edge.** The near edge reached world z = 0.91
  (desktop) and −4.05 (compact) against the 4.93 required, leaving an empty strip
  and making the water read as floating. Fixed and pinned by test.
- **No WebGL context-loss recovery.** A demand-rendered canvas would return blank
  after a mobile context drop; `webglcontextrestored` now requests a repaint.

## Alternatives considered

- **Run the shadcn CLI as issued.** Rejected: authentication-gated, unreviewable
  before install, and `init` would rewrite `globals.css` and add dependencies.
- **Port the published source by hand.** Viable if the owner supplies the code or
  an API key, but it would need the same accessibility and performance hardening,
  and adds third-party licensing to record for no visual gain.
- **One shared canvas via drei `<View>`.** Would remove the second WebGL context
  outright. Interleaving the frame phases reached a locked 60fps without
  refactoring the working Digital Core, so this remains the upgrade path if
  context cost ever becomes a problem.
- **Keeping the wave hero-only.** Rejected by the owner, who asked for a
  consistent background across the whole page.
- **Dropping the Digital Core.** Offered and declined; CLAUDE.md §10 mandates it.

## Security and privacy impact

None. No new dependency, no new network origin, no CSP or header change — the
scene makes no network requests at all. GLSL is passed to the WebGL driver as a
string and is never evaluated as JavaScript; React applies canvas styles through
CSSOM rather than a `style` attribute, so the nonce policy is unaffected. No
personal data, storage, cookies or telemetry.

## Accessibility and performance impact

Accessibility: decorative and non-interactive, outside the accessible tree, no
keyboard trap; axe reports 0 violations on desktop and mobile. Reduced motion
renders a complete static frame. The lower-half confinement, normal blending, low
opacity and soft falloff are a deliberate response to the owner's astigmatism —
content is always the visual subject.

Performance, measured on an idle machine with a scripted scroll:

| | avg fps | p95 frame | jank frames | long-task time |
| --- | --- | --- | --- | --- |
| Unmodified `main` | 58–60 | 16.7ms | 0–1 | 0–73ms |
| First implementation | 15–18 | 150–200ms | 32–35 | 2793–4091ms |
| Shipped | **60** | **16.7ms** | **0** | **0ms** |

The homepage runs two WebGL contexts; both are demand-rendered, frame-capped,
phase-interleaved and paused when hidden. Incremental JavaScript is small because
three.js and R3F were already bundled.

## Cross-browser and cross-device verification

Verified against the production build served over HTTPS (a local self-signed
proxy, so the production CSP applies unmodified), in Chromium, Firefox and
WebKit/Safari, across eight viewports: 1920×1080, 2560×1080 ultrawide, 1440×900,
720×450 (200% zoom equivalent), 1024×1366 iPad portrait, 390×844 phone portrait,
844×390 phone landscape, and 320×568. Each combination checked for console and
page errors, `securitypolicyviolation` events, horizontal overflow, canvas
creation, and that hero controls still receive their own clicks.
`ALIASED_POINT_SIZE_RANGE` is 1–1023/1024 against the ~7 CSS px requested, so
point sizing is safe on constrained GPUs.

Two environment-specific artefacts were identified and excluded, each confirmed
by a control rather than assumed:

- Serving the production build over plain HTTP makes WebKit apply
  `upgrade-insecure-requests` to `localhost` and fail every subresource (15 of 15
  rewritten to `https://`). Chromium and Firefox exempt localhost; production is
  HTTPS, where the directive is a no-op.
- The dev server emits ~17 CSP style errors in every engine. The control was the
  case-study route, which contains no 3D content and emits the same count, so
  they belong to Next's dev pipeline.

## Operational impact

None. No environment variable, route, header or deployment change.

## Consequences and trade-offs

- Two WebGL contexts on the homepage rather than one.
- Every route now carries the background, including case studies. Measured at
  60fps with zero jank there too.
- Local Playwright at default parallelism is heavier than before; CI is
  unaffected as it already runs `workers: 1`.
- **Known limitation (cosmetic, WebKit only).** Safari's engine intermittently
  logs `Refused to apply a stylesheet…` — 3 of 16 WebKit page loads under load
  and 1 of 8 on the final run, 0 of 20 in isolation; pristine `main` showed 0 of
  8. No `securitypolicyviolation` event fires and affected loads are fully styled
  (verified computed background, fonts and control radii; the stylesheet applies
  107 rules). It appears to be React/Next re-inserting an already-applied
  stylesheet link without a nonce, which the extra dynamic chunk makes marginally
  more likely by shifting load timing; this scene adds no inline styles and no
  runtime stylesheet insertion. CSP is failing *closed*, so the policy is
  deliberately unchanged — §23 forbids weakening CSP to silence a message.

## Rollback or migration

Remove `<ParticleWaveLazy />` from `src/app/layout.tsx` — one line. The static
`body::before` glow remains and every page returns to its previous appearance
with no other change.

## Related decisions

- `docs/adr/0000-handbook-adoption.md`
- Handbook §17 (styling), §19.1 (motion and 3D), §20.1 (performance regression
  review), §23 (CSP), §25 (supply chain).
