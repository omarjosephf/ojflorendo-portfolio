# ISSUE-0001 — Remediate legacy ESLint brace-expansion advisory

- **Status:** **Closed — remediated 2026-08-01**
- **Owner:** OJ Florendo
- **Created:** 2026-07-29
- **Closed:** 2026-08-01
- **Original due date:** 2026-08-12 — closed ahead of it
- **Related exception:** [EXC-0001](../exceptions/EXC-0001-eslint-brace-expansion-dev-tooling.md) (closed)
- **Advisory:** GHSA-mh99-v99m-4gvg

## Problem

The repository retained `brace-expansion@1.1.16` through `minimatch@3.1.5` in ESLint development tooling. Production dependencies audited cleanly throughout, but the full audit reported a high-severity advisory, which required EXC-0001 to keep the release gate green.

## Resolution

The advisory was re-scoped upstream on 2026-07-31, publishing a backported fix for the 1.x line at **1.1.17**. Remediation was then a lockfile-only patch bump to **1.1.18**, inside the range `minimatch@3.1.5` already declares (`^1.1.7`).

`package.json` was not modified and no dependency override was introduced.

## Acceptance criteria — all met

- [x] A compatible upstream release removed the affected 1.x path — `brace-expansion@1.1.18`.
- [x] No blanket major-version override was used. The earlier `^5.0.8` override attempt was tested, found to break ESLint, and reverted.
- [x] The canonical lockfile was regenerated and `npm ci` verified.
- [x] The complete `npm run test:ci` gate passes **without** relying on EXC-0001.
- [x] Fixed versions and evidence recorded in EXC-0001, which is now closed.
- [x] Temporary release handling removed: `scripts/verify-dependency-audit.mjs` no longer requires an active exception.

## Lessons recorded

Two failure modes worth remembering:

1. **A clean `npm audit` is not proof of a working fix.** The `brace-expansion@^5.0.8` override produced zero reported vulnerabilities while disabling linting entirely. Remediation must be verified by running the tooling, not by reading the audit summary.

2. **Do not assert an exact set of known-bad audit entries.** The previous gate hardcoded nine expected entries; when the advisory was re-scoped upstream that list stopped matching, and the gate failed on `main` for reasons unrelated to any change in this repository. The gate now asserts a clean audit and keeps a narrow version-floor regression guard instead.
