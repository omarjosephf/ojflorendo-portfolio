# ADR-0016: E.V management platform and durable conversation storage

- Status: Owner-authorized implementation; local preview first; live activation pending qualification
- Date: 2026-09-08
- Owner: OJ Florendo
- Risk: R2; production data collection and publication are separate release steps

## Decision

Implement the approved [management roadmap](../roadmaps/ev-management-platform.md)
as an operational workspace in the existing Next.js application. Retain Python
for retrieval and generation. Qualify Supabase PostgreSQL and managed Auth for
conversation persistence, owner access and knowledge drafts. Python does not
replace a database or determine the hosting provider.

The first preview uses conspicuously labelled synthetic conversations and a
local file adapter for editable drafts and gap triage. It requires an explicit
server flag, development mode, a loopback host and a non-Vercel environment.
The launch script binds to 127.0.0.1. Pages and APIs independently enforce the
boundary; response caching is disabled. A portfolio route group separates the public layout from the management
workspace without changing public URLs. The local adapter is not production persistence.

Keep all model dispatch disabled in the preview. Derive analytics from events
and the selected reporting window, with numerators and denominators visible.
Citation frequency is an exposure signal, not a claim of user interest. A
content gap can become a draft, but saving or reviewing it cannot publish facts
or change the answering corpus. Published knowledge remains Git controlled.

Use same-browser guest continuity before requiring accounts. Production storage
must associate records with a verified auth principal, enforce row-level access,
use idempotent writes, distinguish unsaved replies, and delete raw transcripts
after the documented retention period. Owner access requires managed identity
and MFA; a local preview switch is never an owner authentication mechanism.

## Alternatives and consequences

An exported report cannot support a durable editorial workflow. A bespoke password
system would create an unnecessary security boundary. Moving all Python work to
Vercel immediately would leave model packaging and durable spend controls
unqualified. These concerns are independent: storage integration can progress
while both application workloads are assessed for one hosting provider.

The development preview deliberately does not test Supabase network behaviour,
managed authentication or production concurrency. Local SQL checks are necessary
but cannot establish those claims. No subscription is purchased by this decision.

## Verification and rollback

Use the [threat model](../threat-models/ev-management.md) and
[runbook](../runbooks/ev-management.md). Require production-denial checks,
workflow persistence checks, accessibility checks, SQL isolation tests and the
existing portfolio quality gate. Remove the preview flag to disable local access.
Keep live persistence disabled until the storage, retention and identity gates
pass. Public release still requires the owner's preview review.

## Staging qualification and guest continuity, 9 September 2026

The owner approved the long-term recommendation and Free staging setup. The
reviewed schema is applied to a disposable Free project through CLI migration
history. Real managed guest identities, concurrent retries and synthetic-owner
TOTP were tested; these do not enroll the human owner or authorize public release.

A live test found that signing out invalidated Auth HTTP access while a signed
JWT could still read PostgREST rows. The second migration adds an active
`auth.sessions` requirement to every visitor table policy and guest definer RPC.
Owner access also checks the current session's MFA level. The same live test now
passes. This Supabase Auth schema dependency is an explicit portability cost.

The local visitor preview now offers opt-in 30-day saved chats. Managed guest
session tokens stay in HttpOnly, SameSite=Strict cookies scoped to `/api/`; HTTPS
adds Secure. The server verifies the identity, refreshes through one bounded Auth
request, and revokes the managed session before confirming disconnect. The
preview boundary remains mandatory; these cookie names/settings are not a
production activation mechanism. Anonymous signup is disabled outside controlled
qualification until public signup protection and identity cleanup are qualified.

A durable claim precedes model dispatch for each stable conversation/request
pair. An unfinished or uncertain claim never grants another dispatch. Completed
results replay without a model call. A save failure returns the visible answer
with a user-bound, authenticated receipt; retry verifies its 30-minute expiry and
saves only. The signature key stays server-side. Receipts are held in page memory;
refreshing can lose the ability to retry a failed save, so the UI asks the visitor
to retry or copy the reply before leaving. Existing tab history remains bounded.

Saved response payloads are historical UI records, not new retrieval evidence.
The storage path does not fabricate retrieval traces or inferred gap diagnoses.
Instrumented owner analytics and the live editorial adapter remain qualification
work. See [staging evidence](../reviews/ev-storage-staging-review.md).

## Retention and recovery extension, 9 September 2026

