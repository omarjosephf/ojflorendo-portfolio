# E.V isolated application-data restore qualification

Date: 9 September 2026. Risk: R2. Bounded package-13 checkpoint; **12/16 packages
remain complete locally/staging**. This is an application-data rehearsal using
local PGlite, not a managed Supabase disaster recovery or production release.

## Result and changes

The new [rehearsal](../../scripts/test-management-restore.mjs) executes a real
synthetic backup-file round trip into a fresh, independent PostgreSQL engine.
The [recovery module](../../scripts/management-restore.mjs) accepts a strict
application-data allowlist, applies current deletion evidence, and holds schema
access disabled until catalog checks pass. It then grants only read access under
the existing RLS/session/MFA policies.

Forty-six checks pass. Four source conversations become two eligible restored
conversations: one deleted after backup and one expired conversation are removed
along with every dependent message, answer event, feedback record, result payload
and generation claim. One independently approved exact knowledge draft and its
content-free receipt survive. All three gap reviews are discarded. No Auth
session, owner assignment, credential or budget row is restored.

The missing-current-ledger case restores approved knowledge and starts empty
chats. Wrong source/schema/digest, old/future evidence, unexpected fields/tables,
missing principals and constraint failures reject recovery. Transactions roll
back earlier inserts, and access remains disabled. Security tampering before or
after loading also prevents access. Fresh synthetic guest A/B, owner AAL1/AAL2,
revocation, anonymous/service denial and direct/definer mutation checks pass.
[Machine-readable evidence](evidence/2026-09-09-application-restore.json).

## Findings and limits

The seven applied staging migrations were checked through the canonical linked
CLI, and the actual retention/reconciliation definitions were inspected read-only.
No migration, reset, owner/factor/session mutation or restore was performed there.
Local execution confirms the existing conversation-only reconciliation leaves an
expired gap review in place. Because there is no complete current gap-deletion
ledger, this recovery deliberately loses all gap reviews. It does not claim to
preserve eligible gap history. A future granular gap restore needs additional
deletion provenance and qualification.

A caller supplies independently trusted backup/current-ledger digests and current
draft approval. Hashes detect byte changes; they do not prove completeness or
currentness. The source must stop writes/deletions at cutover. A consistent stale
source plus stale ledger cannot detect its own staleness. The five-minute bound
is an additional operational check, not proof that a ledger is latest.

There is no network target or service-key loader in these scripts. Auth helpers
and claims are explicitly local test fixtures; no real JWT/MFA enrollment or
credential recovery is exercised. Full managed restore, outage concurrency,
operational off-site encryption/retention, real identity reattachment, ongoing
backup scheduling and recovery-time/data-loss objectives remain unqualified.
Free staging has no newly purchased backup/PITR subscription.
[Current Supabase backup limits](https://supabase.com/docs/guides/platform/backups).

Generation and mutations remain disabled after recovery. Snapshot generation
claims and restored budget counters would not establish latest accounting or
idempotency. Budget tables are entirely excluded. No real allowance is created,
reset or migrated, and no paid calls, subscriptions or hosting probes occurred.

## Verification and review history

The first executable rehearsal passed 39 checks. Subsequent code review found
that an unexpected schema grant could fail the initial quarantine assertion
outside the rollback/revoke handler. The check was moved into the transaction,
schema access is revoked again on failure, and an adversarial regression plus
six additional checks were added. The final 46-check run passes. First-run logs
are retained; this was a review finding after a passing run, not an invented
failed test. The legacy gap behavior is reproduced explicitly.

The existing 42 management SQL and 48 shared-budget SQL checks, script lint,
documentation anchors and diff/privacy checks are recorded with the final phase
evidence. The command is included in `test:ci` as `test:management:restore`.
No runtime UI, route, application TypeScript, backend, dependency or migration
changed. A full application build/browser/provider gate was not repeated: those
paths are unaffected and the owner's active preview must stay available. Prior
full gates remain historical; this phase does not reattribute them to new source.

The two scripts, gate wiring, ADR/threat/runbook notes, review/evidence and tracker
remain uncommitted in the existing candidate. No commit, push, merge, tag,
deployment, DNS or production-secret action occurred. Accessibility and visual
behavior are unaffected. Runtime performance is unaffected; local fixture duration
is a test measurement, not a managed recovery-time guarantee.

## Remaining acceptance

Package 13 still needs managed restore/backup operations, public-signup protection,
human owner MFA enrollment, trusted answer-event instrumentation and live gap
triage. Packages 14–16 retain application/host/cost qualification, real accounting
carry-forward, answer-quality/human review and final owner production approval.
Follow the [recovery runbook](../runbooks/ev-application-restore.md) before any
managed rehearsal or writer reactivation.
