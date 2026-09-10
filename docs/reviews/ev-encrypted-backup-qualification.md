# Encrypted E.V backups and R2 preparation

Date: 9 September 2026. Risk R2. Local encryption, exporter and job qualified.
The owner subsequently approved the R2 subscription and empty private EU bucket;
both are now active. The backup service, credentials and managed recovery remain
inactive. No real transcript has been exported or uploaded.

## Implemented encryption boundary

`scripts/management-backup.mjs` encrypts the application-data and current deletion
ledger formats using Node's AES-256-GCM, a new random 96-bit nonce and a full
128-bit authentication tag. A random 32-byte operator key is supplied explicitly;
the module never loads credentials, generates a production key, opens a database,
writes a file or contacts storage. It returns only encrypted envelopes or fully
authenticated plaintext. Temporary decryption buffers are cleared; JavaScript
strings and internal runtime copies cannot be promised complete memory erasure.

Version, algorithm, key fingerprint, purpose, source and capture/expiry times are
authenticated. Header metadata is visible; transcript/draft content is encrypted.
The source and purpose must match the caller's independently expected values.
The module enforces a 10 MiB plaintext limit, bounded rows, exact top-level shapes,
the application-table allowlist and a fixed seven-day lifetime from capture.
Unsupported fields/tables, malformed encodings, wrong keys, tampering, future
captures and expired files fail with a content-free error. It rejects credentials,
Auth and budget tables at the allowlist boundary; it does not inspect arbitrary
visitor prose as though it were a credential schema.

Encryption is not source review, proof of currentness or restore authority.
The existing recovery validator must still verify the exact approved schema,
row fields and draft digests, independently current deletion evidence and fresh
principals. All gaps remain excluded from recovery. A decryptable old ledger
cannot stand in for the latest ledger or reinstate a spending allowance.

Run `npm run test:management:restore`. Seventeen encryption checks and 19 exporter/job/access checks
pass, followed by the existing 46 recovery checks. The database rehearsal now writes an encrypted
synthetic backup file, authenticates/decrypts it and restores its exact original
bytes. Incorrect keys, every authenticated header field, body/tag/nonce corruption,
truncation, expiry boundaries, purpose confusion and authenticated inconsistent
payloads are covered. Changed scripts lint clean. The operator job adds two pinned development-only dependencies;
no existing runtime dependency entry or UI/API code changed. The unchanged
application browser gate was not repeated. See the job runbook for the dependency
need, lockfile validation and activation boundary.

[Node authenticated encryption](https://nodejs.org/api/crypto.html#deciphersetauthtagbuffer-encoding).

## Prepared R2 configuration

Use one dedicated private Standard-class bucket with explicit EU jurisdiction,
no public `r2.dev` access, custom domain, browser CORS or public Worker route.
Grant the eventual uploader object access only to that bucket. Keep setup/admin
permissions and the recovery key separate from upload credentials. EU jurisdiction
uses its jurisdiction-specific S3 endpoint; a location hint alone is not a
location guarantee. No account ID, credential or live bucket is supplied here.
[Jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/),
[scoped credentials](https://developers.cloudflare.com/r2/api/tokens/).

The prepared [S3 lifecycle configuration](../../supabase/operations/ev-backup-r2-lifecycle.json)
expires only the `ev-backups/v1/` prefix after six days and incomplete multipart
uploads after one day. It is an S3 `LifecycleConfiguration` body, not a Wrangler
lifecycle JSON file. Inspect the exact bucket and existing rules before an
authorized application; never replace unrelated bucket rules. Prefer unique
immutable object names so a retry cannot extend old data's age by overwriting it.

Six days leaves time for asynchronous deletion before the seven-day policy.
Cloudflare says lifecycle deletion typically follows expiration within 24 hours
and can take longer. This is not a guaranteed physical-deletion deadline. The
operational job must explicitly check/delete overdue objects and report failed
cleanup. The local decryption expiry is an additional access control, not evidence
that remote bytes were deleted. Live deletion and failure checks remain required.
[Object lifecycle behavior](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).

Standard R2 includes 10 GB-months, one million Class A and ten million Class B
operations monthly; usage above the free allowances is billable and rounded in
the documented units. The allowance is account-wide and is not a hard spending
cap. R2 requires subscription checkout even when planned usage fits free usage.
The owner separately approved and completed subscription checkout. The account
showed no billable usage before the empty bucket was created. This is not a
promise of zero future charges.
[Pricing](https://developers.cloudflare.com/r2/pricing/),
[activation](https://developers.cloudflare.com/r2/get-started/).

## Prepared export, upload and scheduling

The [operator runbook](../runbooks/ev-backups.md) describes the complete local job:
restricted PostgreSQL reads, verified TLS, exact schema/version checks, in-memory
encryption, immutable conditional uploads, byte-for-byte authenticated readback,
six-day cleanup with verified removal, bounded operations and content-free reports.
Its hourly GitHub workflow stays inert until the explicit activation variable is
set. The reader SQL creates NOLOGIN, without a password or memberships, and grants
only approved column reads and migration version metadata. It is an operator
preparation file, not an automatically applied migration. Production credentials,
checkout, row export and deployed scheduling remain separate owner actions.

Nineteen local checks cover interrupted writes, unknown/corrupt readback,
retention failure, source outage, untrusted object names, pagination, source/TLS
configuration, S3 request limits, reader permissions and actual snapshot reads in
PGlite. They also reject elevated identities, schema drift, incomplete migrations
and excess rows. A mocked S3 adapter and PGlite cannot establish managed access,
real TLS, provider compatibility, actual remote deletion or scheduler delivery.

## Remaining managed qualification and activation

1. Qualify the prepared reader/export/upload job against explicitly approved
   managed resources with synthetic data first. Verify real role privileges,
   TLS, conditional writes/readback, interrupted runs and actual remote cleanup.
   No plaintext dump, key, transcript or raw database error may enter CI artifacts
   or logs. Inspect drift; never widen privileges just to make a failed check pass.
2. Subscription and empty-bucket setup are complete. Preserve the verified EU,
   Standard and private settings, with no custom domain, CORS or bucket locks.
   The enabled backup-prefix rule expires objects at six days and aborts unfinished
   multipart uploads at one day; the pre-existing default rule was preserved.
   Scoped credentials and any deployed-job change still require owner approval.
3. Establish separate recoverable key custody with the owner before uploading
   real data. Losing the key means losing the backup. Keep the owner recovery
   copy outside the bucket and outside the backup artifact set.
4. Create a separately reviewed isolated managed destination; do not restore into
   the existing staging owner project. Re-establish identities independently,
   exercise latest-deletion replay, exclusion/expiry and grants/RLS with synthetic
   data, and retain failed evidence. Keep reads/writes/dispatch disabled until
   their individual recovery checks pass.
5. Measure actual backup age, failed-run alerting, restore duration and remote
   cleanup. A local encryption pass is not operational backup/recovery evidence.

Current read-only inventory showed one managed staging project. No second project
was created, no Auth setting changed, and no source transcript was exported.
Supabase recommends off-site exports for Free projects; its managed backup
features and local application-data recovery are distinct.
[Supabase backups](https://supabase.com/docs/guides/platform/backups).

See [application recovery](../runbooks/ev-application-restore.md) and the
[assembled application baseline](ev-release-candidate-verification.md).
