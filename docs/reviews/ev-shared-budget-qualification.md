# Shared budget admission qualification

9 September 2026. Risk R2. Bounded package-14 checkpoint; delivery remains
**12/16**, with packages 13–16 incomplete. This qualifies a schema and opt-in
adapter using synthetic accounting. It does not complete hosting, real ledger
migration, provider/answer quality or owner release review.

## Result and evidence

- **788 backend tests pass**, with seven historical skips. Full Ruff check,
  format check (61 files) and strict mypy (30 source files) pass.
- **90 local SQL checks pass**: 42 existing management checks with the new
  migration installed, plus 48 shared-admission checks.
- **11 staging checks pass across 53 RPC requests**. Four distinct Python
  processes race the aggregate cap; four race a service daily cap. Eight
  processes contest one slot, and process exit leaves that slot occupied.
- Monthly carry-forward, configuration mismatch, discarded committed
  acquire/reserve acknowledgments and caller timeout/cancellation are exercised.
  Release follows actual future completion and never refunds money.
- Final verification matches both installed function bodies to local source and
  confirms anonymous HTTP denial. **All 12 synthetic pools are disabled**;
  there are zero real allowances. The full phase used **60 budget RPC requests**,
  including the failed run, diagnostics and final denial.
- No paid model calls, additional spend/reservations, subscriptions or hosting
  deployments occurred. The prior hosting probe's three builds/120 measured
  requests remain separate historical accounting.

[Sanitized evidence](evidence/2026-09-09-shared-budget.json) binds the source and
summarizes measured concurrency. [ADR-0018](../adr/0018-shared-qualification-admission.md)
and the [runbook](../runbooks/shared-budget.md) define the trust and recovery boundary.

## Failure history and limits

The first local SQL run rejected even valid configuration because of JSON
operator precedence. This was corrected; explicit missing-field checks were also
added. The Python HTTP fixture initially supplied an already consumed response;
the fixture now streams actual bytes without weakening rejection checks.
Initial formatting findings were fixed without suppressions.

The first full backend run passed 780 tests and failed eight Git hygiene checks
because the escalated Windows user differed from the repository owner. Command-
scoped trust for the previously verified canonical repository resolved that
environment issue; the complete suite then passed.

The first staging acquisition committed a job, but the adapter could not trust
its acknowledgment. No reservation/provider dispatch followed. The generic
sanitized error did not retain its lower-level cause. The stranded synthetic pool
was disabled, and two isolated diagnostics verified HTTP/function and adapter
behavior. The unchanged source then passed the full staging suite with the same
timeouts. This is failure-containment evidence and one successful qualification
run, not an availability or network reliability guarantee.

Automatic review initially rejected staging mutation and rejected retrieved
authorization from another task. The owner then explicitly approved this migration
and synthetic tests in the current task. Only that approved staging mutation ran.
No production authorization is inferred.

## Remaining work

The existing SQLite service factory and capture CLI are unchanged. No real
allowance was initialized, migrated or reset. The private carry-forward review
rehashes the original 24-attempt pilot (US$0.96 retained, including US$0.08 uncertain)
and records unresolved complete service/account history. Those minima do not
constitute complete invoice reconciliation.

A US$3 aggregate admits at most 75 new US$0.04 attempts before the service limits
are considered. The 154-attempt capture requires US$6.16 and still cannot fit;
no reservation was reduced to make it fit.

Before activation: complete reviewed carry-forward, integrate the adapter with
the actual app/host lifecycle, prove orphan recovery without overlapping work,
measure admission latency within existing deadlines, verify provider cost/token
bounds, and complete answer quality and final release gates. Database restore
must retain the latest debits. A dead/frozen instance can strand capacity; there
is no expiring lease. Provider-side work can outlive an HTTP timeout.

The local owner preview was kept running. No password, factor, setup key or owner
session was read or changed. Human MFA enrollment remains unconfirmed.
