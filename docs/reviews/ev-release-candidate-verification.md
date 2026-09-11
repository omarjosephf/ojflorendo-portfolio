# E.V and portfolio assembled candidate verification

Date: 9 September 2026. Risk: R2. Local candidate; not a production release.

The current portfolio and management application passed the complete local
gate: 591 unit tests, 120 database boundary checks, 46 application-data restore
checks, production build, 82 production-browser checks and 42 management-browser
checks. Application/test types, lint, corpus consistency, documentation anchors
and both dependency audits pass. The audits found no known vulnerabilities.
Production-browser execution took 5.1 minutes; this is local check duration,
not a runtime performance claim.

The companion backend passed 793 tests with seven historical skips for absent
recorded paid-run/corpus artifacts, complete lint/format/type checks, package
consistency and a clean lockfile vulnerability
audit. The existing-host Fly configuration passes the installed CLI validator.
No provider call, managed migration, Auth configuration change or deployment
was performed during this verification.

## Candidate and verification boundaries

Validation used a byte-verified copy of the public frontend candidate, without
private environment files, on separate local ports. The owner's existing preview
remained available. The first build rejected a dependency junction outside
Turbopack's project root. Replacing that junction with local dependency files
resolved the test-environment problem; no application setting was loosened.
Successful early gates were retained and the remaining build/browser commands
resumed. All application, test and configuration bytes in the validation copy
still match its recorded starting manifest.

Backend checks caught three mixed line endings, two executor test fixtures with
the pre-event result tuple, and Pydantic base-constructor typing annotations.
Those corrections passed the subsequent checks. No behavioral assertion was
removed or timeout increased. Browser suites completed with no failed tests.

Review also found GitHub CI omitted the management SQL, recovery and browser
commands. The workflow now includes them, with browser dependencies installed
first and synthetic failure traces retained. YAML and command/order checks pass.
That workflow change and a recovery-runbook clarification followed the validation
copy; application source did not change after the gate started. Outcome documents
are evidence written afterward, not inputs to an already completed build.

Desktop/mobile portfolio and contact views, dark E.V chat, and light/dark mobile
management screenshots were inspected. Automated accessibility checks remain
bounded to the covered pages/states; they do not replace owner visual/content
review or qualification of a real Cloudflare challenge.

No local Docker command/runtime was available. This Windows source/application
gate does not qualify the Linux container or its eventual image digest. Required
CI container and actual mounted-host checks remain separate release evidence.

## Remaining release acceptance

| Area | Remaining work |
| --- | --- |
| Management integration | Apply and qualify migrations 007/008 in staging after approval; verify actual backend events, live gap workflow and deployed HTTPS/Auth/RLS behavior |
| Signup and recovery | Configure actual CAPTCHA/host/rate protection and test owner access/recovery; qualify an isolated managed restore and operational encrypted off-site backups |
| Existing E.V hosting | Provision the separately approved volume only at reviewed cutover; reconcile prior accounting, bind the sole Machine, qualify mounted restart/recovery, image/corpus identity and provider configuration |
| Answer quality | Complete funded frozen captures and independent human answer review; preserve prior reservations and production caps |
| Portfolio and publication | Owner visual/content review, exact source/configuration/rollback review, explicit release approval and production smoke checks |

The production management path remains explicitly disabled by default. Guest
signup is closed. Local CAPTCHA fixtures do not establish managed enforcement.
Optional hosting consolidation and further embedding comparisons stay deferred.
No new allowance, budget reset, public release, commit, push, merge or tag is
implied by this checkpoint.

See [production-mode qualification](ev-production-mode-qualification.md),
[CAPTCHA qualification](ev-auth-captcha-qualification.md),
[existing-host cutover](../runbooks/durable-budget.md) and the
[delivery checklist](../roadmaps/ev-management-progress.md).


## Subsequent E.V presentation verification

The owner's 9 September UI correction follows the assembled baseline above.
E.V now inherits the portfolio's System, Light or Dark preference without its
own selector. The Beta badge is removed and both assistant images use an
original warm, confident female illustration. The layout, capability/privacy
disclosure and portfolio profile photograph are preserved.

Focused verification passes 23 component tests, 34 production-browser checks
and eight synthetic saved-chat browser checks, plus a new production build,
changed-file lint, test types, document links and whitespace checks. The 212
application, public-asset, browser-test and selected configuration files in the
isolated verification copy match the current candidate bytes. Light and Dark
screenshots were inspected at 390 and 1280 pixels; System device changes,
cross-tab preference changes, accessibility and delayed portrait loading pass.

The frontend baseline therefore precedes this presentation change; its focused
follow-up evidence is recorded here. No backend or managed database changes,
paid model calls, production activation or publication occurred in this update.
See ADR-0017, the 9 September amendment to ADR-0006 and the
[avatar provenance](../../public/images/profile/README.md).

## Complete gate on the corpus candidate, 11 September 2026

Risk: R1. This runs the complete required gate on the working tree carrying the
refined assistant corpus, the recaptured case-study screenshot and the dead-code
removal. Nothing was committed, pushed, merged, tagged or deployed.

