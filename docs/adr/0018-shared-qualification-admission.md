# ADR-0018: Shared transactional qualification admission

- Status: Authorized local and Free staging qualification; real migration and activation pending
- Date: 2026-09-09
- Owner: OJ Florendo
- Risk: R2
- Extends: [ADR-0015](0015-durable-budget-and-provider-order.md)

## Context and decision

Multiple Python instances cannot share the existing local SQLite admission lock.
Qualify one PostgreSQL admission boundary for E.V and Cited, while retaining
SQLite as the current service/capture implementation. The new adapter is opt-in;
neither service startup nor the capture CLI selects it.

One explicitly provisioned aggregate row contains a complete two-service policy,
a ledger identity, configuration digest and carry-forward receipt digest. Every
RPC checks the complete binding and locks the aggregate row before reading or
changing any service total. Reserve US$0.04 per attempt, permanently, in the same
transaction as the accounting counter. Both service daily/monthly attempt/money
limits and service/aggregate nonrenewing limits apply. Current ceilings remain
40/200 attempts, US$0.40/US$2.00 per service and at most US$3 aggregate qualification
authority; money limits ordinarily allow only 10/50 service attempts.

This is a reservation bound, not invoice reconciliation. Separate earlier paid
allowances and uncertain charges must be preserved through reviewed carry-forward.
There is no runtime provisioning, refund, reset or automatic ledger replacement.

Use durable job rows for occupancy. A database row lock ends at transaction
completion; it does not cover a subsequent provider call. The executor completion
callback releases occupancy only after the actual future completes. A caller
timeout, cancellation, lost acknowledgment or dead process does not expire a
job. Duplicate acquisition/reservation never grants dispatch permission. Cap job
history at 10,000 and one execution at two serial attempts; aggregate occupancy
is explicitly configured from one to four slots.

PostgREST uses a transaction per request; modifying RPCs use POST/VOLATILE.
PostgreSQL row locks serialize contenders until transaction completion.
[PostgREST transactions](https://docs.postgrest.org/en/stable/references/transactions.html),
[PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html).

## Alternatives and trade-offs

Retain SQLite on one persistent pinned host where that deployment constraint is
acceptable. Independently funded instance ledgers cannot enforce a shared cap.
Expiring leases would improve availability but could admit overlapping work while
an old worker still runs, so they are rejected for this qualification.

Short RPCs avoid holding a database connection over provider work. They add
latency and an availability dependency. Stranded slots intentionally require
operator recovery. Serverless freeze/termination and provider-side completion
are not solved by this adapter.

## Security, privacy and operations

All budget tables use a private schema, RLS and revoked direct privileges.
Only the server role can execute the definer RPC; it has an empty search path and
qualified relation names. The adapter accepts an explicit managed HTTPS origin,
uses bounded responses/timeouts, no redirects/retries, and sanitized failures.
No prompt, answer, IP, visitor account or transcript enters budget accounting.
Configuration and execution identifiers are operational data.
[Supabase function privileges](https://supabase.com/docs/guides/database/functions).

Schema migration seeds no allowance. Production answering remains disabled.
The [review](../reviews/ev-shared-budget-qualification.md) separates executed
synthetic checks from application/provider, recovery and release qualification.

## Migration and rollback

Keep all old ledgers intact. Review complete service/account history, prior
uncertainty, aggregate scope and exact identities before a one-time disabled
provisioning step. Do not treat missing prior accounting as zero. Activation is a
separate decision. Restore/rollback must preserve the latest debits, including
those made after a backup; otherwise stop dispatch. No database-local scheme
can detect an administrator restoring an internally consistent stale snapshot.

See [shared admission operations](../runbooks/shared-budget.md). Package 14 remains
incomplete until full application/host integration, failure recovery, cost and
provider qualification are established.
