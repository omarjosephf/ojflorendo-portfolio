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
