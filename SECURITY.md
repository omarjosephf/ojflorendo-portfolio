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

There are two server-side public input boundaries: `POST /api/contact` and
`POST /api/assistant`. Submitted contact data is validated and used only to
attempt an email delivery. It is not stored in a project database, local
storage, or browser storage, and submitted HTML is never rendered.

`OJ Assistant` answers from a set of owner-approved documents using retrieval
and a language model, reached through this site's own `POST /api/assistant`
route. It is optional: the site is fully usable without it, and unsetting one
environment variable disables it.

**Visitor questions leave the browser.** This is a deliberate change from the
earlier browser-only assistant, and the interface says so rather than implying
otherwise. A question is sent to this site's server and from there,
server-to-server, to the retrieval service and its model provider. It is **not**
stored, **not** written to any log in either repository, **not** used for
training, and **no** conversation history is kept. The visitor's IP address is
not forwarded.

One category of input never leaves the browser at all: apparent personal,
financial or credential data the visitor typed about themselves is detected
client-side and answered locally, so it reaches no provider. That is the only
thing decided in the browser, and it is the one guarantee no server-side control
can offer — by the time a server can apply one, the data has already been sent.

Prompt-injection and policy probes are **not** handled in the browser. Product
policy has a single authority — the assistant service — so a probe is sent to it
like any other question and may reach the model provider, consuming a rate-limit
slot and a paid call. The controls that bound that spend are described below.

Controls at the route boundary: a raw-body byte cap enforced before JSON
parsing, runtime schema validation, a 280-character bound applied server-side, a
best-effort in-memory per-instance throttle, an abort timeout, a server-only
shared secret, and strict validation of the service response before any of it is
rendered. Missing or partial configuration fails closed rather than calling the
service unauthenticated.

Model output is treated as untrusted text. It renders through React text nodes
with no Markdown renderer and no `dangerouslySetInnerHTML` on this path.
Citation sources are **never** used to build URLs: they are looked up in a
committed allowlist derived from the corpus, and an unrecognised source renders
as plain text with no link, so the failure mode is a missing link rather than an
attacker-chosen one.

Prompt injection is **contained rather than prevented**, and the containment is
structural: the assistant has no tools, so a successful injection can produce
text and never an action. The system prompt's data-not-instructions clause and
the corpus holding no secret worth extracting are defence in depth on top of
that, not the guarantee. The browser guard is deliberately not among them: it no
longer screens probes, and a control that does not run must not be counted.

Spend is bounded in layers, each described by what it actually guarantees: the
route throttle is best-effort and per-instance (not distributed, not an edge
limiter); the shared secret means only this site can spend the service's budget;
the service enforces its own per-IP rate limit and a daily answer allowance. The
daily allowance is **not** a monetary ceiling — it lives in process memory and
resets on restart, which under a scale-to-zero deployment happens routinely. The
provider-side account spend cap is the only hard financial limit.

The corpus is authored in this repository and reaches the service as a
deterministic checksummed artifact. The service verifies the checksum at startup
and refuses to serve content that is not what was reviewed.

The assistant's avatar imagery consists of owner-supplied **artistic digital
representations**, not photographs, and is disclosed as such in the interface.
The published image derivatives are served from this origin only and carry no
EXIF, ICC, XMP, IPTC or C2PA metadata; provenance is recorded in
`public/images/profile/README.md`. The imagery is presentational, so the
assistant remains fully usable if it fails to load.

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
- The private CV is never published. The reviewed, phone-free public CV is
  available at `public/documents/OJ_Florendo_Rayatchi_Public_CV.pdf`; its editable
  public-safe source is maintained under `docs/cv/`.
- Certificate documents under `public/documents/certificates/` are published by an
  explicit owner decision of 31 August 2026 and **do display the owner's legal
  name**. That is intended, not a leak. The publication record, review workflow and
  file hashes are in `docs/certificates/README.md`. They contain no phone number,
  street address, date of birth or identification number.
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
