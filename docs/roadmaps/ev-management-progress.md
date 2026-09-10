# E.V management delivery checklist

Updated: 2026-09-09. Count: 16 work packages. Packages differ in effort;
completion is not a percentage of elapsed time or production readiness.

| # | Work package | Status | Acceptance evidence |
| --- | --- | --- | --- |
| 1 | Roadmap, storage architecture and hosting cost research | Complete | Owner-approved roadmap and hosting review |
| 2 | Prompt review and exact chunk token audit | Complete | Review document; 67 chunks, none above 512 tokens |
| 3 | Provider fallback and durable budget local candidate | Complete locally | Prior 739 backend / 419 frontend / 73 browser checks; release remains package 16 |
| 4 | Management ADR, threat model and operations guide | Complete locally | ADR-0016; linked threat model/runbook; document links verified |
| 5 | Private responsive management preview | Complete locally | All six sections pass desktop/mobile accessibility and overflow checks; production gate checked separately |
| 6 | Conversation inbox, filtering and transcript inspection | Complete locally | Browser search, outcome filtering and retrieval trace tests pass with labelled sample events |
| 7 | Event-derived analytics and source exposure signals | Complete locally | UTC window, distinct-session, feedback denominator and source-count tests pass |
| 8 | Gap diagnosis and triage | Complete locally | Review notes survive reload; failures distinguished from content gaps |
| 9 | Knowledge editor and durable local drafts | Complete locally | Real file persistence, stale/concurrent save and failed-write checks; browser reload test passes |
| 10 | Actual source and chunk inspection | Complete locally | Actual 10-source/67-chunk snapshot; exact tokens and indexed-text digests checked |
| 11 | Supabase schema, grants and RLS isolation tests | Complete locally | 42 executed PostgreSQL checks; real operations remain package 13 |
| 12 | Durable guest repository/API and idempotency | Complete locally and in staging | Real app-to-Supabase save/replay/resume/delete checks and six browser checks pass; managed guest cookies and signed save-only retry implemented |
| 13 | Live Supabase Auth, MFA, storage and retention qualification | In progress | Free staging, managed owner MFA/inbox, scheduled retention and deletion replay qualified; live drafts/reporting and concurrent edit protection qualified; 46-check isolated application-data recovery passes locally; owner confirms authenticator and inbox work; trusted answer events now qualified locally; event staging/backend integration, managed recovery/off-site backups and CAPTCHA remain |
| 14 | Single app-host qualification for both Python workloads | Optional consolidation deferred | Both fixed Python retrieval workloads measured on a protected Linux preview; 252 local checks and 46 cloud checks pass, 38 frozen rankings agree; initial alias exposure contained; shared admission passes 48 local SQL and 11 staging checks; real accounting migration and full application qualification remain |
| 15 | Grounded-answer qualification; further embedding comparison deferred | In progress | 12 development comparisons plus six frozen new-question comparisons completed; independent human labels, full answer captures/review and advanced scenario coverage remain |
| 16 | Owner preview review and verified public release | Remaining | Owner preview feedback, complete release gates and production smoke check |

Current checkpoint: **12 complete locally/staging, 4 unfinished** (packages 13–16). This table will be updated from
executed checks, not from the existence of a plan. Public release is not implied
by a locally complete package. No subscriptions have been purchased.

## Verified checkpoint

The complete `npm run test:ci` gate passed on 9 September 2026: 537 frontend
unit tests, 36 SQL checks, 82 production-browser tests and 25 management-preview
browser tests. Type checks, production build, corpus consistency, documentation
anchors and production/full dependency audits also passed. Desktop and mobile
screenshots were inspected. See the [preview review packet](../reviews/ev-management-preview-review.md)
for the exact scope and remaining release gates.

The 12/16 count includes packages completed before this implementation session.
The new management work completes packages 4–12 and advances packages 13–15. The count is not a measure of production deployment effort.

## Theme and long-term architecture checkpoint

