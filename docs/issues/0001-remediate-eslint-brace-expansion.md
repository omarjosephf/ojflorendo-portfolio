# ISSUE-0001 — Remediate legacy ESLint brace-expansion advisory

- **Status:** Open
- **Owner:** OJ Florendo
- **Created:** 2026-07-29
- **Due no later than:** 2026-08-12
- **Related exception:** [EXC-0001](../exceptions/EXC-0001-eslint-brace-expansion-dev-tooling.md)
- **Advisory:** GHSA-mh99-v99m-4gvg

## Problem

The Version 1.1 foundation candidate retains `brace-expansion@1.1.16` through `minimatch@3.1.5` in ESLint development tooling. Production dependencies audit cleanly. npm currently proposes only breaking remediation for the legacy path.

## Acceptance criteria

- Identify a compatible upstream release or a reviewed ESLint migration that removes the affected 1.x path.
- Do not use a blanket major-version override.
- Regenerate the canonical lockfile with `npm ci` compatibility.
- Run the normal complete `npm run test:ci` gate without EXC-0001.
- Record the fixed versions and evidence in EXC-0001, mark it closed, and remove any temporary release handling.

## Monitoring

Check before merge and at least once before the exception expires. Any new production, critical, or unrelated advisory immediately invalidates the exception and blocks release.
