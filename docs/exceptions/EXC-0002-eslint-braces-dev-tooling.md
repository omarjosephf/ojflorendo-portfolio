# EXC-0002 — ESLint development-tooling `braces` advisory with no patched release

- **Status:** **Active**
- **Date approved:** 2026-10-13
- **Expiry:** 2026-11-12 (inclusive). An expired exception has no authority: the
  audit gate fails on 13 November 2026 unless this record is closed or a new
  exception is approved
- **Owner:** OJ Florendo
- **Risk class:** R2
- **Linked follow-up issue:** [ISSUE-0002 — Remediate the ESLint `braces` advisory](../issues/0002-remediate-eslint-braces.md)

## Rule being waived

Engineering Handbook v1.2.1 §25 makes high-severity dependency findings block
release unless a formal exception is approved. §30 requires the composite
`npm run test:ci` gate to be green.

This exception waives only the full-audit failure caused by
**[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)**
(`braces`: stack-exhaustion denial of service through deeply nested patterns;
high, CVSS 7.5; published 2026-09-18, updated 2026-10-02).

## Scope

Covered:

- GHSA-vfj7-8cjw-p6xm only;
- `braces@3.0.3`, a development-only lockfile entry;
- the one path `eslint-config-next@16.3.8` → `@next/eslint-plugin-next@16.3.8`
  → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`, which npm reports
  as five high entries that all trace to that single advisory.

Not covered:

- production dependencies: the production-only audit must stay at zero;
- any other advisory, package or version, or any critical finding;
- runtime application code;
- a failure in lint, type checking, unit tests, the build or the end-to-end
  tests.

## Reason

The advisory lists every `braces` version up to 3.0.3, the latest release, as
vulnerable, and gives no patched version. `@next/eslint-plugin-next` pins
`fast-glob` to exactly `3.3.1` in every current release line, checked on
2026-10-13: `latest` 16.4.0 and `canary` 16.5.0-canary.9. npm's only offered
remediation is `npm audit fix --force`, which would downgrade
`eslint-config-next` to 14.2.35. That is a semver-major change of the lint
configuration away from the Next.js version in use, and this exception
prohibits it.

Without this exception, every pull request fails `verify`. That includes the
lockfile fix for the production advisories GHSA-wq5f-xc86-pv6w (`sharp`) and
GHSA-68fv-2mgg-jv7q (`source-map-js`), which protects the live site.

## Risk assessment

The advisory describes denial of service when an attacker controls a brace
pattern. Here `braces` runs only inside ESLint, on the developer's machine and
in CI, and expands glob patterns from this repository's own lint
configuration. It is not in the production website bundle, and no visitor or
external input reaches it. The worst plausible outcome is a lint step that
crashes or hangs, which fails the gate closed. Risk would rise if untrusted
contributors could change the lint configuration or the workflow files.

## Compensating controls

- The production-only audit must remain at zero vulnerabilities.
- `scripts/verify-dependency-audit.mjs` accepts the full audit only when:
  - every entry belongs to this exact path;
  - the only source advisory is GHSA-vfj7-8cjw-p6xm;
  - nothing is critical;
  - every `braces` lockfile entry is `3.0.3` and development-only;
  - the date is on or before the expiry.

  Anything else fails the gate.
- If the full audit becomes clean, the gate passes and prints that this
  exception can be closed.
- No forced override and no `npm audit fix --force`.
- No untrusted external pull-request workflows are accepted while this
  exception is active.
- Every other stage of `npm run test:ci` must pass.

## Approval evidence

Owner approval was given in the Project Zero engineering session on
2026-10-13. OJ chose **"EXC-0002, 30 days (Recommended)"** in response to the
full description: the waived advisory, its dependency path, the expiry of
12 November 2026, and the scoped gate change.

## Closure criteria

Close this exception, and remove its allowance from the gate script, when any
of these happens:

- `braces` publishes a patched release that the path can resolve to;
- Next.js releases an ESLint plugin that no longer reaches a vulnerable
  `braces`;
- the advisory is withdrawn or re-scoped so that the installed version is no
  longer affected.

On the expiry date, renew this record only through a new owner approval with
fresh evidence; otherwise let the gate fail.

## Closure result

Open.
