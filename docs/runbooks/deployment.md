# Deploying the portfolio to production

Status: **procedure, written 17 September 2026. It has not yet been used for a
full release pass.** The read-only checks under "Free and read-only" below were
executed against `https://ojfr.me` on that date, and three of the four "Checks
that need a browser" were executed later the same day; their results are in the
evidence log at the foot of this file. The checks with side effects, and
`prefers-reduced-motion`, are described and unrun.

This is the runbook `docs/ENGINEERING_HANDBOOK.md` §38 requires and §34 assumes.
It did not exist until now, so the post-deploy smoke checks §34 step 7 lists had
no written procedure — they were named in the release packet and in the handbook
and nowhere else. Writing them down is the whole point of this file.

§38's other named runbooks are no longer a problem, and all of it was settled on
17 September. `docs/runbooks/security-incident.md` was written later the same
day. `contact-delivery.md` was never a real hole — it was a name §38 gave to the
file that exists as `docs/runbooks/contact-email-delivery.md`, and §38 was
corrected to say so, which changed the handbook's bytes and required the owner to
re-ratify the checksum in `docs/adr/0000-handbook-adoption.md`.

The mechanism behind both was the same: §38's list is prose, and nothing compared
it against `docs/runbooks/`, so a file the handbook requires could be missing —
or renamed out from under the requirement — indefinitely. That is the
repository-versus-repository shape of the bug class `docs/state/CURRENT.md`
tracks, and it is mechanically checkable. It is now checked, and enforced:
`npm run docs:check-required-docs` reads §38's list, asserts every path it names
resolves, and runs as a stage of the required gate.

## Scope

Covers deployment of the **portfolio web application** to Vercel from protected
`main`, and the smoke checks that follow it.

Does **not** cover the E.V retrieval backend on Fly (`omarjosephf/cited`, see
`docs/runbooks/assistant-runtime-v3.md`), the management platform (not reachable
in production by design), or rollback (`docs/runbooks/rollback.md`).

Deployment is R3 under `docs/ENGINEERING_HANDBOOK.md` §11. Every step below that
changes production requires explicit owner approval immediately before it, and
approval of a code change is never approval to deploy it.

## Before you deploy

`docs/ENGINEERING_HANDBOOK.md` §34 steps 1 to 5, in order:

1. **Fix the commit.** Write down the exact SHA intended for production. Not a
   branch name — a branch moves.
2. **Confirm CI is green for that SHA**, not for the branch tip and not for an
   earlier run. The required gate is the stage list in
   `docs/ENGINEERING_HANDBOOK.md` §30; do not restate it here or anywhere else,
   because a second copy of that list is a second thing to forget.
3. **Verify the preview deployment** for that SHA.
4. **Obtain explicit R3 approval** from the owner.
5. **Merge or promote through the protected path.** Never force-push.

If the change touches `docs/ENGINEERING_HANDBOOK.md`, the
`docs:check-handbook-checksum` stage fails unless the same commit updates the
recorded SHA-256 in `docs/adr/0000-handbook-adoption.md`. That is intended. Do
not update the recorded value to clear a red gate — update it because the change
was approved.

## Identifying what production is serving

`docs/ENGINEERING_HANDBOOK.md` §34 step 6 asks you to verify that production
serves the intended SHA or a unique build fingerprint. **The application exposes
neither.** There is no version route, no commit SHA in a header or meta tag, and
no custom `generateBuildId` — verified by inspection on 17 September 2026.

So the deployed commit is not answerable from the response at all. It is
answerable from the deployment record, which maps a deployment to its source
commit. Until a fingerprint exists, treat that record as the authoritative
answer, and record the SHA you read rather than the SHA you expected.

**That record is not only in the Vercel console, and this file said it was until
17 September 2026.** Vercel's GitHub integration writes every production
deployment to GitHub's own Deployments API with its source SHA and a status, so
the step needs no Vercel credential, no console and no owner:

```bash
gh api repos/omarjosephf/ojflorendo-portfolio/deployments --jq '.[] | select(.environment=="Production") | {sha:.sha[0:7],created:.created_at}' | head -3
```

Take the newest entry's `id` and read its status, which must be `success`:

```bash
gh api repos/omarjosephf/ojflorendo-portfolio/deployments/<id>/statuses --jq '.[0] | {state,created_at}'
```

**Be clear what that establishes.** It proves Vercel created a production
deployment for that commit and reported success, and that it is the newest such
record. It reads nothing from the live response, so a manual rollback or a
promotion made in the console afterwards would not show up here. It is far
stronger than anything this runbook had before, and still weaker than a
fingerprint served in the response.

The Vercel MCP connector available to an agent session is **not** a route to the
same answer, tested on 17 September 2026: it returns `403 Forbidden` with
"Trying to access resource under scope `oj-s-personal-projects`. You must
re-authenticate to this scope." That is the same shape as the Cloudflare
connector reaching the wrong account, which `docs/state/CURRENT.md` already
records. Re-authenticating it would be an owner console action; reading the
GitHub record instead needs nothing.

**Two candidates were tested on 17 September and neither works.** Next.js 16
serves its assets under a fixed `/_next/static/immutable/` segment, so the asset
path carries no per-build identifier the way an older `buildId` path did. And
`X-Vercel-Id` changes on every request — it is a request trace, not a build
identity. Both were checked against the live site rather than reasoned about, so
this is a closed question until something is deliberately exposed.

Exposing a fingerprint is still worth doing, but for a narrower reason than this
section once gave. It changes a response surface, so it is R2 and needs a plan
first. What it would add is proof from the *response* that a particular build is
serving, which the deployment record cannot give: the record is Vercel's report
of what it deployed, not the live site's account of what it is running. Short of
that, a smoke run pairs a healthy site with a deployment record and stops there.

## Smoke checks

`docs/ENGINEERING_HANDBOOK.md` §34 step 7. Run them against the canonical
production origin, `https://ojfr.me`.

### Free and read-only

Safe to run at any time, in any session that has egress. They send no mail, spend
no allowance and change nothing.

**Canonical host and HTTPS.** `https://www.ojfr.me` must redirect to
`https://ojfr.me/`, and the apex must serve 200 over HTTPS.

```bash
curl -sS -o /dev/null -w "apex %{http_code}\n" https://ojfr.me; curl -sS -o /dev/null -w "www %{http_code} -> %{redirect_url}\n" https://www.ojfr.me
```

**Security headers and CSP.** Compare the live response against
`docs/ENGINEERING_HANDBOOK.md` §23 and the assertions in `e2e/headers.spec.ts`.
The header list is not repeated here for the same reason as the gate stages.
Check in particular that `Strict-Transport-Security` is present (it is production
only), that no `X-Powered-By` appears, and that the CSP carries a nonce rather
than `'unsafe-inline'` for scripts.

```bash
curl -sSI https://ojfr.me | grep -iE '^(content-security-policy|strict-transport|x-content-type|x-frame|referrer-policy|x-permitted|x-powered-by)'
```

**Nonce uniqueness.** `docs/ENGINEERING_HANDBOOK.md` §23 requires per-request
nonces to be unique. Two requests must not return the same one.

```bash
for i in 1 2; do curl -sSI https://ojfr.me | grep -io "nonce-[A-Za-z0-9+/=-]*" | head -1; done
```

**Public routes and 404.** Both case-study routes, the About page, and an unknown
route.

```bash
for p in / /about /projects/personal-portfolio-website /projects/cited /nope; do printf "%-42s %s\n" "$p" "$(curl -sS -o /dev/null -w '%{http_code}' https://ojfr.me$p)"; done
```

**Metadata surfaces.** `robots.txt`, `sitemap.xml` and `manifest.webmanifest`
must serve 200. Open Graph and JSON-LD are asserted by `e2e/seo.spec.ts` against
a local build; in production confirm the absolute URLs inside them point at the
canonical domain rather than at a preview host, since they are built from
`NEXT_PUBLIC_SITE_URL`.

