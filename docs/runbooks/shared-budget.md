# Shared budget admission operations

Status: synthetic qualification candidate, 9 September 2026. This does not
activate shared production answering or replace the existing SQLite ledgers.

## Runtime contract

The companion Python module `assistant.shared_budget` provides an immutable
`BudgetBinding`, a server-only HTTPS RPC adapter, one `SharedJobBudget` per actual
execution and `submit_shared_job`. Pass that job budget as the execution context
budget so the existing provider boundary reserves before both primary and fallback.
A trusted guest request claim still precedes generation; the budget UUID does
not replace conversation/request idempotency.

Bind one aggregate ledger ID, the exact complete policy JSON/configuration digest,
distinct E.V/Cited ledger IDs and the reviewed carry-forward receipt digest.
A new instance uses these same identities. It never provisions, repairs, resets
or switches to an in-memory allowance. The schema has no initialization RPC.
The current capture CLI and service factory continue to require their old durable
accounting; this new module is deliberately disconnected.

Migration `202609090006` creates only schema/functions. Every real allowance
requires a separate reviewed operator step and starts disabled. Runtime table
writes and reads are revoked even from the service role; only the constrained RPC
is callable. Keep credentials in server configuration and out of logs/exports.

## Failure and lifetime behavior

| Event | Required outcome |
| --- | --- |
| Missing, disabled or mismatched binding | Stop before provider dispatch |
| Accounting mismatch or DB clock regression | Fail closed; investigate the retained state |
| Acquire acknowledgment missing | Do not dispatch or retry the identity; a committed slot may be stranded |
| Reservation acknowledgment missing | Do not dispatch or retry; retain any committed US$0.04 debit |
| Duplicate acquire/reserve | Never a fresh grant |
| Caller timeout/cancel | Cancel future stages; keep occupancy until the actual worker future completes |
| Worker exception/completion | Release occupancy through the completion callback; refund nothing |
| Release acknowledgment missing | Record recovery need; retain possibly occupied slot |
| Process death/freeze | No expiry or automatic replacement; keep slot occupied |
| Pool disable | Stop new admission; drain/recover existing jobs explicitly |
| Stale database restore | Keep generation disabled until latest accounting is restored or conservatively carried |

Slots track local execution, not provider-side computation. A provider can
continue remote work after its HTTP connection times out; reservations remain,
and the existing two-attempt bound still applies. This is not proof of remote
cancellation or a global limit on provider internals.

A serverless host may freeze/kill the process after a response or deadline,
preventing callbacks. Do not assume a background thread outlives that boundary.
Full host integration must prove a supported request/background lifetime or wait
for actual work within the host limit. This phase did neither. Slow admission
also consumes the original monotonic execution deadline; it does not extend it.

The RPC uses a 1.5-second lock timeout and a 2.5-second statement setting. The
transport has a 2.8-second deadline, 0.5-second read inactivity timeout and an
8-KiB response bound. A slow/lost response fails closed even if the transaction
committed. These bounds trade availability for containment.
[Supabase function timeouts](https://supabase.com/docs/guides/database/postgres/timeouts).

## Recovery and carry-forward review

1. Disable/drain every old dispatcher; retain all existing budget and admission
   files. Confirm no old worker can resume before releasing an orphaned slot.
2. Bind a content-free snapshot of service daily/month/lifetime accounting,
   aggregate qualification reservations and uncertain attempts. Use conservative
   amounts and round service attempt equivalents up; token estimates are not
   refunds. Keep independent earlier allowances distinct.
3. Resolve every missing service/account record. Unknown does not mean zero.
   Review the complete policy and carry-forward receipt before provisioning.
4. Provision exactly once with generation disabled. Verify identity, limits,
   baseline totals, grants and current source/host binding across all instances.
5. Separately review activation and rollback. A rollback must include all later
   reservations. A restored internally consistent old snapshot cannot be detected
   by counters alone; require authoritative latest accounting outside that backup.
6. Do not clear/expire old jobs, reduce reserves or create another pool to restore
   availability. Recovery must prove old work cannot resume and preserve money.

Qualification rows are bounded (10,000 jobs and at most 75 new US$0.04 reservations
per aggregate policy). Keep their receipts; synthetic pools are disabled after
testing. Do not reuse them for real work.

## Verification and release boundary

`npm run test:management:sql` runs existing management checks and the shared
schema suite. The companion backend runs its normal pytest/Ruff/mypy gates.
Real staging tests use separate Python processes and synthetic IDs with no model
calls. See the [source-bound review](../reviews/ev-shared-budget-qualification.md).

The prior full frontend/browser gate is historical. No route, rendering, browser,
dependency or production-host code changed in this phase, so another frontend
build/browser cycle is irrelevant to this schema/adapter checkpoint and would
interfere with the owner's active preview. The complete release gate remains
mandatory on the final integrated candidate.
