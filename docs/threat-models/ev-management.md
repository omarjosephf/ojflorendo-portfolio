# E.V management platform threat model

Status: local implementation with qualified guest/owner staging access; production qualification pending. This
supplements [ADR-0016](../adr/0016-ev-management-storage-and-preview.md).

| Asset / boundary | Failure | Control and evidence required |
| --- | --- | --- |
| Local preview | Accidental public exposure | Explicit development flag, non-Vercel, loopback host; page and API checks; production 404 test; loopback-only launcher |
| Draft API | Cross-origin writes or forged content | Exact same-origin validation, JSON-only, bounded body, strict schema, no HTML rendering or URL fetching |
| Local draft file | Lost updates, corruption, accidental publication | Atomic replace, exclusive mutation lock, revision checks, bounded records, ignored directory; fail visibly on corrupt/unavailable state |
| Visitor transcript | Another visitor reads or changes it | Verified auth identity; RLS tested with anonymous, guest A, guest B, owner, expired rows; no service key in browser |
| Owner tools | Visitor grants themselves privileges | Owner roles in private schema; no browser role writes; managed MFA; owner policies must require AAL2 |
| Knowledge | A malicious chat becomes an instruction or public fact | Treat transcripts and drafts as untrusted; human provenance review; staged evaluation; Git release and rollback |
| Analytics | Counts expose raw text or misrepresent interest | Owner-only raw records; aggregate only eligible records; explicit denominators; no inference of disinterest from low exposure |
| Storage failure | Answer claims it was saved or paid request repeats | Idempotent message keys; explicit unsaved state; persistence retry never dispatches a model |
| Retention | Expired text remains available indefinitely | Time-filtered access plus scheduled deletion, deletion evidence and restore procedure; backups reviewed separately |
| Hosting migration | Restart resets budget; many instances overspend | Transactional shared admission qualified before any Vercel generation activation |

Local preview data are synthetic. Locally written draft text stays in the ignored
preview directory and is not added to public source. Do not enter personal or
sensitive information: this development interface is not a production vault.

Live staging now verifies managed guest isolation, concurrent writes, synthetic
owner MFA, revocation at both Auth and database boundaries, deletion and manual
retention. See the [staging review](../reviews/ev-storage-staging-review.md).
Remaining: human owner enrollment, protected public signup, isolated backup
restore rehearsal, live editorial/analytics integration, app-host spend
admission and owner review.

Guest tokens remain in HttpOnly cookies. Same-origin JSON and SameSite=Strict
protect mutations. Untrusted cookie tokens are checked against managed Auth;
active-session RLS also prevents direct PostgREST access after logout. Fixed
Supabase origins, redirect denial, byte limits and deadlines protect the server
transport. A signed save-only receipt binds user, conversation, request, exact
result and expiry; it cannot grant model dispatch. Lost generation claims remain
unavailable rather than permitting an unaccounted retry.

The managed owner inbox verifies Auth plus the trusted owner role and current MFA
before each live read. A signed-in principal without AAL2 cannot read guest chats.
Password bootstrap is explicitly armed in an expiring ignored local file naming
one provisioned identity. It is protected by the loopback/development/origin gates
and an atomic one-time lock; it must never be enabled for a hosted application.
A lost or compromised local machine is outside that preview trust boundary and
requires revoking its credentials/sessions. Setup credentials are not logged.

Staging signup is closed to the public. Scheduled hourly maintenance and a seeded
canary have passed; identity cleanup preserves active/permanent/owner records.
Deletion tombstones prevent known deleted conversations from surviving a restore
reconciliation. A lost current deletion ledger means old chats are not restored.
This is not yet a qualified full database backup and restore process.

The live operations route requires verified managed owner MFA and independent
loopback/production denial. Draft RPCs enforce expected revisions and immutable
request receipts, reject direct table mutation, and never publish draft text.
Reports remain under invoker RLS and display bounded coverage. Receipt history
contains no previous body text; retention is tied to the draft and capped per owner.
Uncertain edits stay in page memory; explicit replacement is required after
comparison with a current saved version. Full runtime diagnostics remain unconnected.

## Shared qualification accounting boundary