**Production denial of the management platform.** `/manage` returns 404 in
production by design. The gate is `previewAllowed` in
`src/lib/management/access.ts`, which requires `!env.VERCEL`, so a real Vercel
deployment can never satisfy it. `e2e/management-disabled.spec.ts` asserts this,
but against a **local** production build — the deployed instance, with the real
environment, is a different claim, and only this check proves it.

```bash
for p in /manage /manage/live /api/management/owner /api/conversations; do printf "%-28s %s\n" "$p" "$(curl -sS -o /dev/null -w '%{http_code}' https://ojfr.me$p)"; done
```

All four must be 404.

### Checks with side effects — owner only

**Contact delivery.** A real submission to `POST /api/contact` on production
sends a real email to `CONTACT_TO_EMAIL` through Resend. It is the owner's own
inbox, so this is safe, but it is not free of consequence and it is not
repeatable without filling that inbox. Mark the message body so it is
identifiable as a smoke test. A response of
`{"ok":true,"delivered":false,"mode":"mock"}` means the provider variables are
not set in the production environment, which on production is a finding, not a
pass.

**The assistant.** `POST /api/assistant` reaches the Fly backend and can reserve
from the **service** ledger. While Action 7 is parked, do not use an on-corpus
question as a smoke check.

An off-corpus question is the safe form: `screen_question` runs before retrieval
and before any paid call, so a question the corpus cannot support is refused at
the prefilter and dispatches no provider request. That behaviour is recorded in
`docs/roadmaps/ev-management-progress.md` and was established in
`omarjosephf/cited`, not here — treat it as a citation, not as something this
runbook verified.

What a good result looks like: the assistant says plainly that it cannot answer
and offers the human route. Silent degradation is prohibited by
`docs/ENGINEERING_HANDBOOK.md` §49.1, so an answer that quietly arrives from
somewhere else is a release blocker, not a curiosity.

### Checks that need a browser

Not expressible as curl, and not currently automatable against production —
`playwright.config.ts` hardcodes `baseURL` to localhost and its `webServer` block
always starts a local build, so the suite cannot be pointed at a deployed origin
without editing the config. Do these by hand:

- **Navigation and critical interactions** — header links, hash behaviour,
  browser back and forward, mobile menu open, close, Escape, and focus return.
- **Console, page, network and CSP errors** — the browser console must be clean.
  A CSP violation here is the check that catches a policy which passed locally
  and fails against real third-party origins.
- **Reduced motion** — with `prefers-reduced-motion: reduce`, the page must be
  stable and complete, and the Digital Core must not be required for content.
- **Responsive** — a representative phone width and 200% zoom, with no horizontal
  overflow.

## What the automated suites already cover

Worth knowing, so smoke checks stay proportionate rather than re-running what CI
already proved. `e2e/headers.spec.ts`, `e2e/seo.spec.ts`,
`e2e/management-disabled.spec.ts`, `e2e/navigation.spec.ts` and the rest run in
the gate against a **local production build**.

The distinction that matters: those prove the *build* behaves correctly. The
smoke checks prove the *deployment* does — real environment variables, real
domain, real TLS, real Vercel routing. The two failure modes are different, and a
green gate has never proven the second.

## Recording the result

`docs/ENGINEERING_HANDBOOK.md` §34 step 8. Record the deployment time, the SHA
read from Vercel, which checks were run, their results, and anything left open.
Put it in the release pull request or a release note.

State what you did not check. A smoke pass that omits the browser checks is a
partial pass and should say so — `docs/ENGINEERING_HANDBOOK.md` §31 and §50 both
treat an undisclosed skipped check as worse than a disclosed one.

Do not claim success because a deployment reports ready.

## Evidence log

**17 September 2026, read-only against `https://ojfr.me`,** from a session on the
owner's machine. This was a first execution of the free checks, to confirm this
runbook describes reality. It is **not** a release smoke pass, and no deployment
had been made when these ran. (One was made later the same day — see the second
entry below.)

