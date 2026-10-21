# ADR-0030: Night palette and measured star scenes (home sky, About journey)

- Status: Accepted for the preview — owner direction of 13 and 14 October 2026
  (design canvas option A, the star prototype, and the build spec). Revised
  for the About journey after the owner's preview review of 15 October 2026
  (see "Revision, 15 October 2026"), for the home sky's river after the
  review of 20 October 2026 (see "Revision, 20 October 2026"), for the blog
  front page's sky the same day (see "Revision, 20 October 2026: the sky on
  /blog"), and for the galaxy feeding the streams after the owner's review of
  the blog page (see "Revision, 20 October 2026: the galaxy feeds the
  streams").
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
draws a sparse parallax field and a two-armed galaxy at the foot of the hero.
The galaxy's core turns slowly and its stars swirl outward along its arms; at
each arm's tip they pour off into a stream, which carries on in the arm's
direction and then bends down the page. The two streams braid down the whole
page at one shared pace, one crossing right to left while the other crosses
left to right, about once a screen (revised twice on 20 October 2026).

**D3 — The About journey.** A second fixed canvas behind /about is a true 3D
scene: a perspective camera flies along a corridor of stars with one evenly
spaced anchor per stage of the page (arrival, origin, teaching, building,
experience, skills, now, credentials) and one for the end of the page. The
camera moves whenever the reader scrolls, slowest in the middle of a stage and
quickest between stages, and the stars streak only when travel is fast. At
arrival, stars assemble into the owner's name, sampled from the h1's own
typeface with even spacing and outline-first placement so every letter keeps
its shape. Each later stage has its own landmark, framed mid-stage and passed
on the way to the next: a nebula with a young star (origin), a ringed planet
(teaching), the planet of gold stars with four systems settling into orbit,
"the planet of running work" (building; three gold for the live systems, one
pale for the one in progress), an asteroid belt round a small star
(experience), a star cluster (skills), a comet among three tumbling asteroids
(now) and a spiral galaxy (credentials, framed at the end of the page). On wide
screens the camera turns slightly left once it leaves the name, so the way
ahead and every landmark open to the right of the content column; on phones the
landmarks sit high, smaller and dimmer. The h1 is never painted as solid text
before the stars draw the name: it waits unpainted (in the accessibility tree)
until the scene reports, and is painted at once when no scene can run, without
JavaScript, in forced colours, or after a 4-second fallback. No rocket,
satellite-around-the-name, constellation-job or reticle-cursor signature from
the reference site is used.

Both scenes are plain WebGL with no library, and every point moves in the vertex
shader from values fixed at start-up, so the main thread sets a few uniforms and
issues one or two draw calls per frame. No other public page has a canvas.

**D4 — The budget both scenes keep** (constants in
`src/components/stars/star-field.ts` and `src/components/about/journey-scene.ts`,
unit-tested):

| Item | Budget |
| --- | --- |
| Frame rate | home: at most 30 frames a second. About: up to 60 while the camera travels or the name assembles, 30 once settled |
| Backing store | device pixel ratio capped at 1.5, and at most 4 million pixels |
| Points | home 8,850 wide / 3,360 below 768 px; About 19,840 wide / 8,420 below 768 px |
| Brightness | home 0.9, with stars behind text blocks keeping 15% of their light; About 1.0 on wide screens, where landmarks keep right of the text, and 0.85 on phones with everything but the name at 38%, where text spans the screen |
| Start | after `load` and an idle callback, so it never competes with first paint. On /about a one-off WebGL probe runs at hydration, so without a GPU renderer the h1 paints the name at once |
| Hidden tab | loop stopped; resumes on return |
| Reduced motion | one still frame, redrawn only on scroll or resize; no loop |
| Software renderer | no scene at all, as without WebGL (see D5) |
| No WebGL | home: the canvas stays black, like the page. About: no canvas, and the h1 paints the name. Content is unaffected |
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

## Revision, 20 October 2026: the galaxy feeds the streams

On reviewing the blog front page, the owner found that the river of stars
"doesn't make sense where the flow of dust is coming from": it started inside
the galaxy but was not joined to its arms, and on the home page the galaxy sat
in a 64-pixel gap between the hero text and the example card, so neither end
of the river could be seen. He asked for a galaxy that turns slowly, with the
ends of its strands flowing down in a spiral from left to right and right to
left, on the blog and behind Services alike. The changes, all in D2:

1. **Two arms that feed two streams.** The galaxy has two arms (was three).
   Their shape holds still while their stars swirl outward along them at the
   streams' pace, and the core turns as before. At each arm's tip the stars
   pour off into a stream that carries on in the arm's own direction, then
   bends into a lane. The two lanes mirror each other, so the streams cross
   below the galaxy and braid down the page, one crossing right to left while
   the other crosses left to right, about once a screen. The single twisting
   ribbon is gone.
2. **The galaxy moves to the foot of the hero** (on the blog, the foot of the
   header), so both arm tips sit in open sky, and it is smaller (radius 27% of
   the width, at most 420 pixels; 28% on phones) so both tips stay on screen.
   On phones it now appears after the hero's example card instead of behind
   the name, where the hero text dimmed it.
3. **The same point totals** (D4: 8,850 wide, 3,360 on phones), moved from
   the galaxy to the streams, which now share them: the galaxy 2,200 and the
   streams 6,000 (900 and 2,200 on phones). Stream stars are brighter and a
   smaller share of them (22%, was 32%) is haze. A short page draws only as
   many stream stars as keep each stream to 0.4 stars a pixel, so the blog's
   streams are no denser than the home page's.

Frame rate, pixel ratio, the hidden-tab stop, the reduced-motion still frame,
the software-renderer rule and the lazy chunk are unchanged. Unit tests check
that each stream starts at its arm's tip in the arm's direction, that the
lanes mirror and cross, that both tips stay on screen from 390 to 1920 pixels
wide, and that no stream exceeds the density cap.

Measured on a local production build the same day: the 17 gate stages run one
by one, with stage 1 failing only on the sharp and source-map-js advisories
(#119) and stages 2–17 exiting 0 (1,076 unit tests, 111 portfolio and 50
management browser tests); Lighthouse 12.8.2 mobile, three runs each, home
95, 92, 95 (median 95) and `/blog` 91, 94, 94 (median 94), with
accessibility, best practices and SEO 100 in every run. GPU cost on a low-end
phone is still not measured.

## Revision, 20 October 2026: the sky on /blog

D3's "no other public page has a canvas" no longer holds for one page: the
blog front page now carries the home page's star sky, by the owner's decision
recorded in [ADR-0027](0027-blog-showcase-front-page.md) D9. It is the same
canvas and the same budget (D4), unchanged: `StarSky` only gained two settings,
the element the galaxy sits behind and the blocks the stars dim behind, whose
defaults are the home page's. On `/blog` the galaxy sits behind the header and
the cards dim the stars behind them. Post pages, case studies and every other
public page still have no canvas, and the browser tests check both.

## Revision, 20 October 2026 (owner preview review, home sky)

The owner found the home river messy behind the Services section and asked
for it to spiral down the page from right to left and back. Each river star
had its own speed and its own sideways sway, so the stars drifted out of step,
and the river stayed in the right-hand 52–88% of the width. Now every river
star moves at one slow pace (12 pixels a second, after the owner asked for
slower and smoother movement), the path crosses the whole width about once a
screen and turns at the edges, and the ribbon twists slowly, with its stars
gathered at the two edges so they read as two strands winding round each
other (D2). A third of the river is fine dust in a soft haze around the
ribbon, and river stars shimmer gently instead of twinkling. At the owner's
request for more stars, the river has 5,000 points on wide screens and 1,800
on phones, up from 2,400 and 900 (D4).

Where the Services panel and its rows fill the width, the ribbon still passes
behind them at 15% of its light, so there the change shows mostly at the
screen's edges and between blocks. Checked on a local production build with
screenshots at 1440 and 390 pixels wide (simulated GPU). Lighthouse has not
been re-run for this revision.

## Revision, 15 October 2026 (owner preview review)

The owner reviewed the About journey on 15 October 2026 and asked for four
changes, all made in D3 and D4 above:

1. **No solid name first.** The solid h1 showed for a moment before the stars
   assembled. The h1 now waits unpainted until the scene reports (see D3).
2. **Letters that keep their shape.** The stars were sampled from the body
   face at random, so thin parts such as the bar of the "e" and the last "o"
   came out ragged. Sampling now reads the h1's own family, weight, width,
   tracking and line height, keeps a minimum distance between stars, and fills
   the letter outlines first. The camera looks dead straight at the name.
3. **Something to see at every stop, and smoother travel.** The camera used
   to hold still for most of a stage and then warp; between stops nothing was
   in view after the planet. It now moves continuously with scrolling, and
   every stage has its own landmark (D3). Skills became a stage of its own.
   The frame cap rises to 60 only while the camera travels, which is what made
   motion look stepped at 30.
4. **More visible.** The planet, galaxy and every new landmark are brighter
   and nearer than the old planet and galaxy; far landmarks fade in nearer
   than corridor stars, so the next one never crowds the current view.

The point budget roughly doubles (D4). Software renderers still get no scene
(D5), so the extra points and frames cost only on a GPU, where they are drawn
in one call; GPU cost on a low-end phone is still not measured.

Start-up is kept off the main thread's critical path: the name sampling
yields between passes, both shader programs link in the background where
KHR_parallel_shader_compile is offered, and the hidden h1 keeps its place in
the layout, so starting the scene shifts nothing.

**Measured, 15 October 2026** (local production builds, the owner's laptop):

- Gate on the working tree: stage 1 fails only on the sharp and source-map-js
  advisories (#119); stages 2–17 exit 0, including 1,027 unit tests, 101
  portfolio and 50 management browser tests.
- Lighthouse 12.8.2 mobile on /about, five runs alternating with the previous
  build (`76c90c3`) on the same machine: this revision 93, 83, 79, 93, 93
  (median 93); previous build 91, 90, 92, 89, 91 (median 91). Accessibility,
  best practices and SEO 100; layout shift 0 in all five runs. Two runs of
  this revision had one 475–656 ms task under Lighthouse's simulated 4x CPU;
  ten profiled loads with the long-animation-frame API (four at a real 4x CPU
  throttle, six unthrottled) showed no long frame from the scene, so its
  source is unexplained.
- **Correction to the 14 October note below:** headless Lighthouse on this
  laptop draws WebGL on the GPU (ANGLE, Direct3D 11), and its final screenshots
  show the star scene in both builds. Those runs therefore scored the pages
  with the scenes, not without them.

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
