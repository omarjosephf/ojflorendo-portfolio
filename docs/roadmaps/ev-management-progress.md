# E.V management delivery checklist

Updated: 2026-09-19. Count: 18 work packages. Packages differ in effort;
completion is not a percentage of elapsed time or production readiness.

**Packages 17 and 18 did not come from this plan.** They were set by the AI
Consultant Course instructor on 17 September 2026 and are recorded here so that
the work has a reason to exist in the tracker rather than appearing later as
unexplained scope. They are independent of packages 13–16 and do not block or
unblock them.

**The prose below the table is dated and was not all written on the same day.**
Where a checkpoint paragraph and an executed check disagree, believe the check.
The table rows and the 17 September notes were reconciled against the live
staging project, the repository and the suites actually run on that date; the
older checkpoint sections are retained as the record of what was true when they
were written, not as current status.

| # | Work package | Status | Acceptance evidence |
| --- | --- | --- | --- |
| 1 | Roadmap, storage architecture and hosting cost research | Complete | Owner-approved roadmap and hosting review |
| 2 | Prompt review and exact chunk token audit | Complete; audited corpus has since moved | Review document; 67 chunks, none above 512 tokens. The corpus was refined on 11–12 September and is now **69 chunks over 10 sources**, checksum `7bddb04d`, so the token audit predates the shipped corpus |
| 3 | Provider fallback and durable budget local candidate | Complete locally | Prior 739 backend / 419 frontend / 73 browser checks; release remains package 16 |
| 4 | Management ADR, threat model and operations guide | Complete locally | ADR-0016; linked threat model/runbook; document links verified |
| 5 | Private responsive management preview | Complete locally | All six sections pass desktop/mobile accessibility and overflow checks; production gate checked separately |
| 6 | Conversation inbox, filtering and transcript inspection | Complete locally | Browser search, outcome filtering and retrieval trace tests pass with labelled sample events |
| 7 | Event-derived analytics and source exposure signals | Complete locally | UTC window, distinct-session, feedback denominator and source-count tests pass |
| 8 | Gap diagnosis and triage | Complete locally | Review notes survive reload; failures distinguished from content gaps |
| 9 | Knowledge editor and durable local drafts | Complete locally | Real file persistence, stale/concurrent save and failed-write checks; browser reload test passes |
| 10 | Actual source and chunk inspection | Complete locally | Actual 10-source/67-chunk snapshot; exact tokens and indexed-text digests checked. The committed snapshot `src/data/management-corpus.generated.json` is current at **69 chunks, 10 sources, `7bddb04d…`**, generated 12 September and equal to the checksum the live backend reports; this row's "67" is the original audit |
| 11 | Supabase schema, grants and RLS isolation tests | Complete locally | 42 executed PostgreSQL checks when written; the same suite is now **44** and passes |
| 12 | Durable guest repository/API and idempotency | Complete locally and in staging | Real app-to-Supabase save/replay/resume/delete checks and six browser checks pass; managed guest cookies and signed save-only retry implemented |
| 13 | Live Supabase Auth, MFA, storage and retention qualification | In progress | Free staging, managed owner MFA/inbox, scheduled retention and deletion replay qualified; live drafts/reporting and concurrent edit protection qualified; 46-check isolated application-data recovery passes locally; owner confirms authenticator and inbox work; trusted answer events qualified locally. **Event staging is done** — all ten migrations are applied to staging, verified object-by-object on 17 September. Remaining: deployed backend event integration (owner-run, needs the service secret), managed recovery, off-site encrypted backups and CAPTCHA enforcement (owner console). **The tier question is settled but unspent** — [ADR-0022](../adr/0022-supabase-pro-for-managed-recovery.md) accepts buying Supabase Pro for managed recovery, triggered by the restore rehearsal rather than a date, and records that no charge has been incurred. It unblocks managed recovery only: the off-site job runs on Free and still needs the reader credential, R2 keys, key custody and the enabling flag, none of which a subscription buys. **Managed recovery has a second blocker that money does not clear.** ADR-0022's trigger is the restore rehearsal, and the rehearsal needs an isolated destination that three records forbid being the staging project. [ADR-0023](../adr/0023-isolated-destination-for-managed-restore.md) is **accepted (18 September 2026)** and settles that destination: a locked-down disposable clone, deleted in the same working session. It also finds that a physical Supabase clone is a different operation from the ten-step logical recovery contract — it carries roles, grants, `auth.*` and both live `pg_cron` jobs the contract excludes, and `ev_private.run_maintenance()` would prune the deletion-tombstone ledger the contract's merge reads. **Accepting it settles the decision and authorises nothing**: the Pro purchase, the clone and its deletion remain separate R3 owner actions, and its Verification block is empty. Managed recovery is therefore no longer blocked on a decision, but it is still unperformed, and this item does not close until that block is filled |
| 14 | Single app-host qualification for both Python workloads | Optional consolidation deferred | Both fixed Python retrieval workloads measured on a protected Linux preview; 252 local checks and 46 cloud checks pass, 38 frozen rankings agree; initial alias exposure contained; shared admission passes 48 local SQL and 11 staging checks; real accounting migration and full application qualification remain |
| 15 | Grounded-answer qualification; further embedding comparison deferred | In progress | 12 development comparisons plus six frozen new-question comparisons completed; independent human labels, full answer captures/review and advanced scenario coverage remain |
| 16 | Owner preview review and verified public release | Remaining | Owner preview feedback, complete release gates and production smoke check |
| 17 | RAG configuration surface in the management panel | Complete locally; in review as #104 | Instructor-set. Built and verified 18 September 2026 as a seventh, read-only panel section: chunking (180-word target, 40-word overlap, 69 chunks, largest 327 tokens, none over the 512-token window, each with a note on why it matters), embedding model (model, window, tokenizer and corpus checksums, snapshot time) and per-question cost. Five acceptance commands, `npm audit` and the 14-test Playwright management suite pass; the axe sweep now covers all seven sections, and the sidebar scrolls because the seventh entry pushed "View portfolio" below a 720px viewport. [PR #104](https://github.com/omarjosephf/ojflorendo-portfolio/pull/104): `verify` green, awaiting release approval. **The cost half is now resolved.** [`docs/assistant-service-costs.md`](../assistant-service-costs.md) was rewritten on 19 September around the deployed runtime: `gemini-3.5-flash-lite` at published rates checked that day, the measured US$0.0024 per answer from the 12 September six-call run, the US$0.04 reservation and the live 40/200 attempt and US$0.40/US$2.00 envelope, and compute at a warm 1.5 GB Machine rather than the scale-to-zero the old file assumed. The 28 August figures are retained in a superseded section. `src/lib/management/rag-cost.ts` carries the new figures and a `runtimeDeployedOn` date, so the panel now **derives** its staleness caveat by comparing that with `verifiedOn` instead of hardcoding it; both branches are tested. Two limits are recorded rather than closed: the per-answer figure rests on six calls of one question, and no invoice has been read into the repository |
| 18 | Blog multi-agent system design | Design drafted; nothing built | Instructor-set, and the deliverable asked for was a **design, not an implementation**. [The design](../reviews/blog-multi-agent-system-design.md) is written in the course's own vocabulary — the think/plan/act/observe agent loop, the six workflow building blocks, the four defensive lines of guardrails, MCP and cron — and grounded in this repository: content is typed modules rather than a CMS, so the pipeline's output is a pull request; the `release-approval` gate means no agent can reach production; and a published post would have to re-enter E.V's corpus or the checksum check fails. **No blog exists on this site**, no agent runs, and building any of it would need its own ADR |

