# ADR-0023: Isolated destination for the managed restore rehearsal

- Status: **Proposed.** Drafted 18 September 2026 and awaiting an owner
  decision. Nothing here has been bought, created or run. ADR-0022 is settled;
  this record exists because acting on ADR-0022's trigger is currently blocked
  by a requirement no record resolves
- Date: 2026-09-18
- Owner: OJ Florendo
- Risk: R2 for this record. The rehearsal it describes is **R3** — it creates a
  second paid project and therefore spends money, which handbook §11 reserves to
  the owner with confirmation immediately before the action
- Related: [ADR-0022](0022-supabase-pro-for-managed-recovery.md) (the tier
  decision whose trigger this unblocks),
  [ADR-0016](0016-ev-management-storage-and-preview.md) (the restore contract),
  [isolated application-data recovery runbook](../runbooks/ev-application-restore.md)
  (the ten-step recovery contract in full),
  [restore qualification](../reviews/ev-application-restore-qualification.md),
  [encrypted backup qualification](../reviews/ev-encrypted-backup-qualification.md),
  [backup runbook](../runbooks/ev-backups.md),
  [package 13](../roadmaps/ev-management-progress.md)

## Context

### What ADR-0022 left open

[ADR-0022](0022-supabase-pro-for-managed-recovery.md) settles that Supabase Pro
will be bought, and triggers the purchase on the restore rehearsal rather than
on a date. Its third rider says the organization stays at one project on default
compute, and that a second project is "a separate decision" costing roughly
US$10/month.

Those two clauses collide. The rehearsal that triggers the US$25 needs somewhere
to restore *into*, and three separate records forbid the only project that
exists. PR #101 recorded this collision as unresolved and deliberately did not
decide it inside a cross-reference commit. It is still recorded in no ADR. This
is that record.

### The isolation requirement, as three records state it

- [ADR-0016](0016-ev-management-storage-and-preview.md): "Restore into an
  isolated destination with access disabled, merge the *current* deletion
  ledger… Never reactivate sessions or refresh tokens from an application-data
  backup."
- [Encrypted backup qualification](../reviews/ev-encrypted-backup-qualification.md),
  step 4: "Create a separately reviewed isolated managed destination; do not
  restore into the existing staging owner project."
- [Restore runbook](../runbooks/ev-application-restore.md): "Never restore
  into/reset the existing owner staging project or automatically re-enable its
  accounts, jobs or sessions."

They agree. None of them says where the destination comes from, or who pays for
it.

### Verified facts, 18 September 2026

Read from the Supabase Management API and the current Supabase documentation on
this date, not inherited from another document:

- Organization `Project Zero` (`rvscomcgubjbgzxcggoc`) is on plan **`free`**.
  No charge has been incurred and ADR-0022's Verification block is still empty.
- **"Restore to a new project" exists** and would create the isolated
  destination automatically, with no second project provisioned in advance. It
  is documented as **Beta**, is available only to paid plans, and requires
  physical backups on the source project.
- Physical backups are default from Postgres `15.8.1.079`. `ev-management-staging`
  runs `17.6.1.166`, so the precondition holds.
- The new project **mirrors the source's compute** and "will incur additional
  monthly expenses". Costs are shown before the operation starts. This is rider
  3's second project arriving through a door rider 3 did not name.
- A clone **transfers database roles, permissions and users, and the whole of
  `auth.*`** — user accounts, hashed passwords and authentication records.
- A clone does **not** transfer Storage objects, Edge Functions, Auth settings,
  API keys, Realtime settings, extension settings or read replicas.
- Supabase's own guidance: extensions that perform external operations —
  `pg_cron`, `pg_net`, wrappers — "should be disabled once the copy process has
  completed to avoid any unwanted actions".
- Projects created by restoration cannot themselves be cloned.
- An **in-place** managed restore makes the project inaccessible for the
  duration and restores over it.

### The conflict is deeper than the destination

The destination question is the visible part. Underneath it, the managed restore
and this project's recovery contract are **different kinds of operation**, and
package 13 has been carrying them as one line.

The [recovery contract](../runbooks/ev-application-restore.md) is a *logical,
allowlisted* restore. Its step 2 requires schema, functions and policies to come
"from independently reviewed migration source" and states: "Never execute SQL,
restored grants, triggers or role assignments supplied in an untrusted data
backup." Its application-data allowlist "excludes `auth.*`, owner assignments,
credentials, session/refresh tokens, Storage objects, configuration secrets,
retention history and every budget table". Step 9 requires a grant, policy, role
and trigger audit before and after loading; step 10 permits only reviewed
**read-only** grants afterwards, with old session claims reading nothing.

A Supabase clone is a *physical* restore of the whole cluster. By construction it
delivers exactly what the contract refuses to trust: roles, grants, and `auth.*`
with hashed passwords intact. It is not a stricter or looser version of the
contract — it is a different operation that the contract's language was never
written to cover.

One concrete consequence, verified in this repository rather than reasoned from
the documentation. `supabase/operations/schedule-retention.sql` schedules
`ev-retention` hourly to run `ev_private.run_maintenance()`. A clone carries that
job. Left alone, the clone's own retention purge would fire against restored rows
**before** the current deletion ledger has been merged — mutating the evidence
the rehearsal exists to check, on a schedule, without anyone acting.

## Decision

**Proposed, for owner acceptance. Separate the two exercises, and buy nothing
until the rehearsal is actually about to run.**

1. **Managed recovery qualification is a platform exercise, not a contract
   restore.** What it measures is whether Supabase can bring this project back,
   how long it takes, and how much data the daily-backup window loses. It does
   not attempt to satisfy the ten-step recovery contract, and must not be
   reported as having done so.
