# EXC-0001 — Temporary ESLint development-tooling advisory

- **Status:** Active
- **Date approved:** 2026-07-29
- **Expiry:** 2026-08-12 (inclusive)
- **Owner:** Omar Joseph Florendo
- **Risk class:** R2
- **Linked follow-up issue:** [ISSUE-0001 — Remediate legacy ESLint brace-expansion advisory](../issues/0001-remediate-eslint-brace-expansion.md)

## Rule being waived

Project Zero Engineering Handbook v1.1.0 sections 25 and 30 normally require high-severity dependency findings to block release and require the composite `npm run test:ci` gate to be green.

This exception waives only the audit failure caused by **GHSA-mh99-v99m-4gvg** for `brace-expansion@1.1.16`, reached through `minimatch@3.1.5` in ESLint-related development dependencies.

## Scope

Covered:

- GHSA-mh99-v99m-4gvg;
- `brace-expansion@1.1.16` under `minimatch@3.1.5`;
- development-only ESLint dependency paths;
- the Version 1.1 foundation release candidate only.

Not covered:

- production dependencies;
- `brace-expansion@5.x` or any other package version;
- new, moderate, high, or critical advisories;
- runtime application code;
- a failure in lint, type checking, unit tests, build, or end-to-end tests.

## Reason

The production-only audit reports zero vulnerabilities. The compatible 5.x path was updated from `brace-expansion@5.0.7` to patched `5.0.8`. The remaining 1.x package is required transitively by current ESLint tooling, and npm offers only semver-major or otherwise incompatible remediation. A blind forced override or `npm audit fix --force` would introduce greater compatibility risk and is prohibited.

## Risk assessment

The advisory describes denial of service through unbounded brace expansion. Exposure is limited to local and CI development tooling. The package is not included in the production website bundle. Risk would increase if untrusted contributors could supply attacker-controlled lint glob expressions or workflow configuration.

## Compensating controls

- Production audit must remain at zero vulnerabilities.
- The full audit must contain only the exact scoped advisory and no critical findings.
- No untrusted external pull-request workflows are accepted while this exception is active.
- No forced dependency override and no `npm audit fix --force`.
- Clean install, lint, application typecheck, test typecheck, unit tests, production build, and end-to-end tests must pass.
- Re-run the audit before merge and close the exception immediately when compatible remediation is available.
- The main website remains unchanged in runtime trust boundaries by this exception.

## Approval evidence

Owner approval was given directly in the Project Zero engineering session on 2026-07-29 in response to the complete EXC-0001 description: **“I approve it.”**

## Closure result

Open. Record the remediation version, verification evidence, and closure date here before deleting or superseding this exception.
