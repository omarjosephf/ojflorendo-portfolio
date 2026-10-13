# ISSUE-0002 — Remediate the ESLint `braces` advisory

- **Status:** **Open**
- **Owner:** OJ Florendo
- **Created:** 2026-10-13
- **Due date:** 2026-11-12, the expiry of the related exception
- **Related exception:** [EXC-0002](../exceptions/EXC-0002-eslint-braces-dev-tooling.md) (active)
- **Advisory:** GHSA-vfj7-8cjw-p6xm

## Problem

The development lint tooling reaches `braces@3.0.3` through
`eslint-config-next@16.3.8` → `@next/eslint-plugin-next` → `fast-glob@3.3.1`
→ `micromatch@4.0.8`. GHSA-vfj7-8cjw-p6xm lists every published `braces`
version as vulnerable and gives no fix. Production dependencies audit cleanly.

## What to check, at least weekly until closed

- `npm view braces versions` shows a release above 3.0.3, or the advisory
  names a first patched version.
- `npm view @next/eslint-plugin-next@latest dependencies` no longer pins
  `fast-glob@3.3.1`.
- `npm audit` reports zero vulnerabilities.

## Acceptance criteria

- [ ] A compatible upstream release removes the vulnerable path, applied
      without `--force` or a major-version override.
- [ ] `npm run lint` and the complete `npm run test:ci` pass with the full
      audit clean.
- [ ] The EXC-0002 allowance is removed from
      `scripts/verify-dependency-audit.mjs`, and EXC-0002 is closed with
      evidence.
