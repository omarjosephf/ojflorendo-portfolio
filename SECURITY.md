# Security

This document describes the security posture of the OJ Florendo portfolio
site and the deliberate decisions behind it. No website can be guaranteed impossible
to attack; the goal here is defence in depth, a minimal attack surface, secure
defaults, and an ongoing maintenance process.

## Supported versions

This is a single-application website deployed from the `main` branch. Only the
**latest deployed version** receives security fixes; older commits, tags and
preview deployments are not maintained.

| Version | Supported |
| --- | --- |
| Latest deployed (`main`) | ✅ |
| Any previous version | ❌ |

## Reporting a vulnerability

If you find a security issue, please email **ojflorendo.connect@gmail.com** with
a description and clear steps to reproduce. Please do **not** open a public issue
for security-sensitive reports.

You can expect an acknowledgement of your report and, where a fix is needed,
coordinated disclosure once it has been deployed. Please allow a reasonable
period to investigate and remediate before any public disclosure.

## Security model

Version 1 is **static-first**: no user accounts, authentication, database, admin
dashboard, file uploads, payments, comments, CMS, arbitrary redirects, or
user-generated HTML. There is **no user input** on the site — contact is via
`mailto:`, LinkedIn and GitHub only (see "Contact form", below). This deliberately
keeps the attack surface small.

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
(Next.js 16 renamed `middleware` → `proxy`). It follows the official Next.js CSP
guide:

```
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

- **No `'unsafe-inline'` for scripts** in production — the nonce + `strict-dynamic`
  policy is the primary XSS defence. No wildcard script sources are used.
- `img-src` allows `blob:`/`data:` for the WebGL `<canvas>` and data URIs.
- Development additionally allows `'unsafe-eval'` (React dev overlay), inline
  styles, and `ws:`/`wss:` (Turbopack HMR) — production does not.
- Fonts are self-hosted via `next/font`, so no external font origin is needed.

### Consequence: dynamic rendering (documented tradeoff — G2)

Nonces require the HTML to be generated per request, so the page is
**server-rendered (dynamic)** rather than a static export. The site is still
"static-first" in substance (no DB / auth / user input). Experimental hash-based
CSP (SRI) — which would preserve static generation — is intentionally **not** used
because it is experimental.

## Notable coding decisions

- **`dangerouslySetInnerHTML` (single, documented exception — G12).** The only use
  is in `src/components/ui/StructuredData.tsx` to emit JSON-LD, which is the
  official Next.js pattern. It is safe because the payload is 100% static,
  self-authored data (no user input), `<` is escaped to `<`, it is a
  non-executable `application/ld+json` data block, and it carries the CSP nonce.
  There is no other use of `dangerouslySetInnerHTML`, `eval`, or `new Function`.

## Secrets

- No secrets are used or committed in v1. `.env*` is git-ignored (`.env.example`,
  names only, is committed).
- Any future secret (e.g. a contact-email provider key) must be **server-only**
  (no `NEXT_PUBLIC_` prefix) and stored in Vercel environment variables — never in
  the repo. `NEXT_PUBLIC_*` values are visible to visitors.
- If a secret is ever exposed, revoke and rotate it immediately.

## Contact form (deferred — G10)

v1 ships email + LinkedIn + GitHub actions only. A functional form will only be
added later via an approved secure approach (a reputable hosted provider with spam
protection and an exact CSP allowlist entry, **or** a Next.js server route with
server-side validation, length limits, rate limiting, bot protection and
server-only email credentials). Client-side validation alone will never be trusted,
and submitted HTML will never be rendered.

## Privacy

- The owner's **phone number and street address are never displayed**.
- The **private CV is never published** — only a redacted, phone-free public CV may
  be placed in `public/documents/`, and the "View CV" control stays hidden until it
  exists (G5).
- No cookies, analytics, fingerprinting or tracking in v1.

## Dependencies & supply chain

- Dependencies are kept minimal; `package-lock.json` is committed and CI uses
  `npm ci`. Dependabot watches `npm` and `github-actions` weekly, and CI fails on
  high/critical advisories (`npm audit --audit-level=high`).
- **`npm audit` currently reports 0 vulnerabilities.**

### Temporary dependency overrides

The `overrides` block in `package.json` forces two transitive dependencies to
patched versions in response to published advisories:

| Package | Overridden to | Advisory |
| --- | --- | --- |
| `sharp` | `^0.35.3` | GHSA-f88m-g3jw-g9cj (bundled libvips) |
| `postcss` | `^8.5.10` | GHSA-qx2v-qp2m-jg93 |

Both were pinned inside Next.js's own dependency tree (`sharp@^0.34.5`,
`postcss@8.4.31`), and no non-breaking Next.js patch resolved them, so overrides
to API-compatible patched versions were the smallest safe fix (no downgrade of
Next.js/React, no `npm audit fix --force`). The overrides were **regression-tested**
(audit, lint, typecheck, build, production routes, security headers, accessibility
and responsive checks all passed). **They should be removed once the installed
Next.js release officially depends on patched `sharp`/`postcss` versions** — re-run
`npm audit` after removing to confirm.

## Account & platform hardening (owner actions — G6)

The repository ships CI (`.github/workflows/ci.yml`, read-only token) and Dependabot
config, but the following must be enabled by the account owner:

- **GitHub:** enable 2FA, secret scanning + push protection, Dependabot alerts,
  branch protection on `main`, and require the CI check to pass before merge.
- **Vercel:** enable 2FA, deploy production only from protected `main`, store any
  secrets in Vercel env vars, and verify the security headers after deploy.
- **Domain/registrar:** enable 2FA, registrar lock, auto-renew and DNSSEC; verify
  DNS before removing old projects to reduce takeover risk.

Platform protection does not replace secure application code or account security.
