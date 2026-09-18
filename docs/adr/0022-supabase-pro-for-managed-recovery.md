# ADR-0022: Buy Supabase Pro for managed database recovery

- Status: Accepted — owner decision 18 September 2026. **The subscription has
  not been purchased.** The upgrade is an R3 account action reserved to the
  owner and is deliberately held until the trigger recorded under "Decision" is
  met. Accepted here means the decision is settled, not that money has moved
- Date: 2026-09-18
- Owner: OJ Florendo
- Risk: R2 for this record. The upgrade itself is R3 under handbook §11, which
  names "enabling paid services" in its examples and requires explicit
  confirmation immediately before the action
- Related: [ADR-0016](0016-ev-management-storage-and-preview.md) (management
  storage, the restore contract and the encrypted backup preparation),
  [ADR-0020](0020-gemini-paid-tier-for-visitor-input.md) (the precedent: a
  paid-tier decision recorded separately from the console action that enacts
  it), [hosting and cost review](../reviews/ev-hosting-and-cost-review.md),
  [backup runbook](../runbooks/ev-backups.md),
  [encrypted backup qualification](../reviews/ev-encrypted-backup-qualification.md),
  [package 13](../roadmaps/ev-management-progress.md)

## Context

### Verified current state, 18 September 2026

Read from the Supabase Management API on this date rather than inherited from
another document:

- Organization **`Project Zero`** (`rvscomcgubjbgzxcggoc`) is on plan
  **`free`**.
- It holds exactly one project, **`ev-management-staging`**
  (`clekxlhhclwgtmismogv`), `ACTIVE_HEALTHY`, `eu-west-1`, Postgres
  `17.6.1.166`, created 8 September 2026.
- The security advisors report the standing `auth_leaked_password_protection`
  WARN, the eight deny-all `rls_enabled_no_policy` INFO findings, and a
  seven-function `authenticated_security_definer_function_executable` WARN.
  The third is unrelated to the tier and is out of scope for this record; it is
  noted here only because it was read at the same time and should not be
  discovered later as a surprise.

**The subscription is per organization, not per project.** Buying Pro buys it
for `Project Zero` and for everything that organization ever holds.

Every table the management schema owns currently reads zero rows. There is no
production data to lose today. That is the honest starting point for a decision
about recovery, and it is what makes the timing question below a real one.

### What Free withholds

