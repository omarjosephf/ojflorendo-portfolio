# Encrypted E.V backup operations

Status: locally qualified preparation, 9 September 2026. The workflow is disabled.
The owner-approved R2 subscription and empty private EU bucket are active. No
managed reader, backup credential, encryption key or live backup has been created.
Activating this runbook requires the owner's separate operational approval.

## Prepared job

The [workflow](../../.github/workflows/ev-backups.yml) runs hourly at minute 17
on the existing repository's `main` branch after explicit activation. It accepts
no PR trigger, uses a dedicated `ev-backups` environment, gives the GitHub token
read access only, disables checkout credentials and installs locked dependencies
without install scripts. Only the backup step receives its scoped secrets.
There is no upload-artifact step and no plaintext backup file on the runner.

The [entry point](../../scripts/run-management-backup.mjs) uses Node 24,
`pg` 8.23.0 and `@aws-sdk/client-s3` 3.1129.0. The two pinned development
dependencies provide the PostgreSQL/TLS and S3/signing protocols; they avoid
custom protocol implementations and are not imported into the application.
The lockfile adds 39 packages and changes no existing runtime-package entries;
the install audit reported zero vulnerabilities.
[PostgreSQL TLS](https://node-postgres.com/features/ssl),
[Cloudflare's S3 SDK guidance](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

Each run first lists this source's `ev-backups/v1/<source>/` prefix and removes
recognized objects whose capture is at least six days old. Deletion responses
alone are insufficient: a subsequent listing must prove removal. Unknown names,
future captures, repeated pagination tokens, partial deletion and excessive
inventory fail the run. Other prefixes are untouched. Inventory is bounded to
2,000 objects; requests, downloads and job execution have finite deadlines.
This cleanup happens before connecting to the source database.

The exporter uses a single repeatable-read, read-only transaction as
`ev_backup_reader`. It requires the exact nine reviewed migration versions and
the exact column names/types in the [contract](../../supabase/operations/ev-backup-contract.json).
The schema digest identifies reviewed migration source with LF-normalized line
endings; it is not an attestation that every live grant or function is unchanged.
Managed privilege inspection remains required. Reads have a 15-second database
statement timeout, at most 10,000 rows per table and a 10 MiB artifact bound.
New columns or an incomplete migration history stop the export.

Application data and the deletion ledger come from that same snapshot. Both
envelopes are validated and encrypted before upload. Objects have unique capture
time/UUID names. Each conditional PUT forbids overwriting, and an uncertain
response is reconciled by readback. A definitely absent object permits one retry
with identical bytes and key; an uncertain read stops the run. Downloaded bytes
must exactly match and authenticate/decrypt successfully. A partial two-file run
is a failure and its uploaded object remains subject to retention.
[R2 conditional operations](https://developers.cloudflare.com/r2/api/s3/api/).

## Exact setup for owner review

1. Inspect the selected account, R2 subscription status and account-wide usage.
   Review any checkout terms and the operating cost before activation. Use one
   private Standard bucket named `ev-private-backups`, explicit EU jurisdiction,
   public `r2.dev` disabled, no custom domain and no CORS/public Worker route.
   Review and apply the [prefix lifecycle](../../supabase/operations/ev-backup-r2-lifecycle.json)
   without replacing unrelated rules. Bucket locks must not prevent expiry.
2. Inspect the source and qualify the pending migrations separately. Review the
   [reader setup SQL](../../supabase/operations/prepare-backup-reader.sql), which
   creates a new **NOLOGIN**, non-superuser, non-inheriting role with no RLS bypass
   or memberships. It grants SELECT on only the ten approved table column sets
   and migration version metadata; table-specific read policies apply only to
   this role. Existing roles cause an error instead of silently changing access.
   Login activation and a new random password are a separate private operation.
3. Verify actual login as that role, TLS certificate verification, full intended
   row access and denial of Auth, owner assignments, budget data, SQL-history
   bodies and all writes. Use direct PostgreSQL port 5432 or the Supabase session
   pooler on port 5432 with the project-bound reader username. Query-string TLS
   overrides, elevated usernames and arbitrary database hosts are rejected.
4. Create bucket-scoped R2 object credentials. Keep bucket administration out of
   the job. Generate a cryptographically random 32-byte encryption key only after
   agreeing recoverable owner custody. Save its recovery copy in the owner's
   existing password manager or encrypted offline storage, outside R2 and the
   repository; verify that copy before the first real backup. Never put a password,
   key, token or transcript in chat, a commit, an Actions artifact or a debug log.
5. Restrict the GitHub `ev-backups` environment to the reviewed `main` branch.
   Configure the values below privately. Keep the repository activation flag
   unset until the synthetic managed end-to-end run, remote expiry/cleanup,
   isolated managed restore and failure notifications have been verified.

| Location | Setting |
| --- | --- |
| Repository variable | `EV_BACKUP_ENABLED=true` is the final activation switch |
| Environment variables | `EV_BACKUP_SOURCE_ID`, `EV_BACKUP_R2_ACCOUNT_ID` |
| Environment secrets | `EV_BACKUP_DATABASE_URL`, optional `EV_BACKUP_DATABASE_CA_PEM` |
| Environment secrets | `EV_BACKUP_R2_ACCESS_KEY_ID`, `EV_BACKUP_R2_SECRET_ACCESS_KEY` |
| Environment secret | `EV_BACKUP_KEY_BASE64`, the encoded random 32-byte key |

## Monitoring, costs and recovery limits

Success reports only status, counts, encrypted byte size, capture time and whether
the previous application object was over two hours old or absent. Failure exits
nonzero with no raw database/storage error. Enable and test the owner's native
Actions failure notifications. During operation, independently inspect the latest
successful run/capture age: a scheduled workflow cannot report that it was never
started. GitHub documents delayed/dropped scheduled runs and automatic disabling
after 60 days of inactivity in public repositories. Missed-run detection and
owner notification must be demonstrated during managed qualification.
[GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

At the artificial maximum of two approximately 14 MiB encrypted objects per hour,
six days is about 4 GiB stored, before any lifecycle delay. Actual application
sizes should be much smaller. This is a capacity illustration, not a spending cap
or free-service guarantee. The R2 free allowance is shared across the account;
account usage and pricing must be reviewed before checkout. The job uses only
Standard storage, never Infrequent Access or multipart upload. Lifecycle remains
a fallback if the runner is unavailable; asynchronous deletion is not a guaranteed
seven-day physical-deletion deadline.
[R2 pricing](https://developers.cloudflare.com/r2/pricing/),
[lifecycle timing](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

An hourly deletion-ledger snapshot is not proof of the independently latest
deletions required at recovery cutover. Follow the [recovery runbook](ev-application-restore.md):
without a current ledger, recover approved knowledge and start empty chats.
Never restore owner identity, Auth sessions, spending allowances or access grants
from these files. Key loss prevents decryption. R2 readback verifies this job's
uploaded bytes; it does not prove managed restoration or future availability.

To stop future runs, disable the repository activation flag. Preserve existing
encrypted objects and their expiry rules. Revoking credentials, changing keys or
removing the reader role requires a separately reviewed incident/change action;
stopping the scheduler does not remove the need for retention verification.


## Verified infrastructure checkpoint

The subscription is Active and the approved bucket is created in the EU. The
dashboard confirms Standard storage, disabled public access/development URL,
no custom domain, CORS or bucket lock, and an empty 0 B object list. The enabled
`expire-encrypted-ev-backups` rule applies only to `ev-backups/v1/`, deleting at
six days and aborting incomplete multipart uploads at one day. The default
seven-day multipart rule remains. No uploaded object or actual expiry event has
been tested. A budget-alert form was observed during owner checkout, but its
saved state and delivery have not been verified; no alert or hard cap is claimed.