Shared System/Light/Dark controls are complete locally for the portfolio,
E.V dialog and management workspace. They persist an explicit choice, render it
before JavaScript, synchronize same-origin tabs and report failed persistence.
Both management themes pass all six sections at desktop/mobile widths; public
checks cover the portfolio, case study and chat. This extends packages 4/5 and
the public interface; it does not artificially add completed integration packages.

The [practices audit](../reviews/ev-rag-platform-practices-audit.md) records verified
controls and outstanding live operations evidence. The owner approved the [long-term platform comparison](../reviews/ev-long-term-platform-review.md)
and Free staging provisioning. The project is created; no subscription was purchased.
See the [live storage evidence](../reviews/ev-storage-staging-review.md). Package 14 now
explicitly compares consolidation alternatives; Vercel remains a candidate.

The 8 September theme gate passed with 487 unit, 25 SQL, 82 production-browser and 10
management-browser checks. It also caught newly indexed Sharp and js-yaml
advisories, patched to 0.35.4 and 4.3.2 respectively; production/full audits are
clean. The review packet records the changed evidence and remaining release scope.

The subsequent live operations extension passes 545 unit tests, 42 SQL checks,
application/test type checks, lint, a production build, six new workflow/theme
browser checks and three production-denial checks. It is an extension of the
complete owner-access checkpoint above, not a second complete `test:ci` run.
Eight actual staging operations checks cover concurrent edits, report deletion
reconciliation and revoked access. See [operations evidence](../reviews/evidence/2026-09-09-supabase-operations.json).

Owner feedback also prompted clearer first-time authenticator instructions. Thirteen
focused browser checks pass for enrollment, existing-factor sign-in, password setup
and revoked access across light/dark and desktop/mobile layouts. This is incremental
UI validation; the owner still completes authenticator enrollment directly.

## Python hosting checkpoint

The bounded [runtime experiment](../reviews/ev-python-hosting-probe.md) is complete.
Both corpora reproduce their frozen rankings on Linux. Warm HTTP medians were
200 ms for E.V and 210 ms for Cited; observed initialization remained
within the configured ten-second function bound in this small sample.
The first deployment unexpectedly received public default aliases; these were
removed and final anonymous-denial checks passed. 3 preview instances were
observed, reinforcing the need for shared transactional spending admission.
This no-generation experiment advances package 14 without completing it.
The checkpoint remains **12/16**, with packages 13–16 unfinished and no new
model spending or subscriptions.

## Shared budget checkpoint

The [transactional admission review](../reviews/ev-shared-budget-qualification.md)
records 788 backend tests (seven historical skips), 90 local SQL checks and 11
staging checks across 53 RPC requests. Separate processes respect aggregate and
service caps; lost acknowledgments and caller cancellation retain reservations
and actual-worker occupancy. Both installed function bodies match local source.
All synthetic pools are disabled; real ledger migration and application/host
integration remain incomplete. The first uncertain staging acknowledgment and
all earlier failures are retained. No paid calls or new real allowance occurred.
The checkpoint remains **12/16**, with packages 13–16 unfinished.

## Isolated recovery checkpoint

The [application-data restore rehearsal](../reviews/ev-application-restore-qualification.md)
passes 46 local PostgreSQL checks, including an actual synthetic backup-file
round trip, latest conversation-deletion replay, expiry/cascade removal,
missing-ledger empty chats, exact approved knowledge preservation and grants/RLS
checks before read-only access. All gap reviews are discarded because current
gap-deletion evidence is unavailable. Auth and budget data are excluded.
Managed disaster recovery, off-site backup operation and normal-writer
reactivation remain unqualified. The checkpoint remains **12/16**; this bounded
package-13 result does not complete packages 13–16 or authorize public release.


## Release essentials checkpoint, 9 September 2026

Delivery now prioritizes the existing hosting. Optional Python-host consolidation
and further embedding comparisons are deferred. Required privacy, security,
recovery, durable spending admission and answer-quality gates remain.

