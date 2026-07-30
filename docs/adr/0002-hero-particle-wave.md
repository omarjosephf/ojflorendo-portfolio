# ADR-0002: Hero particle wave as a second WebGL scene

- Status: Proposed
- Date: 2026-07-30
- Owner: OJ Florendo

## Context

The owner asked for the "particle wave" background published on 21st.dev
(`easemize/particle-wave`) to be added behind the hero, via
`npx shadcn@latest add "https://21st.dev/r/easemize/particle-wave"`.

Two facts made that command unsuitable as issued:

1. The registry endpoint is authenticated. `GET https://21st.dev/r/easemize/particle-wave`
   returns HTTP 403 `{"error":"Authentication required"}`, so the CLI cannot
   resolve it without a 21st.dev API key — and the source could not be reviewed
   before installation, which §25 requires.
2. This repository is not a shadcn project. There is no `components.json`, no
   `src/lib/utils.ts`, and none of `clsx`, `tailwind-merge` or
   `class-variance-authority`. `shadcn add` would first run `init`, which on
   Tailwind v4 rewrites `src/app/globals.css` — the design-token source — and
   adds a config file plus dependencies to a live production repository.

The published component is built on three.js, which the project already ships
(`three`, `@react-three/fiber`, `@react-three/drei`) for the Digital Core. The
effect was therefore reproducible with no new dependency.

The hero already hosts one WebGL canvas, so adding a background scene is a
performance-posture decision under §20.1 ("alters the 3D scene").

## Decision

Implement the effect natively as `src/components/three/ParticleWave.tsx`:

1. A flat point grid displaced entirely in a GLSL vertex shader from a single
   `uTime` uniform. Per-frame CPU cost is a few uniform writes regardless of
   particle count; the geometry uploads once and draws in one call.
2. ~11.7k points on desktop, ~5.4k on compact viewports.
3. The same performance controls as the Digital Core: `frameloop="demand"`
   throttled to 30fps desktop / 24fps compact, DPR capped at 1 (compact) and 1.5
   (desktop), no antialiasing, no post-processing, no shadows, and the loop
   stopped entirely when the hero is off-screen or the tab is hidden.
4. Decorative only: `aria-hidden`, `pointer-events: none`, and the pointer
   position is read from `window` so the canvas never intercepts hero controls.
5. Under `prefers-reduced-motion: reduce` a single static frame renders and the
   pointer listeners are never attached.
6. Mounted only where WebGL exists. The static `.hero-wave` gradient underneath
   is the no-JS / no-WebGL state, masked at both edges so the wave never
   competes with the hero heading.
7. The field is stretched horizontally to the viewport's aspect ratio at
   runtime, with a lateral alpha fade as a safety net. A fixed-width plane
   showed its straight lateral edges on 16:9 and ultrawide desktops and on
   phones held in landscape; sizing to the frustum removes that at any aspect,
   and recomputing on resize covers device rotation.
8. `webglcontextrestored` triggers a re-render. Mobile browsers drop WebGL
   contexts under memory pressure; three re-initialises the renderer, but a
   demand-rendered canvas must also be asked for a frame or it returns blank.

`FrameLimiter`, `useSceneActive` and `useCompactViewport` were extracted from
`DigitalCore.tsx` into shared modules so the throttling policy is defined once
rather than copied.

## Alternatives considered

- **Run the shadcn CLI as issued.** Rejected: authentication-gated, unreviewable
  before install, and `init` would rewrite `globals.css` and add dependencies.
- **Port the published source by hand.** Viable if the owner supplies the code
  or an API key, but it would still need the same accessibility and performance
  hardening, and it adds third-party licensing to record for no visual gain.
- **One shared canvas via drei `<View>`.** Removes the second WebGL context, but
  requires refactoring the working Digital Core and scissor-tracking two DOM
  regions. Rejected as disproportionate regression risk for the current scale;
  it remains the upgrade path if context cost becomes a problem.
- **CSS-only gradient.** Already present as the fallback, but it cannot produce
  the wave motion that was asked for.
