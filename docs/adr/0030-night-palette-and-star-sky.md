# ADR-0030: Night palette and measured star scenes (home sky, About journey)

- Status: Accepted for the preview — owner direction of 13 and 14 October 2026
  (design canvas option A, the star prototype, and the build spec). Confirmed
  or revised at the owner's preview review.
- Date: 2026-10-14
- Owner: OJ Florendo
- Risk: R2. Continuous WebGL canvases return to the public site under a
  measured budget. No API, provider, secret, data boundary, runtime origin or
  CSP change.
- Supersedes in part: [ADR-0010](0010-warm-portfolio-and-finite-motion.md)
  ("no continuous decorative canvas"), for these two scenes only; and the
  ADR-0003 rule of no WebGL on phones, for these scenes only. The retired
  Digital Core and particle-wave renderers stay unmounted.
- Related: [ADR-0029](0029-public-identity-joseph-florendo.md) (identity).

## Context

ADR-0010 unmounted the earlier 3D hero and scenes after measurement showed
scroll cost, and recorded that no continuous decorative canvas is mounted. The
owner has since chosen a new direction for the Joseph Florendo rebrand: a black,
cinematic look with a dim, slowly flowing galaxy behind a simple, clear home
page, "not too bright", and a cinematic space journey on /about that is our own
rather than a copy of the reference site.

Bringing canvases back is therefore a decision with a known cost, and it needs
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
river of stars that flows from it down the page, keeping to the right on wide
screens where the left-aligned headings leave the sky open.

**D3 — The About journey.** A second fixed canvas behind /about is a true 3D
scene: a perspective camera flies along a corridor of stars with one anchor per
stage of the page (arrival, origin, teaching, building, experience, now,
credentials). At arrival, stars assemble into the owner's name; between stages
the camera warps forward and the stars streak; at the Building stage four small
systems fly in and settle into orbit around a planet made of gold stars, "the
planet of running work". While the scene draws the name, the real h1 is
visually hidden but stays in the accessibility tree; without the scene it is
painted normally. No rocket, satellite-around-the-name, constellation-job or
reticle-cursor signature from the reference site is used.

Both scenes are plain WebGL with no library, and every point moves in the vertex
shader from values fixed at start-up, so the main thread sets a few uniforms and
issues one or two draw calls per frame. No other public page has a canvas.

**D4 — The budget both scenes keep** (constants in
`src/components/stars/star-field.ts` and `src/components/about/journey-scene.ts`,
unit-tested):

| Item | Budget |
| --- | --- |
| Frame rate | at most 30 frames a second (motion is slow by design) |
| Backing store | device pixel ratio capped at 1.5, and at most 4 million pixels |
| Points | home 6,250 wide / 2,460 below 768 px; About 8,080 wide / 3,780 below 768 px |
| Brightness | home 0.9, with stars behind text blocks keeping 15% of their light; About 0.9, 0.72 on phones |
| Start | after `load` and an idle callback, so it never competes with first paint |
| Hidden tab | loop stopped; resumes on return |
| Reduced motion | one still frame, redrawn only on scroll or resize; no loop |
| Software renderer | no scene at all, as without WebGL (see D5) |
| No WebGL | the canvas stays black, like the page; content is unaffected |
| Bundle | each scene its own lazy chunk; no chunk on the home page over 150 KB |
| Page | Lighthouse mobile performance ≥ 90 on home and /about |

**D5 — Software renderers get no scene.** When WebGL is drawn on the CPU
(SwiftShader, llvmpipe, Microsoft Basic Render: virtual machines, remote
desktops, machines whose GPU driver is blocked), the scenes do not draw, exactly
as without WebGL. Measured on this laptop, the home sky animated in software at
12 frames a second cost about 27% of one CPU core, against about 1% for a still
frame; compiling the shaders on the CPU is also the costliest single step. A
decoration is not worth that on a machine that is already rendering in software.

**D6 — Accessibility.** The canvases are `aria-hidden`, `pointer-events: none`
and behind all content. Text keeps its contrast because the scenes are dim,
text blocks dim the home sky behind them, panels carry a dark fill, and the
About content keeps to the left while the planet sits to the right. Content
never depends on a canvas.

**D7 — No outside code or prompts.** Both scenes are our own, ported from our
own 2D prototype. raisedhand.ai and aahana-surya.github.io informed behaviour
only; no source, shader or asset was copied, and no MotionSites prompt was
opened.

