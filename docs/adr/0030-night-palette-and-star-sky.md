# ADR-0030: Night palette and a measured star sky on the home page

- Status: Accepted for the preview — owner direction of 13 and 14 October 2026
  (design canvas option A, the star prototype, and the build spec). Confirmed
  or revised at the owner's preview review.
- Date: 2026-10-14
- Owner: OJ Florendo
- Risk: R2. A continuous WebGL canvas returns to the public site under a
  measured budget. No API, provider, secret, data boundary, runtime origin or
  CSP change.
- Supersedes in part: [ADR-0010](0010-warm-portfolio-and-finite-motion.md)
  ("no continuous decorative canvas"), for the home page's star sky only; and
  the ADR-0003 rule of no WebGL on phones, for this engine only. The retired
  Digital Core and particle-wave renderers stay unmounted.
- Related: [ADR-0029](0029-public-identity-joseph-florendo.md) (identity).

## Context

ADR-0010 unmounted the earlier 3D hero and scenes after measurement showed
scroll cost, and recorded that no continuous decorative canvas is mounted. The
owner has since chosen a new direction for the Joseph Florendo rebrand: a black,
cinematic look with a dim, slowly flowing galaxy behind a simple, clear home
page, "not too bright", and a richer space journey on /about.

Bringing a canvas back is therefore a decision with a known cost, and it needs
its own budget and evidence rather than the earlier ADRs' assumptions.

## Decision

**D1 — One night palette for the public site.** Public pages render black
(`#000`), starlight text (`#eef1f7`, secondary `#a9afbf`) and star-gold actions
(`#f2c66d`), whatever the device setting or a saved theme. The tokens are
scoped to the public layout (`.jf-site`), so `/manage` keeps the shared theme
tokens and its own theme switcher; the public theme switcher is removed. The
public typeface is Archivo, self-hosted by `next/font` and loaded only by the
public layout. Inter and Barlow, used only by `/manage`, are no longer
preloaded on public pages.

**D2 — The home page's star sky.** A fixed WebGL canvas behind the home page
draws a sparse parallax field, a slowly turning galaxy behind the hero, and a
river of stars that flows from it down the page. It is written in plain WebGL
with no library. Every star moves in the vertex shader from random values fixed
at start-up, so the main thread sets a few uniforms and issues one draw call per
frame. Other public pages carry no canvas.

**D3 — The budget the engine must keep** (constants in
`src/components/stars/star-field.ts`, unit-tested):

| Item | Budget |
| --- | --- |
| Frame rate | at most 30 frames a second (motion is slow by design) |
| Backing store | device pixel ratio capped at 1.5 |
| Stars | 6,250 on wide screens; 2,460 below 768 px |
| Brightness | global 0.9; stars behind text blocks keep 15% of their light |
| Start | after `load` and an idle callback, so it never competes with first paint |
| Hidden tab | loop stopped; resumes on return |
| Reduced motion | one still frame, redrawn only on scroll or resize; no loop |
| No WebGL | the canvas stays black, like the page; content is unaffected |
| Bundle | its own lazy chunk; no chunk on the home page over 150 KB |
| Page | Lighthouse mobile performance ≥ 90; no main-thread long task attributable to the sky |

**D4 — Accessibility.** The canvas is `aria-hidden`, `pointer-events: none`
and behind all content. Text keeps its contrast because the sky is dim, text
blocks dim the stars behind them, and panels carry a dark fill. Content never
depends on the canvas.

**D5 — No outside code or prompts.** The engine is our own, ported from our own
2D prototype. raisedhand.ai and other references informed behaviour only; no
source, shader or asset was copied, and no MotionSites prompt was opened for it.

## Alternatives considered

- **three.js for the home sky.** Rejected for the home page: the library alone
  would exceed the 150 KB chunk limit the home tests enforce, for a scene that
  needs one program and one buffer. The /about journey may use the existing
  three.js dependency, loaded only on that route.
- **A static star image.** Cheapest, but it drops the "flowing" quality the
  owner asked for. It remains the reduced-motion presentation.
- **Keep light and dark themes for the public site.** A star sky on a light
  page contradicts the direction the owner chose; `/manage` keeps both themes.

## Security, privacy and operations

No new origin, request, cookie or storage. Shaders are compiled from strings in
the bundle; WebGL needs no CSP change and no `unsafe-eval`. A lost WebGL context
stops the engine and leaves the page black.

## Verification — local preview, 14 October 2026

Measured on a local production build (`next build` and `next start`), Chromium
from Playwright on the owner's Windows laptop. These are local measurements and
do not establish real-phone smoothness.

- **Main thread, 4x CPU throttling** (`.claude/tools/measure-sky.mjs`, kept out
  of Git): 6 s idle and a 121-frame scroll through the page, sky running versus
  reduced motion. Desktop 1440 px and phone 390 px at 3x: 0 long tasks with the
  sky running in every window; scroll frame-gap p95 18 ms in all four runs.
- **Lighthouse 12.8.2 mobile, home page**, three runs: performance 96, 95, 95
  (median 95); accessibility, best practices and SEO 100; largest contentful
  paint 2.7–2.9 s; total blocking time 80–110 ms; layout shift 0. The first run
  before two fixes scored 81: Inter and Barlow were still preloaded on public
  pages, and framer-motion was loaded only for the mobile menu's entrance. Both
  were removed.
- **Bundle:** the engine chunk is 7.7 KB (3.3 KB gzip); scripts transferred on
  the home page fell from 198 KB to 152 KB with the two fixes.
- **Browser tests:** one decorative canvas, `aria-hidden`, fixed and
  pointer-transparent, `running` after load at 390 and 1440 px; `paused` in a
  hidden tab and `running` again on return; `still` under reduced motion with
  no document animations; no canvas on /blog or case studies; axe clean on the
  home page at both widths and with light or dark device settings.

Still to verify: owner review on a real phone and laptop through the private
Vercel preview, and the GPU cost on a low-end phone, which these tools do not
measure.

## Rollback

Remove `<StarSkyLazy />` from the home page to drop the sky without touching
anything else, or revert the commit through a reviewed pull request. Do not
rewrite history.
