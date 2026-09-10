# E.V management operations

Status: local management preview with qualified guest storage in Free staging. See [ADR-0016](../adr/0016-ev-management-storage-and-preview.md).

## Local preview

Run `npm run preview:management`, then open `http://127.0.0.1:3215/manage`.
The launcher sets the development-only preview flag and binds the server to
loopback. No provider request or paid service is needed. All displayed chats
are explicitly synthetic samples. Editable drafts and triage decisions are
stored in `.ev-preview/workspace/state.json`, which is ignored by Git. Refresh the page
to verify persistence. Save conflicts preserve the editor text; reload to obtain
the current revision before retrying. Failed writes never show a saved state.

Stop the process or unset `EV_MANAGEMENT_MODE` to disable access. A production
build denies the page and APIs even if the flag is accidentally present. The
preview flag must never be treated as live owner authentication.

## Recovery

If the local store is unavailable or corrupt, the API fails visibly and refuses
to overwrite it. Stop the preview, preserve the affected file for inspection,
and restore a known-good local copy. The mutation lock fails closed; if a process
was interrupted during a write, verify no preview server is running before
removing the stale `.ev-preview/workspace/write.lock` directory. Do not automatically delete
or reset a store after an error. No production transcript is stored here.

## Live activation checklist

Live storage is disabled until a disposable Supabase project passes the checked
SQL fixture and real Auth/MFA tests. Use server-only credentials, run additive
migrations in staging, review exact grants, verify visitor A/B isolation and
owner MFA, and qualify 30-day transcript deletion including a restored backup.
Enable a clear visitor storage notice and same-browser guest continuity before
collecting text. Keep backup retention and raw-record deletion distinct.

Review the [delivery checklist](../roadmaps/ev-management-progress.md) for
remaining work. Owner preview review precedes any public release; a green local
preview does not qualify the existing chatbot's model migration or Beta removal.

## SQL and staging adapter

The [Supabase implementation notes](../../supabase/README.md) describe the
migration, credentials, retry semantics and required live qualification. The
mock Auth fixture is test-only and must never be applied to a real project.
`npm run test:management:sql` runs 42 local PostgreSQL checks. The conversation
API and managed guest cookies are wired into the local visitor preview, behind
`EV_CONVERSATION_STORAGE=staging`. Production still denies every storage endpoint.
Use ignored `.env.local` values from the approved staging project and a separate
random 32-byte hexadecimal `EV_CONVERSATION_RECEIPT_SECRET`. Never use a production
service key in the local preview. The normal preview launcher still disables
model dispatch. Browser tests blank all live credentials and intercept the APIs.

See the [actual staging evidence](../reviews/ev-storage-staging-review.md).
An unfinished generation claim is not permission to call the model again. A
failed save returns a 30-minute signed receipt; retrying that receipt only saves
the existing answer. Preserve the page until saving succeeds or copy the reply.
Key rotation invalidates outstanding receipts. Deleting a conversation cascades
to messages, result payloads, feedback, events and generation claims.

## Pre-launch operations evidence

The [practices audit](../reviews/ev-rag-platform-practices-audit.md) records live
work that local fixtures cannot prove. Qualify anonymous signup protection and
identity cleanup separately from conversation expiry. Rehearse a database restore
in isolation and reapply expiry/deletion rules before enabling access. Keep raw
transcripts out of operational logs; retain only the identifiers, counts and
failure categories needed for diagnosis.

Review the [platform comparison](../reviews/ev-long-term-platform-review.md)
before staging provisioning or app-host migration. No paid tier is required for
the local preview. Its System/Light/Dark selector shares the portfolio and chat
preference on this origin; see [ADR-0017](../adr/0017-shared-color-preference.md).

## Owner staging preview

Open `http://127.0.0.1:3215/manage/live` from the sample workspace. The owner
account is distinct from a Supabase dashboard account. After verified staging
provisioning, an operator may arm `.ev-preview/owner-setup.json` with `version: 1`,
the exact `userId`, approved `email`, and an `expiresAt` within the next 24 hours.
The owner chooses a password in the local form and enters their authenticator's
code there. Never request credentials in chat or commit the setup file.

The file is consumed after success. If an update is uncertain, preserve the
`.lock` directory and try normal sign-in with the chosen password. Confirm the
account state before deliberately rearming a reset. The owner role is assigned
only by the database operator; signing up or editable user metadata never grants
it. No owner account is created by the login or setup form.

The live inbox shows current saved records, while the six-section sample workspace
remains explicitly synthetic. Live drafts and bounded reports are connected; full runtime diagnostic instrumentation
and gap-triage integration remain. Signing out clears the displayed private transcript;
failed revocation does not falsely claim success or erase the cookies.

## First authenticator setup

