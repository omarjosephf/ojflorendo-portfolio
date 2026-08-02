# ADR-0005: Contact-form abuse protection

- Status: Accepted
- Date: 2026-08-02
- Ratified: 2026-08-02 by OJ Florendo, including the fail-open trade-off:
  availability of the contact route is preferred over strict enforcement, so a
  failure of Cloudflare, DNS or our own configuration admits the enquiry rather
  than blocking a genuine client.
- Owner: OJ Florendo

## Context

ADR-0001 established the contact boundary. With real email delivery imminent,
the form's only abuse controls were a honeypot and a fixed-window rate limiter
that is **in-memory per server instance** (`src/lib/rate-limit.ts`). On a
serverless platform, requests are spread across instances, so that limiter
bounds accidents rather than attackers.

The owner's requirement is to hear from genuine clients, sponsors, collaborators
and employers, and not to be exposed to spam or attack.

### What this decision does not claim

Recorded explicitly because the project brief forbids overstating security.

1. **It does not block every possible attack.** It raises the cost of abuse. No
   web system can be guaranteed impossible to attack.
2. **It cannot establish that a sender is a legitimate company, or that their
   intentions are genuine.** There is no technical test for sincerity. A patient
   bad actor with a real company address passes every automated check here. The
   goal is to strip obvious junk and leave a human to judge what remains.
3. **It does not protect the published email address.** `site.email` is rendered
   as a `mailto:` link and is harvestable. Malware and phishing arrive there
   directly, bypassing this boundary entirely. That surface is addressed by
   account-level controls documented in the runbook, not by application code.

The form itself cannot carry malware: there are no attachments, outbound mail is
plain text, and submitted HTML is never rendered (ADR-0001 items 7 and 11).

## Decision

1. **Cloudflare Turnstile** verifies submissions, server-side, via
   `src/lib/turnstile/index.ts` calling `.../turnstile/v0/siteverify` with
   `fetch`. No SDK, so no browser bundle cost and no new dependency.
2. **Turnstile is opt-in.** With `TURNSTILE_SECRET_KEY` unset the check is
   disabled and the form behaves exactly as before. This mirrors the email
   transport in ADR-0001 and keeps local development, CI and the existing e2e
   suite working without an account.
3. **Plausibility screening** in `src/lib/contact/screening.ts`, applied after
   schema validation:
   - message link count above a generous threshold is refused;
   - throwaway-provider domains are refused from a small in-repo list;
   - the sender's domain must be able to receive mail (MX, falling back to an
     address record per RFC 5321).
4. **Every check fails open.** A DNS outage, a timeout, an unreachable
   Cloudflare, a non-2xx reply or an unrecognised response shape all allow the
   submission through. Only an explicit negative verdict *about the visitor*
   refuses it. Losing a genuine client to our own infrastructure is worse than
   admitting one spam message.

   This explicitly includes **our own misconfiguration**. Cloudflare answers
   HTTP 200 with `success: false` for a bad secret exactly as it does for a bad
   token, so the two are separated by `error-codes`:
   `missing-input-secret`, `invalid-input-secret`, `bad-request` and
   `internal-error` are not the visitor's fault and fail open with a loud
   `turnstile_misconfigured` error log. Everything else refuses the submission.

   Learned in production on 2 August 2026: a single mistyped secret took the
   entire contact form offline behind "we couldn't confirm you're human", and
   because provider error codes were not logged, the cause was invisible.
   `error-codes` is a fixed Cloudflare enum describing our own request — it
   carries no visitor content and no secret — so it is now logged.
5. **Fail-open events are logged as fixed categories** (`turnstile_unavailable`)
   with no token, secret or provider body, consistent with ADR-0001 item 8.
6. **Refusal messages are actionable rather than opaque.** The commonest cause
   of an undeliverable domain is a typo by a real client. Obscuring which check
   fired would protect nothing here — these are not credential oracles — and
   would cost genuine enquiries.
7. **Token lifecycle is managed in the UI.** A Turnstile token is single-use and
   expires after five minutes, so:
   - the submit control is disabled until a token exists, because a tokenless
     submission is certain to be refused and the visitor did nothing to cause it;
   - the token is dropped and a replacement requested after **every** failed
     attempt. Without this, a submission rejected for any reason — a mistyped
     email domain, say — leaves the visitor replaying a spent token, which
     Cloudflare rejects as `timeout-or-duplicate`, locking them out of the form
     until they think to reload the page.

   Both were real defects observed in production on 2 August 2026 and are
   regression-tested in `ContactForm.turnstile.test.tsx`.
