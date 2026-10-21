# ADR-0027: Blog showcase front page

- Status: Accepted for the preview — owner approval of the build spec on
  20 October 2026 ("I approve the blog showcase spec, including your technical
  choices in section 6"). It launches with the Joseph Florendo redesign, after
  phase 15a. Phase 18.6 adds its own revision here for the post-page journal.
- Date: 2026-10-20
- Owner: OJ Florendo
- Risk: R2. A star canvas on a third public page, under ADR-0030's unchanged
  budget, and a new post format version, a data contract the writing agents
  also use. No API, provider, secret, database, runtime origin or CSP change.
- Amends: the [phase 18.6–18.7 plan](../roadmaps/blog-journal-and-figures.md)
  (the front page moves to the redesign; the journal's new blocks become post
  format version 3; the live post's byline changes);
  [ADR-0030](0030-night-palette-and-star-sky.md) D3 ("no other public page has
  a canvas"), by its revision of 20 October 2026.
- Related: [ADR-0029](0029-public-identity-joseph-florendo.md) (identity),
  [ADR-0026](0026-gemini-first-blog-agent-models.md) (the writing agents),
  [blog pipeline threat model](../threat-models/blog-live-pipeline.md).

## Context

The blog's front page was a plain numbered list from phase 18.1, in the old
warm look. The Joseph Florendo redesign moved every other public page to the
night look (ADR-0030), and the owner approved a "proof-first journal" for the
blog on 30 September (phase 18.6), whose front-page ideas were one featured
post and cards that give each post's result in one sentence.

On 20 October the owner asked for a showcase front page in the night look and
answered eleven interview questions. Two of the answers change a data
contract: every post needs a type for its label, and the live post's byline
moves to the new name. Both touch the post format that the writing agents
(`src/lib/blog/live/`) still write, and an open pull request (#120) is changing
those agents' files.

## Decision

**D1 — The page.** `/blog` shows the label "Blog", one `h1` ("Notes from
building AI automation.") and the intro ("What I build, how I test it, and what
I learn, written up as I go."). Below it, the owner's featured post is one
large card: on wide screens its picture fills the left half, and the right half
holds the "Featured" label, the title (`h2`), the excerpt, and "By Joseph
Florendo", the date and the type label. A row of the three newest other posts
follows (picture, title as `h3`, excerpt, type label), then every older post as
a plain list (title, date, type), so no post is ever hidden. With one post,
only the featured card shows. Each card is one link, named by its title: the
title's link stretches over the whole card, and keyboard focus draws a ring
round the card. The featured card has two columns from 1024 px, the row three
cards; from 768 to 1023 px the featured card stacks and the row holds two; below
768 px everything stacks, and the featured title shows on the first screen at
390 × 844.

**D2 — The featured choice** lives in `src/data/blog-showcase.ts`. A unit test
fails the build if it is not a published post; with `null`, the newest post is
featured. There is no database table, runtime API or new service.

**D3 — Post types and labels.** Every new post has one type: **Case study**,
**Build notes** or **Explainer**. The label is a small pill with a dark fill and
a coloured border and text: star-gold `#f2c66d`, ice blue `#9ecbff` and lilac
`#c8b8ff`, each at least 4.5:1 on the fill (unit-tested). The word is always
shown, so meaning never rests on colour. Post pages add the label to their meta
line and otherwise keep today's layout and no canvas.

**D4 — Post format version 2.** Version 2 is version 1 plus a required
`postType` and an optional `cover`, with the author locked to
`{ name: "Joseph Florendo", url: "/about" }`. Unknown fields are still
rejected. **Version 1 is unchanged**, including its locked author "OJ
Florendo", because the live writing agents still write version 1 drafts and
`promoteRun` checks them with the same parser. No file under
`src/lib/blog/live/` or `src/lib/blog/pipeline/` changes, and every existing
schema and pipeline test passes untouched. A version 1 post still renders, with
its stored author and no type label. The post-page journal blocks planned for
phase 18.6 therefore become **version 3**.

**D5 — The live post moves to version 2.** "Why Automated Evaluation of RAG
Needs Refusal Tests, Not Just Accurate Answers" becomes an **Explainer** and the
featured post. Its byline and its disclosure say "Joseph Florendo" instead of
"OJ Florendo", in both places. Nothing else changes: the blocks, the quotes
from the source notes (for example "Cited is OJ's document-assistant demo."),
the sources and their publisher, the SEO fields and `publishedAt` are
byte-for-byte as approved, and `updatedAt` stays `null` because the article's
content did not change. The owner approved this name change to a published
post in the interview (answer 6); it amends, for the name only, the 18.6 plan's
rule that "the live post's approved text is unchanged". The edit is recorded
here and in Git history.

**D6 — Star pictures.** Each post gets its own star scene, drawn on the server
as inline SVG by `src/lib/blog/cover-scene.ts`: a generator seeded from the slug
makes it unique and identical on every build. One motif family per type, echoing
the About journey's landmarks but drawn fresh: a gold planet with systems in
orbit (case study), a comet among asteroids (build notes), a ringed planet in a
soft nebula (explainer). A version 1 post gets the star field alone. The scene
sits on the slightly lighter navy (`--color-surface`), so it reads as a framed
picture over the sky. There are no image files, image requests, inline style
attributes or new libraries, and no script reaches the reader for the drawing.
A featured picture has at most 250 shapes and a card at most 120 (unit-tested).
The pictures are decorative and hidden from assistive technology.

**D7 — One short move, never looped.** CSS keyframes play once for about
1.2 seconds: halos over chosen stars brighten in turn, and the ring tilts, the
orbits turn or the comet moves a few pixels and settles. The move plays on
hover, on keyboard focus within the card, and once when the picture first
scrolls into view, which a small client helper (`CoverMotion.tsx`, using
IntersectionObserver) marks with `data-seen`. With reduced motion there is no
animation and the picture shows finished; without JavaScript it is still until
hovered.

**D8 — Screenshots, later.** A version 2 post may name
`cover: { kind: "image", src, width, height, alt }` instead of a drawn picture.
`src` must be one WebP or PNG file directly under `/blog/covers/`, committed in
`public/blog/covers/`: the parser rejects outside URLs, other folders,
traversal, encodings and queries, and the post loader fails if the file is not
committed. It renders through `next/image` at its stated size with real alt
text, and each screenshot is reviewed against handbook §6.2 (tabs,
notifications, local paths, email addresses, secrets, personal data,
backgrounds) before it is committed. None exists yet.

**D9 — The sky on `/blog`.** The front page reuses the home page's star sky.
`StarSky` takes two settings, the element the galaxy sits at and the blocks
the stars dim behind, whose defaults are the home page's, so the home page does
not change. On `/blog` the galaxy sits at the foot of the header, between the
intro and the featured card, and its two streams pour down behind the cards
(ADR-0030, "Revision, 20 October 2026: the galaxy feeds the streams", which
changed the sky on both pages the same day at the owner's request). The intro
line, every card, the older list and the footer dim the stars behind them. The
large heading does not: the sky dims in straight-edged boxes, and a box round
the heading would cut through the galaxy, while the heading's large, bright
type stays clear over the dim stars. ADR-0030's budget is unchanged: at most 30
frames a second, the same point counts, pixel ratio at most 1.5, a still frame
for reduced motion, a stopped loop in a hidden tab, no scene on a software
renderer, and a lazy chunk. Post pages keep no canvas.

**D10 — What came from outside.** A MotionSites "Blog Showcase" prompt was
opened once, on 20 October 2026, as inspiration for the general layout only: a
large featured card above a row of smaller cards. No prompt text, code,
wording, sample posts, colours, fonts, sizes, videos, branding or distinctive
elements were used: there are no corner brackets, no "+" on hover, no zooming
or autoplaying video, no outside fonts (the face stays Archivo through
`next/font`), no white page and no database. The hover is our own: the card's
border warms to star-gold and its picture plays its move. ADR-0030 D7 ("no
MotionSites prompt was opened") stays true for the home and About scenes.
Handbook §6.3 allows references to inspire general patterns; it is unchanged.

## Alternatives considered

- **Photos or AI-generated cover images.** They need licences or a provider,
  and image requests. The drawn scenes cost nothing, need no request and match
  the night look. Real screenshots stay possible for case studies (D8).
- **A client-side canvas per card.** Rejected: one canvas already runs behind
  the page, and a picture per card would multiply the GPU cost for decoration.
- **Changing version 1 to add the type and the new name.** Rejected: the live
  agents write version 1, and PR #120 is changing their files. A second version
  keeps the agents and their tests untouched until phase 18.7.
- **A database table for the featured choice.** Rejected: a typed file is
  reviewed with the code and needs no new service (handbook §49.2).
- **A "View all posts" button.** Not needed: every post is on this page.

## Security, privacy and operations

No new origin, request, cookie, storage or CSP change. The pictures are SVG
elements written by React from numbers the server computes, with presentation
attributes only, so the production CSP (no inline styles) holds; a unit test
checks that the rendered front page carries no `style` attribute and no script.
Post text still renders only as React text.

The post checker now accepts version 2 wherever it is used, including where
the fixture pipeline (`src/lib/blog/pipeline/`) checks a writer's draft. The
live agents cannot produce one: their output schema (`wire.ts`) allows only
version 1 and builds the post object itself. A version 2 draft could only name
a cover inside `/blog/covers/`, which must already be committed, and every
post still waits for the owner's approval. The threat model gains the version
2 fields in phase 18.7, when the agents start writing them.

## Follow-ups

- **Phase 18.7, after #120 merges:** `promoteRun` writes version 2 (the type
  chosen at approval, the new name and the new disclosure wording), and the
  agents' name strings change; the agents suggest a post type and the owner
  approves it with the post. The source notes still say "OJ" until the corpus
  update that ADR-0029 D5 places after phase 15a.
- **Phase 18.6:** the post-page journal (version 3 blocks) and its revision of
  this ADR.

## Verification — local preview, 20 October 2026

Measured on local production builds (`next build` and `next start`) on the
owner's Windows laptop. These are local measurements; owner review on the
private preview, on a real phone and laptop, is still to come.

- **Lighthouse 12.8.2 mobile**, the same helper and settings as ADR-0030,
  headless Chromium drawing WebGL on the laptop's GPU (ANGLE, Direct3D 11):
  - `/blog`, five runs: performance 94, 94, 94, 96, 95 (**median 94**);
    accessibility, best practices and SEO 100 in every run; largest contentful
    paint 2.9 s; total blocking time 50–110 ms; layout shift 0.
  - Home, one run: performance 95; the others 100.
  - About, whose code this build does not change: 78 on the first run (one
    440 ms blocking stretch), then 92, 85 and 93; the others 100 in all four.
    ADR-0030 recorded the same spread on unchanged code (79 to 93).
- **Picture move helper:** `CoverMotion` is 564 bytes, 378 bytes gzipped, in
  a chunk the page already loads.
- **Unit tests** (Vitest): the version 2 parser (29 cases: types, author,
  cover paths including outside, protocol-relative, data, traversal, encoded,
  query and wrong-type paths), the cover file check, the front-page order, the
  scene generator (same slug, same picture; within 250 and 120 shapes over 61
  slugs, four types and both sizes; only defined gradients; tints at 4.5:1 or
  more) and the page (a five-post fixture in the test only: the featured card,
  a full row of three and a one-item older list; one link per card; no inline
  `style` attribute or script). `schema.test.ts`, `repository.test.ts` and
  every pipeline and live test are unchanged and pass.
- **Browser tests** (Playwright, `e2e/blog.spec.ts` and `e2e/home.spec.ts`):
  the approved header, "Featured", "By Joseph Florendo" and "Explainer"; one
  link per card, named by its title, and a click on the picture opening the
  post; two columns at 1440 px, stacked at 768 and 390 px; the featured title
  on the first screen at 390 × 844; axe clean on `/blog` at 390, 768 and
  1440 px and on the article at 390 and 1440 px; keyboard focus reaches the
  card with a 3 px ring round it; no sideways scroll at a 200% zoom layout;
  without JavaScript every word and link present, the picture still and no
  canvas; the sky `running`, `paused` in a hidden tab, `still` under reduced
  motion with no document animations, and `off` on a software renderer; the
  picture's move plays once on first view and again on hover, then rests; one
  `canvas.jf-sky` on `/blog` and none on the article or `/projects/cited`; no
  console errors or CSP violations.
- **Gate** (`npm run test:ci`'s 17 stages, run one by one on the working
  tree): stage 1 fails only on the sharp and source-map-js advisories (#119);
  stages 2–17 exit 0, including 1,075 unit tests, 111 portfolio and 50
  management browser tests. The document checks (stages 2–7) and lint were
  re-run after this block was written, and pass.
- **Screenshots** at 390 and 1440 px were sent to the owner for review.

## Rollback

Revert the commit through a reviewed pull request: version 2 only adds to
version 1, so the old page and the version 1 parser come back together, and
the live post's previous file is in Git history. To drop only the sky, remove
`<StarSkyLazy />` from `src/app/(portfolio)/blog/page.tsx`. Do not rewrite
history.
