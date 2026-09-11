# Applying the pending E.V management migrations to staging

Status: **prepared, not executed.** Every step below is an owner-gated action
against a live managed database. Nothing here has been run. Prepared
11 September 2026 from a read-only inspection of the staging project.

## Measured starting state

Read-only inspection of the Supabase project `ev-management-staging`
(`clekxlhhclwgtmismogv`, eu-west-1, PostgreSQL 17.6) on 11 September 2026.

| | |
| --- | --- |
| Migrations applied | 7 — `202609080001` through `202609090006` |
| Migrations pending | 3 — `202609090007`, `202609090008`, `202609110001` |
| Rows in every affected table | **0** |

The row count is the load-bearing fact. `ev_gap_reviews`, `ev_answer_events`,
`ev_messages`, `ev_conversations` and `ev_knowledge_drafts` are all empty, so
none of the column additions, constraint replacements or privilege changes below
can fail against existing data, and none require a backfill. This is a schema
change to an unused database, not a data migration.

That will stop being true the moment real conversations are stored. Re-run the
counts before applying if any time has passed.

## What each pending migration does

**`202609090007_ev_answer_events`** — alters the `ev_events_read` policy and the
`ev_answer_events` table, then adds `public.ev_complete_generation_event()` with
`revoke all` followed by a narrow `grant execute`. Its purpose is that a trusted
observation is saved atomically with the response it describes.

**`202609090008_ev_live_gap_reviews`** — adds `message_id`, `revision`,
`last_request_id` and `last_input_sha256` to `ev_gap_reviews`, replaces the
`diagnosis` check constraint with a wider allowed set, revokes direct
insert/update from `authenticated`, and adds `ev_owner_gaps()` and
`ev_review_gap()`. It also replaces `ev_purge_expired()`. Human triage becomes
attached to the retained reply, and deleting the reply removes the review.

**`202609110001_ev_rls_auto_enable`** — captures the `ensure_rls` event trigger
and `rls_auto_enable()` function that already exist in this database but in no
migration, so the schema becomes reproducible from source. Against this project
the function body is identical and the trigger already exists, so the only
material effect is the `revoke execute … from public, anon, authenticated`,
which closes the advisor finding. See that file's own comments.

## Why this is blocking

`scripts/management-backup-export.mjs` compares the live
`supabase_migrations.schema_migrations` list against
`supabase/operations/ev-backup-contract.json` and aborts on any difference, and
`supabase/operations/prepare-backup-reader.sql` refuses to create the reader role
unless the same list matches. With seven of ten applied, the encrypted backup
path cannot run at all. Everything downstream — an isolated managed restore,
off-site backup activation, the recovery drill — is blocked behind this.

## Application procedure

Apply in version order. Do not batch them into one transaction: each migration
already opens and commits its own, and a combined failure is harder to read.

1. **Re-verify the starting state.** Confirm the applied list is still exactly
   the seven above, and that the affected tables are still empty. If either has
   changed, stop and re-plan — the empty-table assumption is what makes this low
   risk.
2. **Take a restore point.** Supabase Free has no automatic backups, so there is
   no managed point-in-time to fall back to. Because every table is empty there
   is no data to lose, but capture the current schema before starting so the
   before-state is recorded rather than remembered.
3. **Apply `202609090007`**, then confirm `ev_complete_generation_event` exists,
   that `ev_events_read` is the altered policy, and that the migration row was
   recorded.
4. **Apply `202609090008`**, then confirm the four new `ev_gap_reviews` columns,
   the widened `diagnosis` constraint, that `authenticated` no longer holds
   insert/update on that table, and that `ev_owner_gaps` and `ev_review_gap`
   exist.
5. **Apply `202609110001`**, then confirm `ensure_rls` is still present and
   enabled, and that neither `anon` nor `authenticated` retains `EXECUTE` on
   `rls_auto_enable()`.
6. **Re-run the security advisors.** The expected change is that the
   `anon`/`authenticated` SECURITY DEFINER finding for `rls_auto_enable` is gone.
   The eight `rls_enabled_no_policy` INFO findings on `ev_private.*` and
   `budget_private.*` are expected to remain: RLS enabled with no policy is
   deny-all, which is the intended posture for those schemas.
7. **Re-run `npm run docs:check-migration-manifest`** against the repository, and
   confirm the live version list now equals the contract's ten.

## Verification that the blocker is cleared

The point of this work is the backup path, so prove that rather than the
migrations alone:

- `supabase/operations/prepare-backup-reader.sql` no longer aborts with
  `Reviewed migration history required`.
- The exporter's live-version comparison passes.

Creating the reader role, generating its password, minting R2 credentials and
enabling the workflow all remain separate owner actions under
[the backup runbook](ev-backups.md). Applying these migrations does not activate
any backup.

## Rollback

Every table is empty, so rollback is a schema concern only.

- `202609110001` — drop the event trigger and function, or re-grant execute.
- `202609090008` — the added columns, replaced constraint and new functions are
  individually reversible; the revoked `authenticated` grants must be restored
  explicitly if reverting.
- `202609090007` — drop the added function and restore the prior policy.

If a migration fails part-way, it will have rolled its own transaction back.
Confirm `supabase_migrations.schema_migrations` does not list it before retrying.

Reverting also requires reverting the repository side: the contract's
`versions` and `schemaSha256`, the reader setup array, and the count in
[the backup runbook](ev-backups.md) all describe ten reviewed migrations.
`npm run docs:check-migration-manifest` enforces that those three agree.

## Still owner-gated after this is done

Applying these migrations clears one blocker. It does not qualify the managed
platform. Outstanding, per the release packet: real backend event integration,
CAPTCHA enforcement, owner access and recovery testing, an isolated managed
restore, off-site backup activation with key custody, and the deployed
HTTPS/Auth/RLS behaviour review.
