# EXC-0001 — Temporary ESLint development-tooling advisory

- **Status:** **Closed — remediated 2026-08-01**
- **Date approved:** 2026-07-29
- **Date closed:** 2026-08-01
- **Original expiry:** 2026-08-12 (inclusive) — closed before expiry; never renewed
- **Owner:** OJ Florendo
- **Risk class:** R2
- **Linked follow-up issue:** [ISSUE-0001 — Remediate legacy ESLint brace-expansion advisory](../issues/0001-remediate-eslint-brace-expansion.md)

## Rule being waived

Project Zero Engineering Handbook v1.1.0 sections 25 and 30 normally require high-severity dependency findings to block release and require the composite `npm run test:ci` gate to be green.

> **Governing-version note, resolved 2026-08-01.** This record's citation of v1.1.0 was previously in tension with sessions that treated v1.0.0 as governing. That conflict is now resolved: v1.1.0 was ratified as the single governing version on 1 August 2026, so this citation is correct. See `docs/adr/0000-handbook-adoption.md`.

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

**Closed on 2026-08-01, remediated rather than renewed or expired.**

### What changed

The advisory was re-scoped upstream on **2026-07-31 at 19:37 UTC**. It had previously published a single collapsed range of `<= 5.0.7` with a first patched version of `5.0.8`, which meant no patched 1.x line existed. It now publishes four ranges with backported fixes per major line:

| Vulnerable range | First patched |
| --- | --- |
| `< 1.1.17` | **1.1.17** |
| `>= 2.0.0, < 2.1.3` | 2.1.3 |
| `>= 3.0.0, < 3.0.3` | 3.0.3 |
| `>= 4.0.0, < 5.0.8` | 5.0.8 |

A patched **1.x** release therefore became available, which is what this exception had been waiting for.

### Remediation applied

`npm update brace-expansion --package-lock-only`, a **lockfile-only** change:

- `node_modules/brace-expansion`: **1.1.16 → 1.1.18**
- `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion`: 5.0.8 → 5.0.9

`package.json` was **not** modified. No override was added, and none is needed: `1.1.18` already satisfies `minimatch@3.1.5`'s own declared `^1.1.7` range.

### Verification evidence

- `npm audit` → **found 0 vulnerabilities**, exit 0.
- Production-only audit → 0 vulnerabilities.
- `npm run lint` → exit 0.
- Runtime compatibility confirmed directly, because the earlier 5.x attempt failed exactly here: `require('brace-expansion')` returns a **function**, `expand('a{b,c}d')` returns `["abd","acd"]`, and `minimatch('x/b.js','x/{a,b}.js')` returns `true`.
- Complete `npm run test:ci` gate green on the final candidate.

### Why the earlier attempt failed, for the record

On 2026-07-31 an override to `brace-expansion@^5.0.8` was tried and reverted. It produced a clean audit while **breaking ESLint entirely** (`TypeError: expand is not a function`), because `brace-expansion@5` exports a named `expand` whereas `minimatch@3` requires the module and calls it directly. That episode is why this closure verifies runtime behaviour and not just the audit result.

### Consequential fix

While closing this exception, the gate script was found to be **failing on `main`** independently of any repository change: it asserted an exact set of nine expected audit entries, and the re-scoped advisory reduced that to one. Asserting "exactly these known problems" proved fragile. `scripts/verify-dependency-audit.mjs` now asserts a **clean** audit instead, and keeps a targeted regression guard so no `brace-expansion` instance can fall back below its patched minimum for its major line.

This exception is closed and must not be reopened. A future advisory requires a new exception record.
