# Security

This document describes the security posture of the OJ Florendo portfolio and
the deliberate decisions behind it. No website can be guaranteed impossible to
attack; the goal is defence in depth, a minimal attack surface, secure defaults,
and an ongoing maintenance process.

## Supported versions

This is a single-application website deployed from the protected `main` branch.
Only the **latest deployed version** receives security fixes; older commits, tags,
and preview deployments are not maintained.

| Version | Supported |
| --- | --- |
| Latest deployed (`main`) | ✅ |
| Any previous version | ❌ |

## Reporting a vulnerability

If you find a security issue, email **ojflorendo.connect@gmail.com** with a
description and clear reproduction steps. Do **not** open a public issue for a
security-sensitive report.

Reports are acknowledged privately. Where a fix is needed, disclosure is
coordinated after remediation and production verification.

Do not include real secrets, credentials, access tokens, or personal data in a
report; a clear description and reproduction steps are sufficient.

## Security model

Version 1.1 remains **static-first** in architecture: there are no user accounts,
authentication, database, admin dashboard, uploads, payments, comments, CMS,
arbitrary redirects, or user-generated HTML.

The only server-side public input boundary is `POST /api/contact`. Submitted
contact data is validated and used only to attempt an email delivery. It is not
stored in a project database, local storage, or browser storage, and submitted
HTML is never rendered.

`OJ Assistant` is an optional browser-only curated guide. It does not call a
language model, assistant API, provider, web search, analytics service, or
telemetry endpoint. Visitor text is bounded, is not rendered, transmitted,
logged, retained, or placed in browser storage, and is used only to select fixed
owner-approved public answers and allowlisted internal links.

## HTTP response headers

Static headers are set for every response in `next.config.ts`:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (legacy clickjacking fallback) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/mic/geolocation/usb/… all disabled |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-DNS-Prefetch-Control` | `on` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production only) |

`X-Powered-By` is disabled.

## Content Security Policy (CSP)

The CSP is generated **per request with a fresh nonce** in `src/proxy.ts`
(Next.js 16 renamed `middleware` to `proxy`):

```text
default-src 'self';
script-src 'self' 'nonce-<per-request>' 'strict-dynamic';
style-src 'self' 'nonce-<per-request>';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;   (production only)
```

- Production does not allow `'unsafe-inline'` scripts or wildcard script sources.
- `img-src` allows `blob:` and `data:` for the WebGL canvas and data URIs.
- Development additionally allows the minimum origins needed for React and
  Turbopack development tooling; production does not inherit those relaxations.
- Fonts are self-hosted through `next/font`.

### Dynamic-rendering trade-off

Per-request nonces require server-rendered HTML rather than a static export. The
site remains static-first in product architecture: it has no accounts, database,
or persistent application data. Experimental hash-based CSP is not used.

## Notable coding decisions

- **`dangerouslySetInnerHTML` has one documented use.**
  `src/components/ui/StructuredData.tsx` emits static, self-authored JSON-LD using
  the official Next.js pattern. The payload has no user input, escapes `<` before
  embedding, uses the non-executable `application/ld+json` type, and carries the
  request nonce. No other use of `dangerouslySetInnerHTML`, `eval`, or
  `new Function` is permitted without R2 review.

## Secrets and environment variables

- Real `.env*` files are ignored; `.env.example` contains names and safe
  descriptions only.
- Contact delivery may use three server-only variables:
  `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL`.
- These values must never use a `NEXT_PUBLIC_` prefix, enter source control,
  appear in logs or screenshots, or be pasted into project documentation.
- Production secret creation or modification requires separate explicit owner
  approval.
- An exposed secret must be revoked and rotated immediately.

## Contact-form boundary

The contact form is implemented through `POST /api/contact` with these controls:

- a hard **32 KiB raw-body cap** is enforced before JSON parsing;
- the server independently validates and normalises every field;
- enquiry types are allowlisted and field lengths are bounded;
- explicit reply consent is required;
- a hidden honeypot absorbs obvious automated submissions without sending;
- a best-effort in-memory limit allows five attempts per 60 seconds per server
  instance; it is deliberately documented as non-distributed;
- email output is plain text; submitted HTML is not rendered;
- message bodies, provider response bodies, secrets, and thrown errors are not
  logged;
- client and server errors use fixed, generic messages; and
- responses use `Cache-Control: no-store`.

When all three server-only variables are configured, the server calls the Resend
HTTP API. When any variable is absent, the safe mock transport validates the flow
but sends no email and returns `delivered: false`. The UI explicitly states that
nothing was sent, so mock mode does not create a false-success claim.

This boundary and its limitations are recorded in
`docs/adr/0001-contact-form-email-boundary.md`.

## Privacy

- The owner's private phone number and street address are never displayed.
- The private CV is never published. Only an explicitly reviewed public CV may be
  placed under `public/`; the CV control remains hidden until one exists.
- Contact data is collected only to reply to the enquiry and is not persisted by
  the application.
- No cookies, behavioural analytics, fingerprinting, or ad tracking are used in
  the current release.
- Logs, screenshots, test artefacts, and support reports are subject to the same
  privacy rules as source code.

## Dependencies and supply chain

- Dependencies are kept minimal; `package-lock.json` is committed and CI uses
  `npm ci`.
- Dependabot monitors npm and GitHub Actions.
- The release gate runs `npm audit --audit-level=moderate`; high or critical
  findings block release, while moderate findings require explicit review and
  disposition.
- GitHub Actions use least-privilege permissions and immutable full-SHA pins.
- Do not use `npm audit fix --force` as an unreviewed remediation.

### Temporary dependency overrides

The `overrides` block in `package.json` currently forces patched transitive
versions in response to published advisories:

| Package | Overridden to | Advisory |
| --- | --- | --- |
| `sharp` | `^0.35.3` | GHSA-f88m-g3jw-g9cj (bundled libvips) |
| `postcss` | `^8.5.10` | GHSA-qx2v-qp2m-jg93 |

The overrides are temporary. They must be reviewed when Next.js changes, removed
when the installed dependency tree is natively patched, and regression-tested
with the complete release gate. Dependency audit results must be recorded as
execution evidence rather than maintained as a potentially stale statement in
this document.

## Account and platform hardening (owner actions)

The repository ships CI and Dependabot configuration, but the owner must maintain:

- GitHub MFA, secret scanning, push protection, Dependabot alerts, protected
  `main`, and required CI before merge;
- Vercel MFA, production deployment only from protected `main`, server-only
  secret storage, and post-deploy header verification; and
- registrar MFA, registrar lock, auto-renewal, DNSSEC where supported, and safe
  verification before removing old domain bindings or deployments.

Platform protection does not replace secure application code.