The six-digit code is generated in the owner's authenticator app; E.V does not
send it by email or SMS. Install an authenticator such as
[Google Authenticator](https://www.google.com/mobile/authenticator/), open it on
the phone, then choose **Set up authenticator** in the local E.V preview.
In the phone app, choose **+**, **Enter a setup key**, name the account
**E.V Management**, enter the displayed key and select **Time based** if asked.
Save the account, then enter its current six-digit code in E.V and choose
**Verify**. Keep the preview open until verification. Never put the setup key,
code or password in a chat, screenshot, log or handover.

If a code is expiring, wait for the next one. Confirm the phone uses automatic
date and time if fresh codes fail. An existing verified factor uses its existing
app entry; recovery requires verified owner assistance, not silent MFA removal.
See [Google's code troubleshooting](https://support.google.com/accounts/answer/1066447).

## Staging retention

After reviewing migrations, apply [the scheduler SQL](../../supabase/operations/schedule-retention.sql)
to the approved project. On 9 September an actual scheduled run removed the seeded
expired conversation and inactive anonymous identity; the job then moved to hourly
at minute 5 UTC. Inspect `cron.job_run_details` for failures and the count of expired
rows left after a run. The secondary job prunes only E.V scheduler history older
than seven days. It does not affect unrelated database jobs.

Deletion is hidden immediately by RLS at expiry; physical cleanup drains 1000
conversations and 1000 gap reviews per run. Recently signed-in users, non-anonymous
accounts, retained conversations, owner identities and editorial authors are excluded
from inactive guest deletion. Deletion tombstones contain only conversation UUID
and deletion timestamp, retained for 45 days; operation receipts last 90 days.

Before restore access, merge the current deletion ledger and invoke
`ev_private.reconcile_restored_conversations()` in isolation. If the latest ledger
is lost, recover knowledge/configuration and start with empty chats. The executed
local and transactional live replay checks do not substitute for an isolated
full database backup/restore rehearsal. Public signup still requires CAPTCHA.

## Live owner drafts and reports

On the live workspace, expand **Conversation reporting** or **Knowledge drafts**.
Refresh loads real staging data. Reports cover rolling seven/30-day windows and
state when the newest 1000-question bound truncates totals. Missing event coverage
is shown explicitly; zero observed citations cannot establish disinterest.

A new knowledge draft needs title, verified information and provenance. Use
**Save knowledge draft**, then inspect its receipt/history. An uncertain save
keeps the editor text and the stable retry request in page memory. Retry before
leaving. The browser warns about unsaved edits on page unload; it does not persist
private draft text in browser storage. After a conflict, **Check saved version**
shows the current text without overwriting the editor. Replacing the editor
requires the explicit **Replace editor with saved version** action.

Authenticated direct draft writes are revoked. The RPC enforces expected revision,
per-owner serialization, idempotency and current MFA. API reads list the 100 most
recent drafts; histories contain the latest 20 content-free receipts. Capacity is
100 drafts/10000 receipts per owner. Earlier body versions are not retained by
these receipts. Do not claim historical text restoration. Operator deletion of a
draft cascades receipts; review/export before any authorized archive or deletion.

Public knowledge still changes through the reviewed Git/corpus release process.
No live draft status grants publication or changes an embedding artifact.

## Isolated application-data restore checkpoint

Run `npm run test:management:restore` for the 46-check synthetic local rehearsal.
Follow the [recovery runbook](ev-application-restore.md): disable destination
access, restore reviewed schema and allowlisted data, merge the independently
current conversation ledger, reconcile expiry/deletion, discard all gaps and
verify catalog/RLS before read-only access. Missing current ledger starts empty
chats. Auth sessions/credentials, owner assignments and budgets are excluded.
Managed restore and operational off-site backup/retention remain unqualified;
do not run an in-place restore against the existing staging owner project.


## Trusted answer events

See [qualification and staging proposal](../reviews/ev-answer-events-qualification.md).
After the separately approved migration/backend rollout, saved replies with
validated events appear in the live inbox under **Inspect retrieval details**.
The report's diagnostic coverage denominator remains explicit. A reply without
an event is not retroactively assigned a diagnosis or fabricated retrieval trace.
`not_covered` means inspect the source material before triage.

New retry receipts are encrypted and authenticated; older signed receipts without
events remain valid until their existing expiry. Neither format can start another
model call. Do not log event headers or receipt contents. Diagnostics require the
current MFA owner even through direct database REST access.


## Live gap review

After the separately approved migration rollout, expand **Gap reviews** and
refresh the queue. Inspect the recorded reply and source IDs before selecting
a diagnosis. Save a knowledge draft in the editor, then link it to a review;
refresh the queue to load newly saved draft choices before starting review edits.
Saved review status never publishes content. Keep an unsaved note until the save
is confirmed. A stale revision leaves the note in place; **Replace review with
saved version** explicitly discards it and loads current data.

Deleting a conversation removes its linked review notes; retained legacy reviews
expire independently. Maintenance receipts include cascade removals. Recovery
continues to discard reviews. See [qualification and staging proposal](../reviews/ev-live-gap-qualification.md).


## Managed signup protection

The [CAPTCHA qualification and activation sequence](../reviews/ev-auth-captcha-qualification.md)
records the local implementation and remaining managed checks. Use the separate
public `EV_AUTH_TURNSTILE_SITE_KEY`; configure the corresponding secret only in
Supabase Auth. Keep signup closed until provider enforcement, approved hosts and
limits, owner password/MFA sign-in and recovery are verified. Setting a site key
alone cannot protect the direct Auth endpoint. Never validate a single-use token
twice. Existing sessions remain usable when new signup is unavailable.


The [explicit production-mode candidate](../reviews/ev-production-mode-qualification.md)
adds a separately enabled, exact-origin Vercel production path while keeping
sample data and password bootstrap local. Managed identity, owner MFA, RLS,
same-origin JSON and no-store boundaries remain required. No production setting
was enabled. Managed integration/recovery, edge rules for both answer paths,
answer qualification and final owner release approval remain gates.