Current checkpoint: **13 complete locally/staging, 5 unfinished** (packages 13–16 and 18). This table will be updated from
executed checks, not from the existence of a plan. Public release is not implied
by a locally complete package. No subscriptions have been purchased. Packages 17
and 18 are instructor-set coursework and are not release gates: public release
remains defined by packages 13–16 alone.

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

The [live gap-review workflow](../reviews/ev-live-gap-qualification.md) is now locally qualified, including revision conflicts, deletion-linked notes and draft references. This advances package 13 without claiming it complete.

**This paragraph said "Migrations 007 and 008 remain unapplied to staging" until
17 September.** They were applied on 11 September, together with `202609110001`,
and this line was never updated — as was the status header of
[the migration runbook](../runbooks/ev-staging-migrations.md), which went on
saying "prepared, not executed" for six days. Both are corrected. The live
project now carries all ten reviewed versions and the objects each one creates;
see that runbook for the verification.


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
## Corpus candidate checkpoint, 11 September 2026

The refined assistant corpus is applied to source and the complete
`npm run test:ci` gate passes on it with exit status 0: 614 unit tests, 120
database checks, 82 restore checks, both dependency audits, the production
build, 89 production-browser and 42 management-browser checks. The backend
candidate was reassembled from its byte-verified checkpoint onto the backend's
current remote `main` — the same commit it was already based on, so no
reconciliation was needed — and passes 793 tests, lint, format, strict types and
its audit. See the [candidate verification](../reviews/ev-release-candidate-verification.md#complete-gate-on-the-corpus-candidate-11-september-2026).

Two release items came out of it: `eval/portfolio-source.json` still pins the
pre-refinement corpus revision and cannot be updated until the frontend corpus
commit exists, and the retrieval command must pass `--suite portfolio` or it is
scored against the wrong floor.

Nothing was committed, pushed or deployed, no paid call was made and no managed
setting changed. Packages 13–16 remain unfinished; the checkpoint stays
**12/16**.

The assembled evidence above remains the baseline before the subsequent UI
correction. The [presentation follow-up](../reviews/ev-release-candidate-verification.md#subsequent-ev-presentation-verification)
removes E.V's duplicate theme selector and Beta badge, installs the new female
avatar, and preserves the chat layout. A new production build, 23 component
tests and 42 focused browser checks pass. Managed integration/recovery, funded
answer review, mounted-host qualification and final publication remain open.

## Reconciliation checkpoint, 17 September 2026

This tracker had drifted from the repository and from the live staging project.
The rows above are reconciled against evidence executed or read on this date;
this section records what that evidence was, so the next session can tell which
lines were checked rather than inherited.

**Staging schema — read live, read-only.** All ten reviewed migrations are
applied to `ev-management-staging` (`clekxlhhclwgtmismogv`). Version rows were
not taken on trust: `ev_complete_generation_event`, `ev_owner_gaps` and
`ev_review_gap` exist; `ev_gap_reviews` carries all four columns migration 008
adds and `authenticated` holds no write grant on it; the `ensure_rls` trigger is
enabled and `rls_auto_enable()` is revoked from `public` and `authenticated`.
The security advisors agree — the `rls_auto_enable` SECURITY DEFINER finding is
gone and the eight deny-all `rls_enabled_no_policy` INFO findings remain. Every
affected table still reads zero rows.

**Suites executed here on 17 September.** 122 database checks across the four
SQL suites — 44 management, 48 shared budget, 16 answer event, 14 live gap — and
46 isolated application-data restore checks. **0 failed.** The migration
manifest and documentation anchor checks pass. This is not a complete
`npm run test:ci` run; lint, types, build and both browser suites were not run.

**Corpus identity agrees at three points.** The repository's committed snapshot,
its generated checksum and the deployed backend's `/health` all report
`7bddb04d`, 69 chunks over 10 sources. The "67 chunks" in rows 2 and 10 is the
original audit, not the shipped corpus.

**Package 13's remaining work, stated precisely.** Event *staging* is complete.
Deployed backend event integration is implemented at both ends — the frontend
sends `X-Assistant-Event: 1` and validates the returned header against the
public response body, and the backend has emitted it since the same commit that
introduced wire v3, which is the commit the 13 September deploy carried. What
has not happened is one end-to-end call proving it against the live service.
That call needs `X-Assistant-Secret`, which is read from the keyboard, so it is
owner-operated for the same reason the paid preflight is. It need not cost
money: `screen_question` runs before retrieval and before any paid call, and a
question that retrieves nothing is refused at the prefilter, so a deliberately
off-corpus question returns a real event with `route: "none"` and `model: null`
and dispatches no provider request.

**Not attempted, and why.** Managed Supabase disaster recovery and off-site
backup activation need a paid Supabase tier, scoped database reader credentials,
R2 credentials and key custody. Enabling a paid service is R3 under handbook §11
and every input to it is an owner console action, so no part of it was started.
CAPTCHA enforcement is likewise blocked on `EV_AUTH_TURNSTILE_SITE_KEY` and the
Supabase Auth setting. Package 15 remains blocked on Action 7's captures, which
cannot run before 1 October 2026 UTC, and on independent human labels.

The checkpoint remains **12/16**. Nothing was committed, pushed, deployed or
activated, no paid call was made, no managed setting was changed and no ledger
was opened.