The separate budget schema contains only configuration, execution identities and
permanent reservations. All tables have RLS and no direct runtime grants; only
a constrained server-role RPC is exposed. One aggregate row lock serializes both
workloads. An expired caller cannot replenish money or occupancy, and unknown
admission does not grant retries. Orphaned serverless jobs deliberately stop
availability until reviewed recovery; a consistent stale database restore
requires external latest-accounting evidence. No production generation or real
ledger is activated. See [ADR-0018](../adr/0018-shared-qualification-admission.md).

## Restored application data

Recovery must not resurrect a chat deleted after its backup, revive old sessions,
restore broad ACLs or reset paid accounting. The isolated rehearsal loads only
allowlisted application rows under revoked runtime schema access, merges the
independently pinned current conversation ledger, checks expiry/cascades and
audits actual grants/RLS/policies/functions/constraints before read-only access.
Missing ledger starts empty chats; bad evidence or catalog drift fails closed.

Gap reviews have no complete deletion ledger and are all discarded. Knowledge
requires current approval of exact row bytes. Auth/owner/budget tables are never
restored. Fresh synthetic session/MFA checks test local SQL behavior only; managed
identity recovery and externally established ledger completeness remain open.
The source must stop writes/deletions at cutover. See the
[recovery runbook](../runbooks/ev-application-restore.md).


Trusted event extension: authenticated backend opt-in, bounded source-only
observations, corpus allowlist and response agreement protect event provenance.
The atomic completion RPC accepts only the service role. RLS restricts event
reads to the active MFA owner, including guest attempts to query their own event.
AES-GCM save receipts keep diagnostics confidential and reject tampering; legacy
HMAC receipts may not carry events. Refusals are not automatic gap diagnoses.
See [event qualification](../reviews/ev-answer-events-qualification.md).


Live gap review: current owner MFA guards the queue and mutation RPC. No browser
direct writes remain. Review input is bounded and treated as text; diagnosis is
explicit human input, separate from observed outcomes. Conversation-first locks,
checked revisions and request fingerprints prevent stale overwrite and deletion
resurrection. Linked drafts must exist and belong to the editor; they remain
unpublished. Message FK cascades and matching expiry remove review notes with
the underlying retained conversation. Recovery still discards all review rows.


Managed Auth CAPTCHA preparation: new guest creation rejects missing config and
missing/oversized tokens before dispatch. Tokens are forwarded once to managed
Auth, never logged or echoed, and cleared on expiry/error/attempt/cancel. Existing
sessions are verified independently. The same project-wide protection requires
owner password CAPTCHA support while retaining MFA. Bounded widget loading and
late-callback suppression prevent stale challenge state. Neither a public site
key nor a per-instance courtesy limiter proves direct Auth abuse protection;
managed enforcement and recovery remain release gates. See the
[CAPTCHA qualification](../reviews/ev-auth-captcha-qualification.md).


The [explicit production-mode candidate](../reviews/ev-production-mode-qualification.md)
adds a separately enabled, exact-origin Vercel production path while keeping
sample data and password bootstrap local. Managed identity, owner MFA, RLS,
same-origin JSON and no-store boundaries remain required. No production setting
was enabled. Managed integration/recovery, edge rules for both answer paths,
answer qualification and final owner release approval remain gates.


## Backup confidentiality extension

The [encrypted-backup candidate](../reviews/ev-encrypted-backup-qualification.md)
rejects wrong-key, tampered, expired and cross-source/purpose envelopes before
returning plaintext. Backup credentials and key custody remain independent;
compromise of both defeats confidentiality. A valid envelope can still be stale,
incomplete or unreviewed, so existing restore/reconciliation checks remain.
Local expiry does not physically delete remote files. R2 lifecycle delay, failed
cleanup, key loss and operational backup failure still need managed evidence.


The prepared operator job adds a dedicated NOLOGIN reader without RLS bypass and
explicit approved-column grants. It checks migration versions/column types,
verifies PostgreSQL TLS, encrypts in memory, forbids overwrites and verifies remote
bytes and cleanup. The secret-bearing workflow is restricted to reviewed main
with no PR trigger or artifact upload. Its environment must enforce the branch
restriction at activation. Compromised main or runner access can expose job
credentials and plaintext in memory; environment/repository protection and
separate recovery-key custody remain necessary. Native job failure reporting
cannot detect a scheduler that never started; missed-run detection remains a
managed operational qualification requirement.