- Apex serves 200 over HTTPS; `https://www.ojfr.me` returns 308 to
  `https://ojfr.me/`.
- CSP present with a per-request nonce, `strict-dynamic`, `frame-ancestors
  'none'`, `object-src 'none'`, `base-uri 'self'` and `upgrade-insecure-requests`.
  `connect-src` and `frame-src` carry `https://challenges.cloudflare.com`, which
  is Turnstile and expected.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  present. `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`
  and `X-Permitted-Cross-Domain-Policies` all present. No `X-Powered-By`.
- Two consecutive requests returned different nonces.
- `/`, `/about`, `/projects/personal-portfolio-website`, `/projects/cited`,
  `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` all returned 200. An
  unknown route returned 404.
- `/manage`, `/manage/live`, `/api/management/owner` and `/api/conversations` all
  returned **404 against the live deployment** — the first time the production
  denial has been verified anywhere other than a local build.

**Not executed:** contact delivery, the assistant, and every browser check. The
deployed commit SHA was not read from Vercel.

**17 September 2026, second run, read-only against `https://ojfr.me`,** from a
session on the owner's machine, after PR #87 was squash-merged to `main` as
`4cd21c9`. That merge triggered a production deployment, so this is the first
execution of these checks following one. It is still **not** a release smoke
pass.

Every check in the "Free and read-only" section above passed:

- Apex serves 200 over HTTPS; `https://www.ojfr.me` returns 308 to
  `https://ojfr.me/`.
- All security headers present and unchanged from the first run, including HSTS
  with `preload` and no `X-Powered-By`. CSP carries a per-request nonce with
  `strict-dynamic` and no `'unsafe-inline'` for scripts; the Turnstile origins on
  `connect-src` and `frame-src` are as before.
- **Three** consecutive requests returned three distinct nonces.
- `/`, `/about`, both project routes, `/robots.txt`, `/sitemap.xml` and
  `/manifest.webmanifest` all 200; an unknown route 404.
- `rel="canonical"`, `og:url` and the sitemap all resolve to `https://ojfr.me`,
  not to a preview host.
- `/manage`, `/manage/live`, `/api/management/owner` and `/api/conversations` all
  returned **404**, so the production denial holds across a deployment rather
  than only at one moment.

**This run cannot prove the new deployment is the one serving it.** Every check
above would have passed identically against the pre-merge deployment, because the
merged change ships nothing into the build. What it establishes is that
production is healthy after a deploy, not that `4cd21c9` is what production is
running. Distinguishing those needs the Vercel deployment record, and that is
precisely what the missing build fingerprint costs — recorded here as a
consequence rather than left as a footnote in the section above.

**Not executed:** contact delivery, the assistant, and every browser check. The
deployed commit SHA was again not read from Vercel.

**17 September 2026, third run, read-only against `https://ojfr.me`,** from a
session on the owner's machine, after PR #91 was squash-merged to `main` as
`b69eff1` at 15:28:56 UTC. The Vercel production deployment for that commit
reported success. It is still **not** a release smoke pass.

**This is the first entry whose deployment changed what is served.** Every
earlier merge recorded here shipped documentation or repository configuration,
so the checks could not have distinguished the new build from the old one even
in principle. #91 upgraded eight packages, `next` 16.3.4 to 16.3.5, `three`
0.185.1 to 0.186.0 and `framer-motion` 13.2.0 to 13.3.0 among them — and the
last two feed the hero particle wave *(wrong; corrected at the end of this
entry)*. So these checks ran against a genuinely different build for the first
time.

Every check in the "Free and read-only" section above passed:

- Apex serves 200 over HTTPS; `https://www.ojfr.me` returns 308 to
  `https://ojfr.me/`.
- All security headers present and unchanged from the previous two runs: HSTS
  `max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Permitted-Cross-Domain-Policies: none`, and no `X-Powered-By`. CSP carries
  a per-request nonce with `strict-dynamic` and no `'unsafe-inline'` for
  scripts.