8. **CSP is extended, not relaxed** (`src/proxy.ts`): `frame-src` and
   `connect-src` gain the exact origin `https://challenges.cloudflare.com`.
   `script-src` is unchanged — `api.js` carries the per-request nonce, which
   Turnstile propagates to what it loads and `'strict-dynamic'` then trusts. **No
   `'unsafe-inline'`, `'unsafe-eval'` or wildcard is introduced**, and
   `e2e/headers.spec.ts` asserts their continued absence. The widget's own styles
   live inside the Cloudflare-origin iframe and never touch this document's
   `style-src`.

## Alternatives considered

### Double opt-in confirmation

Rejected for now by the owner. Emailing a signed confirmation link and only
delivering on click is the strongest available proof that a sender controls the
address, and needs no database if the token is HMAC-signed and time-limited. It
was declined because a genuine recruiter who ignores the confirmation step is a
lead that is never heard about. Revisit if spam becomes a real problem.

### Distributed rate limiting (Vercel KV / Redis)

Still deferred, as in ADR-0001. Turnstile is a stronger control against the same
threat and adds no store, cost or personal-data flow. Reconsider if abuse
persists despite Turnstile.

### A large disposable-domain package from npm

Rejected. Exhaustive lists run to tens of thousands of entries, need constant
updating, and add supply-chain surface for marginal benefit against a threat
Turnstile already addresses. A short hand-maintained list is kept instead.

### Rejecting free-mail providers (gmail.com, outlook.com)

Rejected outright. Many legitimate recruiters, founders and collaborators use
personal addresses. This would block real clients to stop no meaningful attack.

### Requiring MX with no address-record fallback

Rejected. A small number of legitimate domains accept mail via an address record
under RFC 5321. The fallback costs one extra lookup and avoids refusing them.

## Security and privacy impact

- Turnstile is privacy-preserving by design and sets no tracking cookie in the
  managed mode used here. Pre-clearance mode is not used.
- The visitor's IP is forwarded to Cloudflare as `remoteip` only when a real one
  is known; the `unknown` placeholder is never sent.
- `TURNSTILE_SECRET_KEY` is server-only. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is
  public by design, as its name states.
- The sender's email domain is sent to a DNS resolver. No message content leaves
  the server for screening purposes.
- A new third-party origin is trusted to frame content. It is pinned to an exact
  host, never a wildcard.
- Fail-open is a deliberate availability-over-strictness trade. It means an
  attacker able to disrupt our egress to Cloudflare can bypass the bot check;
  the remaining controls (validation, honeypot, rate limit, screening) still
  apply, and the alternative silently loses genuine clients.

## Accessibility and performance impact

Turnstile's managed widget is keyboard operable and does not rely on visual
puzzles. It loads only on the contact section and only when configured, so pages
carry no cost until then. Screening adds one bounded DNS lookup (3s cap) to a
submission, not to page load.

## Operational impact

Enabling protection is an owner-only task: it needs a Cloudflare account and
production secrets. The procedure is in
`docs/runbooks/contact-email-delivery.md`, alongside the apex SPF/DMARC
lockdown, which must be sequenced after Resend verification because DMARC on the
apex is inherited by the sending subdomain.

If Turnstile is misconfigured the form keeps working and logs
`turnstile_unavailable`; it does not silently start refusing clients.

## Consequences and trade-offs

- Most automated spam is stopped, at the cost of one third-party runtime origin.
- Fail-open favours reachability over strictness, deliberately.
- Screening thresholds are judgement calls and will need tuning. If a genuine
  enquiry is ever refused, loosen the rule — a lost client costs more than a
  spam message.
- None of this defends the published `mailto:` address.

## Rollback or migration

Remove `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and redeploy:
the check disables itself and the form returns to its previous behaviour. Fully
removing the integration additionally reverts the two CSP directives. Screening
can be relaxed per-rule without touching the transport.

## Related decisions

- `docs/adr/0001-contact-form-email-boundary.md`
- `src/lib/turnstile/index.ts`, `src/lib/contact/screening.ts`
- `src/proxy.ts`, `e2e/headers.spec.ts`
- `docs/runbooks/contact-email-delivery.md`, `.env.example`
- `docs/ENGINEERING_HANDBOOK.md`, Sections 10, 22, 24, 27 and 30
