# ADR-0015: Durable budgets and Gemini-primary routing

- Status: Authorized local implementation; production qualification pending
- Date: 2026-09-08
- Owner: OJ Florendo
- Risk: R2; provisioning and activation remain separate production actions
- Supersedes: ADR-0014's provider order and process-local budget description

The owner authorized overspending/abuse remediation, delegated the model choice
following a bounded comparison, and retained approval to publish verified-ready
work. Use Gemini 3.5 Flash-Lite as primary and GPT-5.6 Luna as the availability
fallback candidate. Adapter identity is independent of routing role; the router
assigns the role retained by wire v3 and the browser's backup disclosure.
Keep two serial attempts, zero retries, the 3/6/8/9/10-second nested time bounds,
and the same evidence, quote verification and whole-answer policy checks.
Billing, quota, authentication, malformed output and local budget failures never
trigger fallback. The separate existing Cited Anthropic demo is outside activation
scope. These changes do not prove live quality, latency or graduation.

Replace restart-resetting service counters with an explicitly initialized,
content-free SQLite reservation ledger on a persistent local volume. Commit a
fixed US$0.04 reservation before each attempt, including fallback, and never
refund it automatically. Combine daily/monthly attempts and reservation money;
current maxima are 40/200 attempts and US$0.40/US$2.00. The money limits therefore
admit at most 10 attempts per day and 50 per month. This is a reservation policy,
not an invoice guarantee: activation requires current rate and billed-token bound
verification, including thinking tokens and other account consumption.

Use one pinned Fly Machine, a real /data mount and one process-shared SQLite
admission lock. No ephemeral bootstrap, independently funded replica, expiring
lease, queue or reset endpoint is provided. Keep admission until the actual job
exits, even after caller cancellation. A missing/corrupt/replaced ledger, identity
or limits mismatch, clock regression or failed commit prevents paid dispatch.
Host/volume failure sacrifices assistant availability; the portfolio remains
usable. Do not provision a volume until its cost and activation authority are
resolved. Retain the ledger across deployment and rollback.

No prompts, answers, IPs or visitor identifiers enter the reservation ledger.
This is operational accounting, separate from the existing bounded browser tab
history and the conditional future owner-viewer roadmap. No transcript storage,
new visitor account, LLM judge or embedding-model migration is introduced.

Qualification captures require an additional persistent lifetime allowance with
explicit carry-forward and a finite call ceiling. They exercise actual bounded
jobs, retain per-attempt model/usage/uncertainty, and save after each case. An
interrupted capture is incomplete and cannot qualify release. Token estimates do
not settle reservations. Both frozen corpus suites still require full human
claim review; no agent can supply a human signature.

Rollback restores a compatible frontend/backend, corpus/prompt/policy, vectors,
configuration and image tuple. An old in-memory-counter image does not inherit
these controls. Keep answering disabled until the retained tuple and spending
boundary are verified. Existing release approval is conditional on readiness;
this ADR is not a deployment or purchase receipt.

See [runtime v3](../runbooks/assistant-runtime-v3.md) and
[durable budget operations](../runbooks/durable-budget.md).

## Shared qualification adapter, 9 September 2026

[ADR-0018](../adr/0018-shared-qualification-admission.md) extends this decision for
synthetic distributed qualification only. The current SQLite service/capture
path remains active in the candidate. The new shared adapter is disconnected;
real carry-forward, host integration and activation remain separate gates.
## Capture-scoped reservation envelope, 13 September 2026

The maxima above — 40/200 attempts and US$0.40/US$2.00 — bound *visitor-driven*
spend on the live service. The qualification capture inherits them, because
`cmd_eval` builds its ledger from the same `Settings` model and the same
`PersistentBudget`. One envelope is doing two unrelated jobs, and they disagree.

Before dispatching anything the capture requires room for two attempts per case
(`cli.py`: `maximum = 2 * len(questions)`), so the 75-question portfolio suite
needs **150 attempts** of headroom. The service envelope admits at most 40
attempts, and the money limits bind first at 10. A complete capture over the
versioned suite is therefore unreachable, and a partial one cannot stand in for
it: `release_manifest.py` requires the saved cases to equal the versioned
question set exactly.

Decision: permit a **capture-scoped** ledger, distinct from the live service
ledger, at 150 attempts and US$6.00 daily and monthly reservation. The live
service envelope is unchanged at 40/200 attempts and US$0.40/US$2.00, and
production continues to set those explicitly in `fly.oj-assistant.toml`.