Migration `202609090003` adds bounded physical retention (1000 expired
conversations/gap reviews per run), private inactive-anonymous cleanup, and
identifier-only deletion tombstones. The qualified staging cadence is hourly; expiry RLS
hides content immediately, while physical deletion can follow at the next run.
An account is removed only after 30 days without sign-in, no retained chat and
no owner/editorial association. Supabase documents SQL cleanup of anonymous
users; sessions are removed by its foreign-key cascade.
[Supabase anonymous users](https://supabase.com/docs/guides/auth/auth-anonymous)

Application backups may be retained for at most seven days. Preserve tombstones
for 45 days and content-free retention receipts for 90 days. Restore into an
isolated destination with access disabled, merge the *current* deletion ledger,
reconcile deleted and expired conversations, then verify grants and RLS before
access. If the current deletion ledger cannot be recovered, do not restore old
transcripts; restore approved knowledge/configuration and start empty chats.
Never reactivate sessions or refresh tokens from an application-data backup.
This does not claim full Supabase Auth disaster recovery or Storage-object backup.

## Staging owner access, 9 September 2026

The loopback-only `/manage/live` page now uses managed password authentication
and TOTP MFA, separate HttpOnly cookies scoped to `/api/management/`, verified
Auth identity and a database-owned role allowlist. The caller-only status RPC
distinguishes owner registration from current AAL2. Every transcript read checks
both. The API lists at most 25 current E.V conversations per page with validated
keyset cursors; records remain subject to the live RLS/session boundary.

One-time password setup is explicitly armed by an operator-created, ignored
local file naming the already provisioned user and expiring within 24 hours.
This relies on the trusted local machine, never a hosted authentication scheme.
Same-origin JSON and the development/loopback gates apply. The form cannot choose
a user ID, add an owner or change an arbitrary account. A local atomic lock
prevents competing resets; a dispatched but uncertain update is not retried
silently. Successful verified owner sign-in consumes the setup file. Passwords
and TOTP setup keys are never written to the setup record or application logs.

An interrupted TOTP setup can replace only this flow's unverified factor.
Verified authenticators are never deleted by enrollment. The measured managed
Auth enrollment response includes a 518475-byte SVG; only that response permits
up to 1 MB, while the browser receives just the setup key and factor ID. Other
owner Auth replies remain capped at 200 KB and the shared request deadline remains
six seconds. Owner MFA recovery remains an operator-assisted, verified-identity
procedure; possession of an old signed-out JWT cannot grant access.

## Live editorial and reporting, 9 September 2026

Migration `202609090005` gates draft writes through a revision-checked, idempotent
RPC, revokes direct authenticated mutation and records content-free save receipts.
It bounds drafts/receipts at 100/10000 per owner. Receipts are audit evidence, not
full version snapshots. The live UI preserves uncertain editor text, retries the
same request, and offers an explicit saved-version comparison after conflict.

Owner reporting uses an invoker-security function under existing RLS, requires
current owner MFA and aggregates at most 1000 recent retained questions. Results
state their time window, sample bound, diagnostic coverage and feedback denominators.
Question grouping is lexical; source exposure never asserts user interest.
Draft saving does not publish or execute a document, URL fetch or model call.

Definer functions use an empty search path, fully qualified tables and explicit
execute grants, consistent with [Supabase function guidance](https://supabase.com/docs/guides/database/functions).
The report retains RLS rather than using a service-role reporting credential.
[Current staging evidence](../reviews/ev-storage-staging-review.md) records the
executed concurrency, revocation and browser checks and their limits.

## Isolated application-data recovery, 9 September 2026

The local PGlite rehearsal now qualifies synthetic application-data serialization
into a fresh destination with runtime access disabled, current conversation
deletion-ledger merge, expiry/cascade reconciliation and catalog/RLS checks before
read-only access. Missing latest ledger starts empty chats. Independently approved
exact draft bytes can be restored; Auth records, owner assignments, credentials
and budget accounting are excluded. Missing destination principals fail closed.

All gap reviews are discarded because the current schema has no gap-deletion
ledger or conversation FK. This conservative loss avoids resurrecting deleted
questions/notes; granular gap recovery needs additional provenance. Restore does
not authorize generation or mutations: current accounting/idempotency and fresh
identity verification remain independent gates. No migration is added by this
rehearsal and the seven-migration staging schema is unchanged.

See the [recovery contract](../runbooks/ev-application-restore.md) and
[46-check evidence review](../reviews/ev-application-restore-qualification.md).
This is not managed Supabase recovery, operational off-site backup qualification
or full Auth disaster recovery. Package 13 remains incomplete.


## Trusted answer observations, 9 September 2026

Risk class R2. The backend emits an opt-in, bounded event header only to callers
presenting its configured shared secret, including when the demo's general
secret requirement is off. Wire-v3 public response bodies are unchanged.
Observations contain actual retrieved/cited source IDs, application-assigned
serving route/model, elapsed response time and startup corpus/prompt digests.
No question, answer prose, passage text, credentials or provider errors enter
the event header. Unknown runtime identity omits telemetry rather than inventing it.

The frontend validates event shape, known corpus sources and agreement with the
validated public response. Invalid/missing events leave an explicit coverage gap.
An unsupported response is `not_covered`; it does not prove missing content or a
retrieval miss. Transport failures currently have no completed backend event.

Migration `202609090007` provides a service-role-only completion RPC that saves
the response and event in one transaction, preserving admission and deletion
locks and rejecting a changed event on replay. Direct event reads now require
the current MFA owner; guest tokens cannot read their own diagnostics through
PostgREST. The owner transcript fetch is separately bounded and uses owner RLS.

New save-only receipts use AES-256-GCM with a random 96-bit nonce and versioned
associated data, so owner observations are not readable in visitor-held receipts.
User/request/input/expiry binding and the 30-minute lifetime remain. Previous
HMAC receipts without events still verify until their original expiry. Failed
saves and replay never authorize another model dispatch.

See [event qualification](../reviews/ev-answer-events-qualification.md).
The local preview continues to disable model calls. Staging application of this
migration and deployed backend integration remain separate from local evidence.


## Live human gap review, 9 September 2026

Risk class R2. Migration `202609090008` connects each new review to one retained
assistant message. The owner queue reads up to 100 recent unsupported/unavailable
replies and negative-feedback turns from E.V conversations. The reported outcome
and the human diagnosis are separate; diagnosis starts `unclassified`.

The active MFA owner may save a diagnosis, review status, note and link to an
existing draft they own. A link or a `drafted`/`closed` status does not publish
knowledge, modify the answering corpus or invoke a provider. Direct table writes
are revoked. A checked revision and request fingerprint reject changed retries
and stale editors. A lost save retains its request ID. A retry after a later
edit conflicts rather than overwriting that edit; it is not historical revision
recovery. Explicit replacement/discard actions keep editing decisions visible.

The save locks the conversation before the review, matching deletion/retention.
Review expiry equals conversation expiry, and the message FK cascades deletion.
The maintenance receipt counts linked reviews removed by cascade as well as
independently expired reviews. A run remains bounded to 1000 conversations and
their bounded descendants, plus 1000 independent reviews. Existing legacy reviews
remain independently expiring. Restore still discards all reviews conservatively;
adding a message FK does not retroactively recover missing legacy provenance.

See [live gap qualification](../reviews/ev-live-gap-qualification.md).


## Protected guest creation and owner sign-in, 9 September 2026

Risk class R2. A new managed guest requires explicit retention consent, a public
Auth site key and a bounded fresh CAPTCHA token; absent configuration closes
signup. Existing verified sessions do not require another challenge. Supabase
Auth verifies the token once; the application must not consume it first with
Siteverify. Site-key configuration does not prove managed enforcement.

The shared nonce-bearing widget handles expiry, errors, cancellation and retries
without changing the contact form's separate ADR-0005 server policy. Managed
CAPTCHA also covers owner password sign-in; that flow passes the token and still
requires the current owner and MFA. Bootstrap is closed while CAPTCHA is armed.
Public activation requires actual managed positive/negative checks, host/rate
configuration and a verified owner recovery path. See
[qualification and activation sequence](../reviews/ev-auth-captcha-qualification.md).


The [explicit production-mode candidate](../reviews/ev-production-mode-qualification.md)
adds a separately enabled, exact-origin Vercel production path while keeping
sample data and password bootstrap local. Managed identity, owner MFA, RLS,
same-origin JSON and no-store boundaries remain required. No production setting
was enabled. Managed integration/recovery, edge rules for both answer paths,
answer qualification and final owner release approval remain gates.


## Encrypted application backup preparation, 9 September 2026

The owner selected Cloudflare R2 for preparation; subscription checkout/charges
remain unapproved. A local AES-256-GCM envelope binds purpose/source/capture age
and enforces seven-day expiry, without credentials, uploads or managed restore.
Seventeen boundary checks and the encrypted-file 46-check recovery rehearsal
pass. Encryption never replaces current deletion, identity or spending evidence.
The [review](../reviews/ev-encrypted-backup-qualification.md) records key custody,
prepared private/EU/prefix-scoped R2 configuration and actual managed qualification.
The [operator job](../runbooks/ev-backups.md) now adds a scoped PostgreSQL reader,
verified encrypted uploads, retention cleanup and a disabled hourly GitHub job.
Nineteen additional local checks pass. The standard pg/S3 SDKs are pinned operator
dependencies; no application runtime package entry changed. Actual reader/login,
key custody, account checkout, scheduling and managed restoration remain inactive.


### Subsequent R2 infrastructure approval

The owner separately approved R2 subscription activation at the reviewed Standard
usage rates and one empty private EU bucket. Activation and bucket creation are
verified. The bucket uses Standard storage, public access disabled, no custom
domain/CORS/bucket lock and the reviewed six-day backup-prefix expiry with one-day
multipart cleanup. Existing default cleanup remains intact. This decision does
not activate database credentials, encryption keys, real exports, scheduled
backups, managed recovery or public application release. No data was uploaded.