## Alternatives considered

- **three.js or React Three Fiber.** Already dependencies, and the build spec
  suggested them for /about. Rejected for both scenes: the library alone would
  exceed the 150 KB chunk limit the home tests enforce, and the scenes need only
  points, lines and two matrices, which the existing `src/components/webgl/gl.ts`
  helpers already provide.
- **A static star image.** Cheapest, but it drops the "flowing" quality the
  owner asked for. It remains the reduced-motion presentation.
- **Run the software-renderer case at a lower frame rate.** Tried first (12 fps,
  compact counts); it still cost about a quarter of a core, so D5 chose no scene.
- **Keep light and dark themes for the public site.** A star sky on a light
  page contradicts the direction the owner chose; `/manage` keeps both themes.

## Security, privacy and operations

No new origin, request, cookie or storage. Shaders are compiled from strings in
the bundle; WebGL needs no CSP change and no `unsafe-eval`. A lost WebGL context
stops a scene and leaves the page black.

## Verification — local preview, 14 October 2026

Measured on local production builds (`next build` and `next start`) with
Chromium from Playwright on the owner's Windows laptop (22 logical cores). These
are local measurements and do not establish real-phone smoothness. Headless
Chromium renders WebGL in software, so it does not show GPU behaviour.

- **Main thread, 4x CPU throttling** (`.claude/tools/measure-sky.mjs`, kept out
  of Git): 6 s idle and a 121-frame scroll, with the scenes forced on by
  reporting a hardware renderer, so they were drawn in software, a worst case.
  - Home sky, before D5: 0 long tasks on desktop 1440 px and phone 390 px at 3x;
    scroll frame-gap p95 18 ms.
  - Final build: phone home and About, 0 long tasks, p95 20–22 ms. Desktop home,
    one long task while scrolling (137 ms), p95 26 ms. Desktop About, four long
    tasks while idle (up to 91 ms) and two while scrolling (up to 80 ms), p95
    38 ms. Reduced-motion runs on desktop also showed scroll long tasks (66 ms
    on home, 114 ms on About), which points to software rendering and machine
    noise as much as to the loop. GPU cost on a real phone is not measured.
- **CPU per page** (`.claude/tools/cpu-sky.mjs`): with software rendering the
  home sky animated at 12 fps used 27% of a core and the About scene 27%;
  still frames 0.1–1.3%. This led to D5.
- **Lighthouse 12.8.2 mobile**, five runs each on the final build: home
  performance 90, 91, 93, 94, 93 (median 93); About 91, 92, 92, 92, 90
  (median 92); accessibility, best practices and SEO 100; layout shift 0;
  largest contentful paint about 3.0 s (home) and 3.3 s (About). Headless
  Lighthouse renders WebGL in software, so under D5 these runs score the pages
  without the scenes. Earlier three-run sets on the same laptop ranged from 76
  to 96 with identical code, so single runs here are not reliable. The first
  home run, before two fixes, scored 81: Inter and Barlow were still preloaded,
  and framer-motion was loaded only for the mobile menu's entrance. Both were
  removed.
- **Bundle:** the home sky chunk is 7.7 KB (3.3 KB gzip); scripts transferred on
  the home page fell from 198 KB to 152 KB with the two fixes.
- **Impeccable detect** on the built pages: About no findings; home one
  line-length warning on the services note, fixed.
- **Browser tests:** each scene is one decorative canvas, `aria-hidden`, fixed
  and pointer-transparent, and `running` with a hardware renderer; the home sky
  is `paused` in a hidden tab and `running` again on return; both are `still`
  under reduced motion with no document animations, and `off` on a software
  renderer; the About name stays the page's h1 while the stars draw it and is
  painted without JavaScript or without the scene; no canvas on /blog or case
  studies; axe clean on home and /about at both widths. The tests that run a
  scene keep a small viewport: drawn in software at full size, they starved the
  rest of the parallel suite until page loads timed out.

Still to verify: owner review on a real phone and laptop through the private
Vercel preview, and GPU cost on a low-end phone.

## Rollback

Remove `<StarSkyLazy />` from the home page or `<AboutSkyLazy />` from /about to
drop a scene without touching anything else, or revert the commit through a
reviewed pull request. Do not rewrite history.