`npm run test:ci` completed with exit status 0:

| Stage | Result |
| --- | --- |
| Production dependency audit | 0 vulnerabilities |
| Full dependency audit | 0 vulnerabilities; no active exception |
| Documentation anchors | all references resolve |
| `lint`, `typecheck:app`, `typecheck:tests` | pass |
| `assistant:check-corpus` | corpus record up to date |
| Management SQL | 120 database checks (42 + 48 + 16 + 14), 0 failed |
| Management restore | 82 checks (17 encryption + 19 job/access + 46 restore) |
| Unit | 614 tests across 47 files |
| Production build | compiled successfully |
| Production browser | 89 passed |
| Management preview browser | 42 passed |

Unit tests moved from 591 to 614 and production-browser checks from 82 to 89
with the service-first release and the evaluation-set integrity tests; no
existing assertion was removed or weakened.

#### A second gate run went red, and why

A confirmatory `test:ci` run on the same code exited **1**. Two management
checks failed —
`workspace.spec.ts:80 › all management sections are accessible and fit 1280px
in light` and its 390px counterpart — both with
`page.screenshot: Test timeout of 30000ms exceeded` at the closing full-page
screenshot, after every accessibility and overflow assertion in the test had
already passed. That suite took 8.0 minutes rather than 4.5, because other work
was running on the machine concurrently.

A single diagnostic re-run of `test:management:preview` alone, with the machine
idle, passed 42/42. The first-failure log is retained at
`output\release-takeover-2026-09-10\verification\frontend-test-ci-final.txt`.
Both results are recorded here rather than only the green one.

**This test is timing-marginal by construction, and that is a real finding.**
It performs six section switches, six full axe scans, six overflow checks and a
full-page screenshot inside the default 30-second timeout, with `retries: 0`.
On an idle machine the four variants take 23.1s, 22.9s, 24.0s and 26.3s — four
to seven seconds of headroom. It will fail intermittently on any loaded CI
runner.

No timeout was raised and no assertion weakened: handbook §31 rules out
broadening a tolerance to manufacture green CI, and test-gate policy is an R2
decision. The recommended fix is an explicit, reviewed per-test timeout for this
one test, or splitting the screenshot out of it. Until then, treat a red result
on exactly these two checks as suspect and re-run the suite alone before
concluding there is a regression.

### Backend candidate, independently reassembled and re-run

The modern integration work was reassembled from its byte-verified checkpoint
onto a clean checkout of the backend's current remote `main`, which is
`4d7d9bce21c8eb62bc5c99f976f68867fbdcec06` — **the same commit the integration
work was already based on**. The older registered checkout at
`874f9bd5cdbb5a7df6c8caae9bef6b27063720c9` is an ancestor of it, so there was no
divergence to reconcile. All 117 recorded files match their SHA-256, and the
reassembled tree reproduces the recorded 78-entry dirty status exactly.

The reassembled candidate passes 793 tests with the same seven historical skips,
`ruff check`, `ruff format --check` over 90 files, strict `mypy` over 62 source
files, `pip check` and a clean `pip-audit`.

Eight of those tests are the corpus privacy assertions, which skip when no
corpus artifact is staged. Exporting the **refined** corpus into the candidate's
staging directory made them run, and they passed: the new corpus names no
private roadmap material. The export reproduced checksum
`9eacd1593d6ab0d61469c1bf33dae903e0a5f2b74c835f7b0082a22c8167fd0b`.

Retrieval against the refined corpus, scored by the candidate with
`--suite portfolio`, is unchanged from the previously recorded figures: 98% hit
rate, 74% top-1, critical core 16/16, separation −0.168, exit status 0. The one
remaining miss is still "Does OJ do any AI work for clients?" and is disclosed
rather than concealed.

### Two findings that block or mislead a release

1. **`eval/portfolio-source.json` still pins the pre-refinement corpus**
   (`97f76b2b50396c305597825639ba0ad28a2bcfb0`). The backend's build runbook is
   explicit that a pass against an older corpus does not qualify a new one. The
   refined corpus is uncommitted, so no SHA exists to pin yet: the frontend
   corpus commit must land first, then the pin, then a re-run. Both are
   owner-approval actions.
2. **The retrieval command is suite-sensitive.** `--suite` defaults to `demo`,
   whose floor is 1.0, so scoring the portfolio corpus without
   `--suite portfolio` fails with `GATE FAIL: retrieval hit rate 0.980 < 1.0`.
   The corpus runbook now states this and tabulates how the candidate and the
   older checkout differ, because the older checkout exits 0 even when its
   critical gate fails.

### Still not qualified by this run

Docker is unavailable on this machine, so the Linux container build and its
image digest remain CI-only evidence. Only Python 3.13.3 is installed against
the runbook's 3.12.13. No paid provider call, managed migration, CAPTCHA
activation, backup-job activation, budget cutover or deployment occurred, and
the remaining acceptance table above is unchanged by this run.
