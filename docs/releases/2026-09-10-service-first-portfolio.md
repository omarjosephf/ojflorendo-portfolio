# Service-first portfolio — 10 September 2026

**Status: released, 10 September 2026.** Both blockers are cleared and the site
and the corpus are live. One known limitation is open and recorded below.

| | |
| --- | --- |
| Merge commit | `ea1100a`, merged 18:27:56Z by OJ Florendo |
| Production | `https://ojfr.me/` — verified serving this release |
| Corpus deployed | `10ccbbc9…`, confirmed by `/health` over 69 chunks |
| Assistant image | `oj-assistant:deployment-01M26B1WRRA55TSYDZBWYATYDS`, machine version 12, `lhr` |
| Deploy completed | 19:01:45Z, health check passing |

Release uses the existing GitHub pull-request, CI and Vercel production workflow.
The release pull request records the exact commit, deployment and post-deploy
checks.

## Changes

- **Landing page leads with the offer.** Hero, Services, Selected work, How I
  work, Contact. The `h1`, page title, meta description, Open Graph card and
  `Person` structured data all state the service rather than the name. The name
  returns as a display wordmark.
- **New `/about` route.** About, Now, Skills, Experience and Education move to a
  dedicated route with its own `h1`, metadata and sitemap entry. Nothing was
  deleted; every role, date, credential and skill is retained in full.
- **Three services, honestly labelled.** The document-assistant offer moves from
  "Experimental / available for collaboration" to "Available now", naming its
  evidence (Cited and E.V) and stating what it does not cover. Training and
  digital/e-commerce work retained as related background.
- **Case studies corrected.** Present-tense 3D-hero claims rewritten as history
  under ADR-0010. The blanket "passed production publication and smoke testing"
  claim replaced with what the project does and does not demonstrate. Cited's
  outcome now separates quote matching, answer support and generalisation.
- **E.V source and evaluation set aligned** with the repositioning: 70 evaluation
  questions (62 before), four `expects` values repointed to renamed sections, and
  a scope-limit case covering the now-available assistant offer.
- **Hero fits the first viewport.** Previously 1046px tall, overflowing common
  laptops and cutting off the portrait. Body copy 14px → 16px.
- **E.V no longer implies a client base.** `content/assistant/about-oj.md` said
  OJ works "with clients and organisations elsewhere in the UK and
  internationally" — the implication the hero copy was written to avoid. It now
  reads "He works remotely, so his location does not limit where he can take on
  work in the UK or internationally". Same fact, no implied roster. See
  ADR-0019 D6.
- **The unused assistant starters were removed.** Five suggested opening
  questions were exported from `src/data/assistant-navigation.ts` and imported
  by nothing; the control that rendered them was removed upstream. The export
  was deleted rather than wired back in, so E.V's panel is unchanged. See
  ADR-0019 D7.
- Retired photo assets, image-production caption and the standalone Mission
  section stay retired.

## Evidence

The complete gate was run once on this unchanged candidate, every step
individually and in gate order so the record covers all twelve rather than
stopping at the first failure. **All twelve are green.**

| Step | Result |
| --- | --- |
| `node scripts/verify-dependency-audit.mjs` | pass — 0 vulnerabilities, production and full; no active exception |
| `npm run docs:check-anchors` | pass — all references resolve |
| `npm run lint` | pass — no findings |
| `npm run typecheck:app` / `:tests` | pass |
| `npm run assistant:check-corpus` | pass — record up to date |
| `npm run test:management:sql` | pass — 42 + 48 + 16 + 14 = 120 checks, 0 failed |
| `npm run test:management:restore` | pass — 17 + 19 + 46 = 82 checks, 0 failed |
| `npm run test:unit` | pass — **604 passed, 0 failed**, 46 files |
| `npm run build` | pass — Next.js 16.3.3, 20 routes |
| `npm run test:e2e` | pass — **89 Chromium tests** |
| `npm run test:management:preview` | pass — **42 tests** |

Browser coverage includes axe on the landing page, `/about` and both case studies
at 390px and 1280px in light and dark; no horizontal overflow at 320, 720, 820,
1024 and 1920 on both public routes; no-JavaScript content sweeps of both routes;
keyboard routes; the mobile menu; CSP directives, nonce uniqueness and security
headers; reduced motion; and theme inheritance into E.V.

**Assistant corpus checksum:**
`10ccbbc912bc9ad0ddc5a46c850d71a007705be9719ae246cd4448ef8db0af95`

The corpus moved from `47113b9d…` when D6 was applied. `47113b9d…` was never
released and should not be deployed. The currently deployed service reports
`047e333141b2`, which is older than both.

## Blockers

**B1 — Cleared.** `src/lib/management/management.test.ts` was red because
`management-corpus.generated.json` still recorded corpus `048b3f24…`. It was a
true positive and was never worked around: the assertion was not weakened and
the generated file was not hand-edited.

It was regenerated with `scripts/export-management-snapshot.py`, run against the
Cited package on `PYTHONPATH` and the pinned `BAAI/bge-small-en-v1.5`
tokenizer. The tokenizer file hashes to
`d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66`, identical to
the value the previous snapshot recorded, so the two snapshots were produced by
the same tokenizer and are directly comparable. The script reported 69 chunks
and a 327-token maximum against the 512 limit, and the pinned count in the test
was updated from 67 to 69 by reading that output rather than by guessing. The
checksum binding, source-set equality, index uniqueness, token bounds and
per-chunk content hashes are unchanged.