US$6.00 is reservation headroom at the pinned US$0.04 per attempt, not a spend
forecast. The 12 September measurement recorded in
[current state](../state/CURRENT.md) puts actual cost at US$0.0024 per call, so a
complete 75-question capture is expected to cost about **US$0.18**. The
reservation itself stays at US$0.04: it is pinned by this ADR and written into
every ledger's table definition as `CHECK(micro_usd = 40000)`, so lowering it
would invalidate the live ledger, which this ADR forbids replacing. Re-deriving
the reservation from the measurement is worth doing and is not this change; it
requires a planned carry-forward migration of the production ledger.

Because the settings bounds must widen to admit the capture ledger, production's
deployed values are no longer guarded by the schema alone. Two mechanical checks
replace that guard, each in the repository holding the file it reads:

- here, `docs:check-budget-envelope` asserts the capture envelope above is at
  least twice the current versioned question count, so a suite that grows past
  it fails CI rather than a paid run;
- in `omarjosephf/cited`, `test_deployment.py` already asserts that
  `fly.oj-assistant.toml` carries the live-service maxima
  (`test_operating_caps_and_worker_settings_validate_against_runtime`), reading
  the deployed file rather than the schema. That guard predates this change and
  is stronger than the bound it replaces, so no new check is needed there.

## Spend ceilings leave the evidence identity, 14 September 2026

The amendment above split the *ledger* envelope and stopped there. It did not
split the *identity* envelope, and the two are not the same thing. This closes
that gap; it is an amendment to the decision above, not a new one.

`AnswerConfiguration` in `omarjosephf/cited` is the non-secret record of the
behaviour an answer was produced under. It carried `daily_attempt_limit`,
`monthly_attempt_limit`, `daily_budget_micro_usd` and `monthly_budget_micro_usd`
alongside model, effort, token cap, top-k, timeouts and wire version. The
capture refused on those bounds at the paid confirmation prompt on 14 September,
with the spend already authorised.

Widening them, as the amendment above did for `Settings`, is not available here,
and the reason is worth stating because it is not obvious. The capture's
recorded values are not a free parameter. `PersistentBudget` refuses any
settings that disagree with its ledger's stamped limits, so a capture against
the capture-scoped ledger can only ever record 150 attempts and US$6.00. The
release gate requires one `answer_configuration` to equal the config of every
capture *and* to describe the release. The deployment those captures qualify
runs at 40 attempts and US$0.40. One field cannot hold both. Widening the bounds
would not fix that; it would move the refusal from a free pre-dispatch check to
the release gate, after the one capture the allowance funds had been spent.

Decision: **the four spend ceilings are removed from `AnswerConfiguration`.**
They govern how many answers may be asked for, never what any one of them says,
which is the only thing that record exists to pin. `attempt_reservation_micro_usd`
and `shared_worker_limit` stay: the reservation price is pinned by this ADR and
written into every ledger's `CHECK` constraint, and the worker limit is the
concurrency the runtime admits.

The deployed envelope keeps the guard this ADR already accepted for it —
`test_operating_caps_and_worker_settings_validate_against_runtime` reads the
limits out of `fly.oj-assistant.toml`, the file that is actually deployed,
rather than out of a schema. That substitution was the amendment above's
reasoning for widening the settings bounds; this applies it one level up.

**The release manifest goes to v3.** Removing required fields breaks in both
directions: a v2 document is invalid against v3 and a v3 document is invalid
against v2. Editing the published v2 in place would have left two incompatible
shapes both stamped `schema_version: 2`. No v2 manifest instance is known to
exist, which makes v3 cheap rather than making an in-place edit safe — there is
no migration to write either way. This reopens and settles the schema-version
question closed on 12 September, on a trigger that decision did not anticipate;
that decision's own reopen condition concerned thinking-token measurement and is
untouched. v1 and v2 stay on disk, referenced by nothing, exactly as v1 already
sat. The gates in
[ADR-0011](0011-assistant-release-evidence.md) are unchanged in substance; they
now read a v3 manifest.

**A free path builds the identity.** Nothing free had ever constructed that
record: the preflight did not reach it, and the free rehearsal wrote no `config`
key at all, because it was built inside the paid branch. A three-line bound
mismatch could therefore surface at exactly one moment, and did. The free
evaluation path now builds and validates the same record a capture writes, and
records it in the rehearsal evidence. Because the spend ceilings no longer reach
it, that record is byte-identical to the paid capture's, so a clean rehearsal is
now a real rehearsal of the identity rather than a check of everything except
it. A half-configured credential environment still runs a free retrieval scoring
to completion — a configured credential alone never triggers inference, and the
absence of one must not break a free run either.