Supabase backs up Pro, Team and Enterprise projects daily; Pro projects can
restore any of the last seven days. Free projects get none of that, and
Supabase's own guidance for them is to export regularly with
`supabase db dump` and to keep off-site backups. Free projects also pause on
inactivity, and leaked-password protection — the HaveIBeenPwned check behind
the standing advisor WARN — is documented as available on the Pro Plan and
above. ([backups](https://supabase.com/docs/guides/platform/backups),
[password security](https://supabase.com/docs/guides/auth/password-security))

### What package 13 actually needs

[Package 13](../roadmaps/ev-management-progress.md) lists "managed
recovery/off-site backups (R3, paid tier)" as one of three remaining items.
That phrasing joins two things with different blockers, and the difference
decides what this ADR can honestly claim to unblock.

**Managed recovery** is Supabase's own daily backups and restore. It requires
Pro. Nothing else unblocks it.

**Off-site encrypted backups** do not require Pro, and are further along than
that roadmap line suggests. [ADR-0016](0016-ev-management-storage-and-preview.md)
records the AES-256-GCM envelope, the seven-day expiry, the scoped PostgreSQL
reader in `supabase/operations/prepare-backup-reader.sql`, the export and
retention job in `scripts/management-backup-job.mjs`, and an hourly
`.github/workflows/ev-backups.yml` held inert by
`vars.EV_BACKUP_ENABLED == 'true'`. The owner has already approved R2
activation and the private EU bucket `ev-private-backups`, which exists with
public access disabled and a six-day prefix expiry. That job reads the database
over `EV_BACKUP_DATABASE_URL`, which works on Free. What it lacks is
credentials — a reader login, R2 access keys — key custody in practice, and the
repository flag that turns it on.

The two items are therefore close to independent. Pro does not unblock the
off-site job, and the off-site job is the control Supabase itself recommends to
projects that have no managed backups.

## Decision

**Buy Supabase Pro for the `Project Zero` organization, at the US$25/month
starting price the [cost review](../reviews/ev-hosting-and-cost-review.md)
already records.** Three subordinate decisions travel with it, because each is
a way the bill could grow without anyone deciding to grow it:

1. **Leave the Spend Cap on.** Pro enables it by default. Leave it there.
2. **Do not enable Point-in-Time Recovery.** PITR costs roughly US$100/month
   for seven-day retention, requires at least a Small compute add-on, and
   Supabase documents that it is **not covered by the Spend Cap**. Daily
   backups with a seven-day restore window are the right level for a database
   holding no production rows. PITR becomes a question again only if this
   database ever holds data whose loss over a day is unacceptable, and it needs
   its own record when it does.
3. **Stay at one project on default compute.** The organization's US$10 compute
   credit covers exactly one project at the default size, which is what makes
   the bill US$25/month rather than more. A second project adds roughly
   US$10/month and is a separate decision.

### When to buy it

**The purchase is triggered by intent, not by this record and not by a date.**
Upgrade when the managed recovery qualification is the next piece of work —
when someone is about to rehearse a restore — and not merely because this
decision exists. The owner chose this on 18 September 2026 in preference to
upgrading the same day: the database holds no production rows, the fee is
recurring from the moment it starts, and a month bought before the rehearsal
buys nothing.

Until that upgrade happens, `Project Zero` remains on Free and everything Free
withholds still applies, including the leaked-password advisor finding and
inactivity pausing. A session reading this ADR must check the plan against the
account before assuming Pro is in force; the Verification block below is the
record, and it is empty until the upgrade is done.

**This does not finish package 13's backup item, and must not be reported as
finishing it.** The tier is necessary for managed recovery and irrelevant to
the off-site job. After this purchase, off-site backups still need the reader
credential, the R2 access keys, key custody and the enabling flag — all owner
actions, none of them bought by a subscription.

### What Pro buys, precisely

| Capability | On Free today | On Pro |
| --- | --- | --- |
| Managed daily backups, seven-day restore window | None | Included |
| Project pausing on inactivity | Applies | Does not apply |
| Leaked-password protection (HaveIBeenPwned) | Unavailable; standing advisor WARN | Available, one Auth setting |
| Off-site encrypted backups to R2 | Built, uncredentialed, inert | **Unchanged — still built, uncredentialed, inert** |
| Point-in-Time Recovery | Unavailable | Available as a paid add-on; **not bought here** |

One honest deflation of the third row. `docs/state/CURRENT.md` already records
that there is exactly one account, so a strong unique password gives the same
protection in practice today. What Pro changes is that the finding becomes
closable rather than permanently accepted, and the control stops resting
entirely on one person's password discipline. That is worth something. It is
not worth US$25/month on its own.

## Alternatives considered

**Stay on Free and rely on the off-site job instead.** Not rejected on the
merits — it is the strongest alternative, and it is what Supabase tells free
projects to do. It would cost nothing beyond R2's usage rates, the job already
exists, and it puts the backup outside the running database's failure domain,
which managed daily backups do not. It is rejected here for two reasons. The
two controls fail differently: the off-site job is a logical export of
application data on a schedule nobody has run yet, while managed backups are
the platform's own physical snapshots, taken without this repository having to
be correct. And qualification work that will run against a paid tier should run
on the paid tier, which is the reasoning
[ADR-0020](0020-gemini-paid-tier-for-visitor-input.md) settled for Gemini: a
paid-tier behaviour difference discovered after launch is the expensive
mistake. Nothing here supersedes the off-site job. It remains required, and
this decision makes it the second control rather than the only one.

**Buy Pro and PITR together.** Rejected. Roughly US$100/month for a database
with zero production rows, and the one add-on the Spend Cap does not bound. It
is the exact shape of charge that arrives without having been decided.

**Defer the purchase until public release, package 16.** Rejected, but this is
the live question rather than a formality, and the reasoning should be visible.
The case for deferring is real: nothing is at risk today, the money is
recurring, and roughly US$300 a year against a project with no revenue attached
is not nothing. The case against it is that recovery is a capability qualified
before it is needed, not after. Package 13 cannot close while managed recovery
is untested, and a first restore rehearsal is not something to attempt with
real conversations in the database. Waiting for package 16 would put the
rehearsal after the data arrives, which is the wrong order. What survives from
this alternative is its cost argument, and it is what produced the trigger in
"When to buy it" above: the decision is settled now, the fee starts when the
qualification does.

**Fold this into ADR-0016.** Rejected. ADR-0016 is the storage and preview
architecture. A recurring subscription and the recovery posture it buys should
be findable by that question, not by knowing which storage ADR happens to
mention money.

## Security and privacy impact

No new data flow, no new third party, no new secret in the repository.
Supabase already holds this data; the plan governs what Supabase does with it,
not where it goes.

The one real change is a new retention surface. Managed daily backups mean
copies of management data sit in Supabase's backup storage for up to seven
days, so a conversation deleted under the retention rules stays recoverable
from a daily backup until it ages out. This is not a new hole.
[ADR-0016](0016-ev-management-storage-and-preview.md) already sets the contract
that governs it: application backups may be retained for at most seven days,
restores go into an isolated destination with access disabled, the **current**
deletion ledger is merged before anything is exposed, and if that ledger cannot
be recovered, old transcripts are not restored at all. Pro's daily backups fall
inside that seven-day bound and are subject to the same contract. That contract
must be honoured for managed restores too, not only for the off-site encrypted
ones it was written for.

Leaked-password protection becomes available. Enabling it is a separate Auth
setting and does not happen by upgrading.

Supabase deletes a project's backups permanently when the project is deleted.
Managed backups are therefore not a defence against losing the project, which
is a further reason the off-site job stays required rather than optional.

The purchase itself requires payment details. Those are entered by the owner in
the Supabase dashboard. No agent enters them, and none is recorded here.

## Operational and performance impact

None to the runtime. No code, environment variable, migration or deployment
change. Compute stays at the default size. The application cannot observe the
plan and no health endpoint reports it.

The practical operational gain is that the staging project stops pausing on
inactivity, which removes a recurring interruption from qualification work that
runs over weeks.

## Consequences and trade-offs

- A recurring US$25/month charge begins, organization-wide, and continues until
  someone downgrades. It is the first recurring infrastructure subscription on
  this project. E.V's Gemini spend is metered and bounded by the reservation
  ledger; this is not.
- **The plan is not verifiable from the repository**, exactly as with
  [ADR-0020](0020-gemini-paid-tier-for-visitor-input.md). No code path or schema
  field reports it, and this record does not invent one. Verification is console
  or Management API inspection, recorded below.
- Any future second project in this organization inherits Pro and adds roughly
  US$10/month in compute. The plan is organization-scoped, which is easy to
  forget at the moment a project is created.
- PITR remains available and remains outside the Spend Cap. Enabling it needs a
  new record, not a dashboard toggle taken on the strength of this one.
- Package 13 moves, but does not close. Its backup item needs credentials and
  key custody that no subscription provides.

## Verification

**Not performed. As of 18 September 2026 the organization is on Free and no
charge has been incurred.** When the trigger in "When to buy it" is met, this is
an owner action, R3, in the Supabase dashboard. Record the result here
afterwards rather than assuming the upgrade took effect:

- Upgraded on: _pending_
- Organization checked: `Project Zero` (`rvscomcgubjbgzxcggoc`) — expect plan
  `pro`
- Spend Cap: _pending_ — expect enabled
- Point-in-Time Recovery: _pending_ — expect **not enabled**
- Daily backups visible under Database → Backups: _pending_
- Leaked-password protection enabled in Auth settings: _pending_ — a separate
  action, and the advisor finding stays open until it is taken
- Advisors re-read after the change: _pending_

## Rollback or migration

Nothing in code to roll back. Reverting means downgrading the organization to
Free, which restores inactivity pausing and ends managed daily backups. Take a
`supabase db dump` before downgrading, and do not rely on previously taken daily
backups remaining accessible afterwards. Downgrading also re-opens the
leaked-password advisor finding, which should then be recorded as accepted
again rather than left looking unnoticed.

If the decision is reversed for cost reasons specifically, the off-site
encrypted job in [the backup runbook](../runbooks/ev-backups.md) becomes the
sole recovery control and must be credentialed and enabled first, not
afterwards.