**B2 — Cleared.** The deployed service reported corpus `047e333141b2` over 64
chunks; this release carries `10ccbbc9…` over 69, and `/health` now confirms it.

The deploy also replaced the system prompt. The artifact serving before this
release dated from 29 August and its prompt began *"You are OJ Assistant"* — so
the panel was branded E.V while the backend answered as the previous persona.
Both the corpus and the persona are now current.

The original text of this blocker is retained below for the record. The service recomputes the checksum at startup and
refuses to run on a mismatch, so publishing the site alone leaves E.V either
failing to start or answering from superseded content that contradicts the new
positioning. **The site and the corpus must go out together.**

Releasing the corpus is a separate R3 action; see
[the corpus runbook](../runbooks/assistant-corpus.md). Export from this
repository with `npm run assistant:export`, deploy from the `cited` repository
with the `fly.oj-assistant.toml` config, and confirm `/health` reports the
checksum above before treating the release as complete.

## Post-deploy verification

Run against production after the merge and the corpus deploy.

| Check | Result |
| --- | --- |
| `/`, `/about`, both case studies | 200 |
| `/manage` | **404** — private owner tool, as designed |
| Unknown route | 404 |
| `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `opengraph-image` | 200; sitemap lists `/about` |
| HTTP → HTTPS, `www` → apex | 308 to `https://ojfr.me/` |
| Security headers | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, X-Permitted-Cross-Domain-Policies present; no `X-Powered-By` |
| CSP nonce | unique per request |
| Metadata | service-led title, approved description and OG alt, one `h1` |
| Structured data | `Person`, `WebSite`, `PostalAddress` — locality and region only, no street address |
| E.V | `/health` reports `10ccbbc912bc` over 69 chunks |

## Retrieval quality — open, and measured

**The evaluation set could not run.** `offer-no-client-list` was marked
`critical` while `answerable = false`, which the harness rejects for the whole
set, so no score could be produced for any of the seventy questions. The gate
did not catch it because the evaluation harness lives in the `cited` repository
and is not one of the twelve gate steps. This release's evidence section cites
70 questions; that set was unrunnable until the flag was removed.

With it runnable, retrieval has regressed against the pre-release baseline:

| | Pre-release `4020a00` | This release |
| --- | --- | --- |
| Hit rate | 100% | 88% |
| Top-1 | 79% | 68% |
| Critical core | **100% — PASS** (13) | **75% — FAIL** (16) |

Four critical questions miss, including *"Can OJ build me a website?"*, which
does not retrieve the website service section at all — it ranks 7th, 0.031
behind the portfolio case study. *"What kind of work does OJ take on now?"*
ranks the service section 27th, because "now" pulls the current-employment
sections.

Diagnosed, in the order the runbook requires — corpus gap, then retrieval, then
prompt. It is **not** a corpus gap: the sections exist. It is a corpus-design
problem. The offer is stated in three documents, so the compact summaries in
`about-oj.md` outrank the specific service sections, and the 248-word "AI
document assistants" section exceeds the 80–180 word guidance and splits into
two weaker chunks.

Two principled fixes were tested on scratch copies and **both failed to move the
metric**: removing the duplicated offer sentence from `about-oj.md`, and
splitting the over-long section in two. Rankings shifted; the critical core
stayed at 75%. Closing this needs deliberate corpus authoring rather than
mechanical restructuring, and it is deferred to the owner rather than resolved
by tuning content against the measure.

**What this does and does not mean.** These are citation-precision failures, not
truthfulness failures: the retrieved sections still support a truthful answer,
they are simply not the section the evaluation set names. No question was
deleted and no `expects` was changed — the runbook rules both out.

## Known limitations

- The case-study screenshot `personal-portfolio-website.webp` still shows the
  retired 3D hero and previous hero copy, contradicting its own case-study text.
  Recapture after publication.
- E.V's panel opens with a greeting and no starting points. That is the
  intended outcome of ADR-0019 D7, not an oversight, but it is a difference from
  the panel as it behaved at HEAD.
- Dead code retained and not cleaned up in this release: `PortraitMark.tsx`, the
  `.portrait-trigger` branch in `InteractionFeedback.tsx`, and the
  `.hero-preview*` / `preview-settle-*` CSS.
- Physical devices, WebKit, Firefox and Lighthouse were not tested. Contact
  delivery was not exercised; local tests use the honest no-delivery mode and
  assistant tests use controlled responses. No paid provider evaluation was run.

## Scope

No dependency, lockfile, secret, DNS, API handler, validation rule, accepted
value, email path, security header or CSP change. The management preview remains
gated to development on localhost and is not part of this release.

See [ADR-0019](../adr/0019-service-first-portfolio-and-about-route.md),
[ADR-0010](../adr/0010-warm-portfolio-and-finite-motion.md),
[corpus runbook](../runbooks/assistant-corpus.md) and
[rollback runbook](../runbooks/rollback.md).
