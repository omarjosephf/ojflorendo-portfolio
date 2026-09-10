# Supabase conversation storage candidate

Status: schema and guest storage qualified in Free staging; public collection remains disabled.
See [ADR-0016](../docs/adr/0016-ev-management-storage-and-preview.md) and the
[management runbook](../docs/runbooks/ev-management.md).

`migrations/202609080001_ev_management.sql` is an additive migration for a
**disposable staging project first**. Supabase supplies `auth.users`, `auth.uid`,
`auth.jwt` and managed roles. The migration is transactional; apply it once through
migration history. It deliberately does not provision an owner, configure Auth,
create a scheduler or collect conversations.

`tests/auth-fixture.sql` creates mocked roles and Auth helpers only for the local
PGlite harness. **Never run that fixture in a real Supabase project.** Run local
checks with `npm run test:management:sql` (30 checks across all three migrations). These execute the actual schema and
policies in PostgreSQL, but a single-connection local engine cannot verify real
JWT/MFA behavior or races between separate hosted database connections.

## Access model

Anonymous managed Auth users are verified principals with the `authenticated`
role, not the unauthenticated `anon` database role. RLS limits guests to their own
unexpired conversations and replies. Owner access additionally requires an enabled
row in the private owner allowlist and a managed non-anonymous `aal2` session.
Granting owner access is an administrative operation, never a browser action.
[Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous),
[MFA](https://supabase.com/docs/guides/auth/auth-mfa)

Clients cannot insert assistant messages. The server writer has access only to
its explicitly granted assistant-write/retention RPCs; broad table grants are
revoked. Default schema grants matter independently of RLS. Keep modern
`sb_secret_` keys on the server and use `sb_publishable_` with a verified user JWT
for guest access. The adapter rejects redirects and caller-chosen service hosts.
[API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)

Conversation/request UUIDs are stable retry identifiers. Identical writes return
the existing record; changed content or trace data with the same identity fails.
Assistant text and answer-event metadata are stored in one transaction. Database
persistence alone does not prevent duplicate paid model dispatch; live chat wiring
must coordinate requests with the answering runtime's admission/idempotency rules.

## Staging qualification before activation

Use the placeholders in `.env.example` through ignored local environment files.
The current staging API also requires the development-only preview boundary and
`EV_CONVERSATION_STORAGE=staging`; it remains inaccessible in production even
when accidentally configured. It is connected to the local visitor chatbot through managed HttpOnly guest sessions.
Do not change this gate merely to make a live demo work.

Verify two real guest principals cannot cross-read or write; expired/revoked JWTs
fail; the owner cannot access editorial data before MFA; anonymous users cannot
self-promote; and service-key HTTP requests have only the intended grants. Test
concurrent requests over separate database connections, uncertain network results,
retry conflicts and text preservation after failed saving.

Raw conversations expire 30 days after creation. Queries hide expired records
before purge. Qualify a scheduled retention RPC, content-free deletion counts,
backup retention and restore-then-purge behavior. Knowledge drafts are reviewed
editorial content and have an independent lifecycle. Add owner/guest deletion
workflows and a storage notice before collecting text. No scheduler has been
created by this migration.

## Anonymous identities and restored backups

Anonymous identities have a lifecycle separate from conversation rows. The
current purge RPC does not delete `auth.users`. Before live signup, enable an
appropriate CAPTCHA/Turnstile policy and qualify a bounded cleanup job for
inactive, unlinked guest identities. Protect active records, owners and accounts
that were linked to a permanent identity. Do not blindly delete all identities
older than the transcript retention period.
[Supabase anonymous lifecycle](https://supabase.com/docs/guides/auth/auth-anonymous).

A restored backup can contain previously expired or deleted text. Restore to an
isolated environment, reapply expiry/deletion records, run the retention policy,
and verify guest/owner access before allowing reads. Record counts and recovery
time without placing raw transcripts or credentials in the public evidence.

The owner approved the [long-term platform comparison](../docs/reviews/ev-long-term-platform-review.md)
and Free staging provisioning. See the [live staging evidence](../docs/reviews/ev-storage-staging-review.md).
This does not constitute a paid-platform or public-release decision.


The second migration binds RLS and guest RPCs to an active managed session,
closing the signed-out-JWT access gap found live. The third adds one-time
server generation claims and immutable historical response payloads. Failed
saving can be retried with an expiring signed receipt without dispatching a model.
Both the receipt signature and server key remain outside browser JavaScript.