- Two consecutive requests returned different nonces.
- `/`, `/about`, both project routes, `/robots.txt`, `/sitemap.xml` and
  `/manifest.webmanifest` all 200; an unknown route 404.
- `/manage`, `/manage/live`, `/api/management/owner` and `/api/conversations`
  all returned **404**, so the production denial survives a dependency upgrade
  as well as a deployment.

**A changed build still does not make these checks identify it.** Every check
above is a status code or a response header, and none of the eight upgrades
alters either, so this run would have passed identically against the previous
deployment. The second entry's conclusion is unchanged and now better tested:
a smoke pass establishes that production is healthy, never which commit is
serving. Reading the deployed SHA remains a Vercel console action.

**Not executed:** contact delivery, the assistant, and every browser check. The
deployed commit SHA was again not read from Vercel. The upgrade most worth a
browser is the particle wave, since `three` and `framer-motion` both moved
beneath it, and no check here exercises it.

**Corrected 17 September 2026, by looking at the wave this entry asked for.**
The two sentences marked above are wrong. They are left standing rather than
deleted, because the plan they produced was acted on and a reader needs to see
why. **There is no particle wave to exercise.**
[ADR-0010](../adr/0010-warm-portfolio-and-finite-motion.md) unmounted the
particle wave and the Digital Core on 7 September 2026, superseding the mounting
decisions in ADR-0002, ADR-0003 and ADR-0009. Verified both ways: at `486b4f0`
`ParticleWaveLazy`, `DigitalCoreLazy` and `MobileWaveGLLazy` are imported by
nothing and `.site-wave` has no CSS rule; and production serves no `<canvas>` on
`/` or `/about` at 1024, 512 or 375 px, over 199 KiB of JavaScript in 11 chunks
where the three.js bundle alone is ~234 KiB. So `three` is a declared dependency
that reaches no route, and of the two packages named as the reason to look, only
`framer-motion` ships — `src/components/layout/Nav.tsx` and
`src/components/sections/ExperienceTimeline.tsx` import it.

**The entry's conclusion survives this.** #91 did change what is served, through
`next` and `framer-motion`, and these checks still cannot say which commit
answered them. What does not survive is the stated reason to reach for a
browser. ADR-0002, ADR-0003 and ADR-0009 all still read `Status: Accepted` and
none of them carries a pointer to ADR-0010, so the superseded decision is the
one a reader meets first.

**This correction is not a smoke pass and discharges nothing above.** It records
one finding from looking at a single surface. The browser checks were run
separately later the same day — see the fourth entry, which discharges three of
the four.

**17 September 2026, browser checks against `https://ojfr.me`,** from a session
on the owner's machine. **No deployment preceded this run.** Unlike the second
and third entries it follows no merge, so it says nothing about a new build; it
exists because every entry above listed the browser checks as not executed, and
this is the first time any of them has been run. It is **not** a release smoke
pass.

It was prompted by the third entry's closing line, which named the particle wave
as the thing most worth a browser. There is no particle wave — see the
correction appended to that entry. No `<canvas>` exists on any route at any
width tested.

Three of the four items in "Checks that need a browser" were exercised and
passed:

- **Navigation and critical interactions.** The header "Services" link resolves
  to `/#services` and lands the section 96 px below the sticky header; browser
  back returns to `/` at scroll 0; browser forward restores `/#services` at the
  same offset. At 375x812 the menu opens (`aria-expanded` true, label "Open
  menu" to "Close menu", focus moved to the first link), Escape closes it, and
  focus returns to the toggle. The panel is a disclosure, not a modal — no
  `role="dialog"`, no focus trap, body scroll not locked.
- **Console, page and network errors.** No console errors on `/`, `/about`,
  `/projects/cited` or `/projects/personal-portfolio-website`. 134 requests
  across the pass, every one 200 or 304, none failed. The only console output
  anywhere was four `postMessage` warnings emitted by Cloudflare's own
  `challenges.cloudflare.com/turnstile/v0/api.js`, which the homepage contact
  form loads; no widget is rendered at load and no iframe is created.
- **Responsive.** No horizontal overflow at 1024, 512 or 375 px on the homepage,
  `/about` and both case studies.

**The fourth item was not run at all.** `prefers-reduced-motion` could not be
tested: the browser used exposes colour-scheme emulation only, so the media
feature cannot be forced. That check remains entirely unexecuted, and it is the
one this runbook's own list cares about most after a motion-related change.

**Four limits on what the three passing checks are worth.** Recorded because
overstating a partial pass is the failure this file keeps correcting.

- **200% zoom was approximated, not performed.** A 512x384 viewport stands in for
  200% zoom of 1024x768. Real zoom also scales text metrics and can expose
  overflow that a viewport resize does not.
- **The mobile pass was emulation.** 375x812 with a phone user agent and touch
  points advertised, but pointer events still arrive as mouse clicks, so it is
  not a touch test.
- **One engine only.** Everything ran in a single Chromium-based browser.
  ADR-0002's verification covered Chromium, Firefox and WebKit across eight
  viewports, so this pass is narrower than work this project has already done.
- **CSP violations were read from the console, not from a listener.** Chromium
  reports them as console errors and none appeared, but that is weaker than the
  `securitypolicyviolation` event check ADR-0002 ran.

**Not executed:** contact delivery, the assistant, and `prefers-reduced-motion`.
The deployed commit SHA was again not read from Vercel, and nothing in a browser
changes that — no check here identifies a build any more than the curl checks
above do.

**17 September 2026, fourth run of the free checks against `https://ojfr.me`,**
from a session on the owner's machine, after PR #94 was squash-merged to `main`
as `4231867` at 16:45:45 UTC. It is still **not** a release smoke pass.

**This is the first entry that identifies the deployment it ran against.** The
production deployment for `4231867` was created at 16:46:15 UTC and reported
`state: success`; every check below ran after that. It was read from GitHub's
Deployments API, not from the Vercel console — see "Identifying what production
is serving" above, which was wrong to say no agent could do this and is
corrected in the same commit as this entry. **§34 step 6 is therefore answered
here for the first time.**

Every check in the "Free and read-only" section passed:

- Apex serves 200 over HTTPS; `https://www.ojfr.me` returns 308 to
  `https://ojfr.me/`.
- All security headers present and unchanged from the previous three runs: CSP
  with a per-request nonce and `strict-dynamic` and no `'unsafe-inline'` for
  scripts, HSTS `max-age=63072000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Permitted-Cross-Domain-Policies: none`,
  and no `X-Powered-By`.
- Three consecutive requests returned three distinct nonces.
- `/`, `/about`, both project routes, `/robots.txt`, `/sitemap.xml` and
  `/manifest.webmanifest` all 200; an unknown route 404.
- `rel="canonical"`, `og:url` and the sitemap's first `<loc>` all resolve to
  `https://ojfr.me`, and the served HTML contains no `vercel.app` reference.
- `/manage`, `/manage/live`, `/api/management/owner` and `/api/conversations`
  all returned **404**.

**What changed is what the run can claim, not what it found.** #94 shipped
documentation only — no code, no dependency, no response surface — so every
check above would have passed identically against the deployment it replaced,
exactly as in the first and second entries. The difference is that this run is
tied to a named commit by a deployment record rather than left ambiguous. Health
after a deploy and identity of the deploy are now separately evidenced, where
before only the first was available.

**Not executed:** contact delivery, the assistant, and every browser check. The
browser checks were run once, earlier the same day, against the pre-`4231867`
deployment; that pass is the entry above and was not repeated here.
`prefers-reduced-motion` remains untested by any run.

**This entry's own merge will deploy, and is deliberately not smoke-run.** The
practice in force is to smoke-run deployments that change what is served, not
every deployment: #92 and #93 both merged and deployed without a run of their
own, and #91 got one because it was the first merge to change the build. This
entry is documentation, so it changes nothing served and gets no run. Recorded
rather than left silent, because §31 and §50 both treat an undisclosed skipped
check as worse than a disclosed one.
