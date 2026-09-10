# Isolated application-data recovery

Status: local synthetic rehearsal qualified; managed destination recovery and
an ongoing off-site backup process remain unqualified. Risk R2. Extends
[ADR-0016](../adr/0016-ev-management-storage-and-preview.md).

## Reproduce the bounded rehearsal

Run `npm run test:management:restore`. The scripts create independent in-memory
PGlite source/destination databases, apply the current reviewed migrations with
the **local-only** Auth fixture, serialize synthetic application rows to an
ignored file, read that file back, reconcile and exercise access policies.
There is no destination URL, live connection, environment-key loader, provider
call or managed-project reset. Never adapt the Auth fixture into a live restore.

The source and destination represent different databases. Auth-shaped fixture
claims are SQL test inputs, not real JWT signatures or managed MFA. A managed
backup restore, multi-connection outage, disaster-recovery duration, operational
off-site retention, real identity reattachment and public cutover are separate
qualification tasks. The review records [executed evidence](../reviews/ev-application-restore-qualification.md).

## Recovery contract

1. Disable every application writer/reader, generation dispatcher, background job
   and other access path for the intended restore destination. Drain source
   writes/deletions at the cutover; document its identity and the final ledger.
   The rehearsal uses a new database with all runtime schema usage revoked.
2. Restore schema/functions/policies from independently reviewed migration source.
   Never execute SQL, restored grants, triggers or role assignments supplied in
   an untrusted data backup. The rehearsal validates an exact schema digest and
   accepts only the fixed application-table/column allowlist, bounded to 10 MB
   per artifact and 10,000 rows per table.
3. Verify the selected backup's independent digest, source identity and age of
   at most seven days. Retain deletion tombstones for 45 days. Independently
   identify eligible destination principals; the rehearsal seeds synthetic IDs
   separately. Missing referenced identities abort the transaction. It never
   creates users from backup records, remaps ownership implicitly or relaxes FKs.
4. Obtain the **complete current conversation deletion ledger** outside the old
   backup. Verify its independently trusted digest and source binding. Its
   capture must follow the backup, precede restore and be within five minutes of
   the isolated cutover check. The caller must establish completeness and the
   source write freeze: a self-reported timestamp or a hash stored with a stale
   backup cannot prove that no later deletion occurred. An internally consistent
   stale database and ledger cannot establish their own currentness.
5. Merge backup and current tombstones by UUID, keeping the later deletion time.
   Run `ev_private.reconcile_restored_conversations()` with constraints and
   triggers active. Expired/tombstoned conversations and their messages, events,
   feedback, result payloads and generation claims must be physically absent.
6. **Discard every gap review.** Legacy reviews have no complete gap-deletion
   ledger. Migration 008 links new reviews to conversations through messages,
   but does not recover the deletion history of legacy rows. Restoring even an unexpired gap could resurrect
   a deleted question/note. No gap is eligible under this recovery contract.
7. Restore knowledge drafts only from an independently current reviewed list
   binding each exact row digest. An absent/changed approved row aborts recovery;
   unapproved drafts and their content-free editorial receipts are omitted.
   Draft recovery never publishes knowledge or supplies old body-version history.
8. Missing current ledger means an explicit **empty-chats** recovery: omit all
   conversations, descendants, generation claims and gaps; only independently
   approved knowledge/receipts can remain. Malformed, wrong-source, old or
   digest-mismatched evidence aborts; it does not silently choose another ledger.
9. Audit actual table/column grants, RLS/policies, function definitions/grants,
   constraints, trigger enablement, role attributes and memberships before and
   after loading and before access. Any drift or load error rolls back and
   revokes schema access again. Keep failed evidence; do not erase an existing
   database to make a restore pass.
10. Enable only the reviewed **read-only** recovery grants after reconciliation.
    Old session claims must read nothing. Independently re-established identities
    and fresh sessions must pass guest isolation, owner MFA and revocation tests.
    Direct writes, formerly granted column updates, server generation RPCs and
    anonymous/service-role access stay disabled. Ledger cutover freshness is
    checked again before read access; expiry reconciliation also runs again.

The application-data allowlist excludes `auth.*`, owner assignments, credentials,
session/refresh tokens, Storage objects, configuration secrets, retention history
and every budget table. Historical generation claims/results may survive only
with eligible chats for read recovery; their snapshot is **not** permission to
resume generation. Latest idempotency state and external cost accounting require
separate recovery before any writer/dispatcher activation. See the
[shared-budget runbook](shared-budget.md).

## Free-tier backup and managed follow-up

Supabase documents accessible daily backups for paid plans and recommends regular
CLI exports with off-site storage for Free projects. PITR is a paid add-on with
additional compute requirements. Database backups do not contain Storage object
bytes. This project has not purchased a backup subscription or established an
automated off-site backup service.
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

The documented CLI logical restore uses separate schema/role/data exports and a
single transaction with stop-on-error. This rehearsal intentionally uses reviewed
schema plus allowlisted data and keeps triggers/FKs enabled; it does not execute
a full Supabase dump or claim complete Auth disaster recovery.
[Supabase CLI recovery](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[PostgreSQL dump behavior](https://www.postgresql.org/docs/current/app-pgdump.html).

Before managed qualification: provide a fresh isolated destination and reviewed
access-isolation plan, verify actual grants/RLS and identity mapping, preserve
source accounting and deletion evidence, and rehearse restore and failure with
synthetic data. Measure real recovery time, data-loss window and backup-expiry
enforcement. Never restore into/reset the existing owner staging project or
automatically re-enable its accounts, jobs or sessions. Public production remains
subject to the owner's explicit final review.

## Rollback

The local rehearsal can close its newly created in-memory database. It does not
alter an existing project or offer an in-place merge/reset path. Keep failed
artifacts private for diagnosis. A future managed recovery stays isolated and
inaccessible on failure; resuming the original system is a separate reviewed
decision using its latest deletion and accounting state.


## Encrypted artifact preparation

The recovery command now runs 17 encryption and 19 job/access checks, then its
46-check database rehearsal through an actual encrypted synthetic backup file.
Use the [backup review](../reviews/ev-encrypted-backup-qualification.md) for
the envelope contract and prepared R2 lifecycle. Keep the production recovery
key separate; no actual key or remote backup was created by local qualification.
Decrypt only with the independently expected source/purpose, then apply every
existing current-ledger, schema, identity and read-only recovery check above.
