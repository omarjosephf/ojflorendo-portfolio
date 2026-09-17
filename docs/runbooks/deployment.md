# Deploying the portfolio to production

Status: **procedure, written 17 September 2026. It has not yet been used for a
full release pass.** The read-only checks under "Free and read-only" below were
executed against `https://ojfr.me` on that date and their results are in the
evidence log at the foot of this file; the rest are described and unrun.

This is the runbook `docs/ENGINEERING_HANDBOOK.md` §38 requires and §34 assumes.
It did not exist until now, so the post-deploy smoke checks §34 step 7 lists had
no written procedure — they were named in the release packet and in the handbook
and nowhere else. Writing them down is the whole point of this file.

Two of §38's other named runbooks still do not exist at the paths it gives.
`docs/runbooks/security-incident.md` is genuinely absent. `contact-delivery.md`
is a naming drift rather than a real hole — `docs/runbooks/contact-email-delivery.md`
covers that ground; §38 and the tree simply disagree about what it is called.

Either way the mechanism is the same: §38's list is prose, and nothing compares
it against `docs/runbooks/`, so a file the handbook requires can be missing — or
renamed out from under the requirement — indefinitely. That is the
repository-versus-repository shape of the bug class `docs/state/CURRENT.md`
tracks, and it is mechanically checkable.

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

So the deployed commit is answerable only from the Vercel dashboard or API, which
maps a deployment to its source commit. That is an owner console action; no agent
can do it. Until a fingerprint exists, treat the Vercel deployment record as the
authoritative answer, and record the SHA you read rather than the SHA you
expected.

Exposing a fingerprint would make this step self-serve and is worth doing. It
changes a response surface, so it is R2 and needs a plan first.

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
was made on this date.

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