2. **Its destination is a clone made by "Restore to a new project", used briefly
   and deleted.** This satisfies every isolation requirement above — a fresh
   project, not the staging owner project — without provisioning a permanent
   second project.
3. **The clone is a disposable measurement rig.** It is never promoted to a
   working environment, never read by the application, and never used as the
   source of a real recovery. It cannot be cloned onward in any case.
4. **Lockdown runs first, before any inspection**, in this order: disable
   `pg_cron` and every external-operation extension; revoke application roles;
   leave Auth unconfigured; and treat all carried-over `auth.*` rows as material
   to be dropped, never as identities. Step 4 is the whole reason this record
   exists — a clone is unsafe in its default state.
5. **The clone's compute is accepted as a bounded rehearsal cost, not rider 3's
   second project.** It exists for hours and is deleted. If it is ever kept
   beyond the rehearsal, it becomes rider 3's separate decision and needs that
   decision, not this one.
6. **Delete the clone when the measurement is recorded.** Deleting a project
   permanently deletes its backups, which is acceptable for a clone and is a
   further reason the off-site encrypted job stays required.
7. **The recovery contract continues to govern any restore of application rows
   into a destination anyone will use**, and its source remains the off-site
   encrypted export, which runs on Free and is unaffected by the tier.

### What this does not decide

It does not buy Pro, does not set a date, and does not close package 13's backup
item. It removes the blocker in front of ADR-0022's trigger; the purchase remains
an owner action taken when the rehearsal is genuinely next.

It also does not qualify managed backups as a *source* for a contract-compliant
restore. If managed daily backups are ever to feed a real recovery rather than a
measurement, that needs its own record and its own qualification, because of the
physical/logical mismatch described above.

## Alternatives considered

**Provision a second permanent Supabase project by hand.** Rejected. It is rider
3's recurring roughly US$10/month for a project that would sit idle between
rehearsals, and it solves only the destination question while leaving the
physical/logical mismatch exactly where it is.

**Restore in place into `ev-management-staging`.** Rejected, and it is worth
stating why plainly rather than by citation: it overwrites the only project
there is, takes it offline for the duration, and is forbidden in identical terms
by ADR-0016, the qualification's step 4 and the restore runbook. It is the
option that would look easiest at the console and is the one all three records
were written to prevent.

**Treat the clone as a contract-compliant restore.** Rejected. Step 2 forbids
trusting a backup's own schema, grants and role assignments, and the allowlist
excludes `auth.*` outright. A clone supplies all of it. Accepting this would not
be a relaxation of the contract; it would be abandoning it while still claiming
it.

**Use a CLI logical restore into a throwaway project as the managed rehearsal.**
The strongest alternative, and not rejected on the merits. It is cheaper, it
matches the contract's shape, and it is what Supabase recommends to Free
projects. It is set aside because it measures the export-and-reload path that
the 46 local checks in
[the restore qualification](../reviews/ev-application-restore-qualification.md)
already cover, rather than the platform's own restore — which is the one thing
Pro is being bought for. It should be adopted as the fallback if the Beta clone
feature proves unusable in practice.

**Defer all of it until package 16.** Rejected for the reason
[ADR-0022](0022-supabase-pro-for-managed-recovery.md) already gave: a first
restore rehearsal should not be attempted with real conversations in the
database.

## Security and privacy impact

The clone is itself the main concern, and it is a new one. It materialises
`auth.*` — accounts and hashed passwords — into a second project whose Auth
settings and API keys are not carried over and therefore start unconfigured.
That combination is why lockdown precedes inspection rather than following it.
No credential is entered by any agent; project creation and deletion are owner
console actions.

The carried `ev-retention` job is a privacy-relevant hazard, not only an
operational one: it would delete restored rows on its own schedule before the
current deletion ledger is merged, which is the opposite of the reconciliation
the contract requires.

No new third party, no new data flow, and no new secret in the repository.
Supabase already holds this data. A Beta feature on the path is an accepted
qualification risk, not a production dependency.

## Operational and performance impact

None to the runtime. No code, environment variable, migration or deployment
change, and the application cannot observe any of this.

Cloning does not take the source project offline, which is the operational
advantage over in-place restore. The clone mirrors the source's compute for as
long as it exists.

## Consequences and trade-offs

- Package 13's managed recovery item becomes measurable without committing to a
  permanent second project.
- A Beta feature sits on the critical path, with a documented fallback.
- The clone's cost is real but bounded by deleting it. An abandoned rehearsal
  leaves a billable project behind; deletion is the last step and must not be
  skipped because the rehearsal failed.
- Managed backups remain unqualified as a *source* for a real restore. This
  record makes that gap explicit rather than closing it.
- The off-site encrypted job is unaffected and still required. It needs the
  reader credential, R2 keys, key custody and the enabling flag, none of which
  any of this provides.

## Verification

**Not performed. As of 18 September 2026 the organization is on Free, no clone
exists, and no rehearsal has been run.** When the owner accepts this record and
the rehearsal is next, record the result here rather than assuming it:

- Accepted on: _pending_
- Pro purchased per ADR-0022: _pending_
- Clone created from `ev-management-staging`: _pending_
- `pg_cron` and external-operation extensions disabled in the clone: _pending_
- Application roles revoked; Auth left unconfigured: _pending_
- Carried `auth.*` rows dropped: _pending_
- Restore duration and data-loss window measured: _pending_
- Clone deleted: _pending_

## Rollback or migration

Nothing in code to roll back. Reversing the rehearsal means deleting the clone,
which is also its normal final step. Reversing the decision means returning to
the position recorded in PR #101: the collision unresolved and the rehearsal
blocked. If the decision is reversed on cost grounds specifically, the CLI
logical restore alternative above is the path that needs no second project.