| Release area | Remaining acceptance |
| --- | --- |
| Management panel | Stage trusted events and live gap triage and verify deployed integration; complete protected public signup and operational recovery |
| E.V runtime | Activate the qualified durable budget on the selected existing host; verify actual provider routing and the complete answer-quality gate |
| Portfolio | Run the complete gate against the assembled current candidate and complete owner visual/content review |
| Publication | Review exact candidate, configuration, cost limits and rollback; obtain final owner approval; publish and verify production smoke checks |

Owner authenticator setup and the live inbox are confirmed working. The new
[answer-event implementation](../reviews/ev-answer-events-qualification.md) passes
focused local integration and recovery checks. This does not complete the live
release gates above or imply that a public deployment has occurred.

The [live gap-review workflow](../reviews/ev-live-gap-qualification.md) is now locally qualified, including revision conflicts, deletion-linked notes and draft references. Migrations 007 and 008 remain unapplied to staging. This advances package 13 without claiming it complete.


The [managed Auth CAPTCHA implementation](../reviews/ev-auth-captcha-qualification.md)
is now locally qualified for explicit guest signup and owner password sign-in,
including token expiry/retry, failure and mobile challenge controls. Signup is
still closed. Actual managed protection, configured limits and owner recovery
must be qualified before public activation; the package count remains 12/16.


Existing-host release preparation keeps the integrated single-Machine SQLite
budget. Shared PostgreSQL runtime activation is deferred with optional host
consolidation; it is not required by this selected topology. Read-only inspection
found one current E.V Machine and no volume. The local deployment candidate now
declares persistent storage and exact operating caps; approved provisioning,
conservative carry-forward, mounted restart/recovery and provider qualification
remain required. See [cutover preparation](../runbooks/durable-budget.md).


The [explicit production-mode candidate](../reviews/ev-production-mode-qualification.md)
adds a separately enabled, exact-origin Vercel production path while keeping
sample data and password bootstrap local. Managed identity, owner MFA, RLS,
same-origin JSON and no-store boundaries remain required. No production setting
was enabled. Managed integration/recovery, edge rules for both answer paths,
answer qualification and final owner release approval remain gates.


## Assembled candidate checkpoint, 9 September 2026

The [current local verification](../reviews/ev-release-candidate-verification.md)
passes 591 frontend unit checks, 120 database checks, 46 restore checks, the
production build, 82 production-browser and 42 management-browser checks.
The companion backend passes 793 tests with seven historical skips, lint/types
and its dependency audit. Frontend audits, lint/types, corpus and documentation
checks pass. GitHub CI now includes the management SQL/recovery/browser gates.

Local implementation readiness has advanced; managed integration/recovery,
funded answer and human review, mounted-host qualification and the exact public
release remain incomplete. No production publication or increased model
allowance occurred. Use the linked current acceptance table for release status;
the earlier 12/16 count is not a progress or time estimate.


The [encrypted-backup extension](../reviews/ev-encrypted-backup-qualification.md)
passes 17 encryption checks, 19 exporter/job/access checks and the 46 existing
recovery checks through an encrypted-file round trip. After separate owner
approval, the R2 subscription and empty private EU bucket are active, with the
reviewed expiry rule. No backup credential or deployed job was activated. Export/upload/cleanup and the disabled
hourly workflow are prepared in the [runbook](../runbooks/ev-backups.md). Managed
qualification, key custody, job activation, actual remote cleanup and isolated
managed restoration remain work.
The assembled evidence above remains the baseline before the subsequent UI
correction. The [presentation follow-up](../reviews/ev-release-candidate-verification.md#subsequent-ev-presentation-verification)
removes E.V's duplicate theme selector and Beta badge, installs the new female
avatar, and preserves the chat layout. A new production build, 23 component
tests and 42 focused browser checks pass. Managed integration/recovery, funded
answer review, mounted-host qualification and final publication remain open.