- **Replace the Digital Core.** Rejected by the owner; both scenes are kept.

## Security and privacy impact

None. No new dependency, no new network origin, no CSP change — GLSL is passed
to the WebGL driver as a string, never evaluated as JavaScript, and React
applies canvas styles through CSSOM rather than a `style` attribute, so the
nonce policy is unaffected. No personal data, storage or telemetry.

## Accessibility and performance impact

Accessibility: decorative and non-interactive, outside the accessible tree, no
keyboard trap, and a complete static experience under reduced motion. Verified:
axe clean on desktop and mobile, and hero CTAs remain clickable (regression test
in `e2e/home.spec.ts`).

Performance: the homepage now creates two WebGL contexts. Both are
demand-rendered, frame-capped and paused off-screen, and the incremental
JavaScript is small because three.js and R3F were already in the bundle. The
cost is real but bounded, and it applies only to the homepage hero.

## Operational impact

None. No environment variable, route, header or deployment change.

## Cross-browser and cross-device verification

Verified against the production build served over HTTPS (a local self-signed
proxy, so the production CSP applies unmodified), in all three engines —
Chromium, Firefox and WebKit/Safari — across eight viewports: 1920×1080,
2560×1080 ultrawide, 1440×900, 720×450 (equivalent to 200% zoom on a laptop),
1024×1366 iPad portrait, 390×844 phone portrait, 844×390 phone landscape and
320×568. Each combination checked for console/page errors, `securitypolicyviolation`
events, horizontal overflow, canvas creation, and that the hero CTA still
receives its own clicks.

Result: **24/24 combinations render the wave with no horizontal overflow and no
click interception.** `ALIASED_POINT_SIZE_RANGE` is 1–1023 (Chromium) and 1–1024
(Firefox/WebKit), far above the ~7 CSS px this scene requests, so point sizing is
safe on constrained GPUs.

Two environment-specific artefacts were identified and excluded, each confirmed
by a control rather than assumed:

- Serving the production build over plain HTTP makes WebKit apply
  `upgrade-insecure-requests` to `localhost` and fail every subresource (15 of 15
  requests rewritten to `https://`). Chromium and Firefox exempt localhost.
  Production is HTTPS, where the directive is a no-op.
- The dev server emits ~17 CSP style errors in every engine. The control was the
  case-study route, which contains no 3D content and emits the same count, so
  these belong to Next's dev pipeline, not this scene.

## Consequences and trade-offs

- Two WebGL contexts on the homepage rather than one.
- Running the local Playwright suite at default parallelism (11 workers) is
  heavier than before. This does not affect CI, which already runs
  `workers: 1` (`playwright.config.ts`).
- **Known limitation (cosmetic, WebKit only).** Safari's engine intermittently
  logs `Refused to apply a stylesheet because its hash, its nonce, or
  'unsafe-inline' does not appear in the style-src directive`. Measured at 3 of
  16 WebKit page loads during loaded full-matrix runs and 0 of 20 in isolation;
  pristine `main` showed 0 of 8. No `securitypolicyviolation` event is dispatched,
  and screenshots of the affected loads are fully styled — verified computed
  background, heading font and control radii all correct, with the real
  stylesheet applying 107 rules. It appears to be React/Next re-inserting an
  already-applied stylesheet link without a nonce, which the extra dynamic chunk
  makes marginally more likely by shifting load timing; this scene adds no inline
  styles and no runtime stylesheet insertion of its own. CSP is failing *closed*
  here, so the policy is deliberately left unchanged — §23 forbids weakening CSP
  to silence a message.

## Rollback or migration

Remove `<ParticleWaveLazy />` from `src/components/sections/Hero.tsx` — one line.
The static `.hero-wave` gradient remains and the hero degrades to its previous
appearance with no other change.

## Related decisions

- `docs/adr/0000-handbook-adoption.md`
- Handbook §17 (styling), §19.1 (motion and 3D), §20.1 (performance regression
  review), §25 (supply chain).
