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

## Qualification allowance raised to 225 attempts, 17 September 2026

The 13 September amendment sized two ledgers to one number. That was right for
the service ledger and wrong for the allowance, and the 15 September capture
paid for the difference.

`QualificationAllowance` and `PersistentBudget` are not the same kind of thing.
`QualificationAllowance._remaining` counts every row its `reservations` table
has ever held; the table is `(id INTEGER PRIMARY KEY)` and carries no date
column, so it cannot forget. `PersistentBudget._totals` counts
`WHERE month = ?`. Sizing a lifetime ceiling and a per-month ceiling at the same
150 attempts made them look interchangeable. They are not: a month's
reservations come back, a lifetime's do not.

On 15 September the portfolio capture failed at question 37 of 75 on a refused
`os.replace` under OneDrive, spending 36 attempts. The service ledger returns
those on 1 October. The allowance does not, and the 114 it leaves cannot fund a
suite that demands 150 free before it dispatches anything. The envelope was
exactly 150 against a need of exactly 150, and one transient file lock was
enough to end it permanently. `omarjosephf/cited#18` closed that specific fault;
the per-case loop in `capture_answers` still has no `except` and there is no
resume, so any provider or parsing error forfeits a whole run the same way.

Decision: **the qualification allowance is raised to 10,440,000 micro-USD
(US$10.44), carrying forward the 1,440,000 micro-USD already spent.** By
`capture.py`'s `(ceiling - carried) // 40000` that leaves **225 attempts**.

225 is not a round number; it is the smallest one that buys a complete second
chance. A capture can restart only while the attempts consumed so far are no
more than the allowance less the 150-attempt gate. At 225 that is 75 — one per
question across the whole suite — so a run that crashes at *any* question can be
run again in full, with the demo capture's 30 still fitting afterwards. At 200
the cover runs out at question 50, which is past where the last run died.

**The service envelope does not move, and that is a code constraint rather than
a preference.** `Settings` bounds `daily_answer_limit` at `le=150`, and both
`daily_budget_micro_usd` and `monthly_budget_micro_usd` at `le=6_000_000`. A
ledger stamped above those could not be used at all: the settings that must
match it would not validate, and `PersistentBudget` refuses any settings that
disagree with its ledger's stamped limits. The capture-scoped service ledger
therefore stays at 150 attempts and US$6.00, exactly as the 13 September
decision states it, and that sentence is left untouched here.
`docs:check-budget-envelope` reads the first match of its pattern in this file,
so a second sentence in the same shape would either be silently ignored or be
taken for a service envelope it does not describe. The allowance above is
stated in micro-USD and attempts, and never in that form.

**One consequence of leaving it there.** The service ledger admits 150 attempts
per calendar month and the portfolio gate demands 150 free before dispatch, so
the portfolio capture must be the first paid work of a calendar month, and a
retry cannot happen in the same one. A clean portfolio run consumes 75, leaving
75 — enough for the demo suite's 30, not for another portfolio run's 150. The
raised allowance buys retries in later months, not faster ones.

**What this authorises and what it costs are different numbers.** US$10.44 is
reservation headroom at the pinned US$0.04 per attempt, not a spend forecast. At
the 12 September measured US$0.0024 per call, the expected outcome — a
75-question portfolio capture and a 15-question demo capture — is about
**US$0.22**, and that figure is the same under any ceiling considered. Real
exposure is bounded twice over independently of this decision: `--max-paid-calls`
is 150 per run and the service ledger admits 150 per month, so no allowance can
produce more than about US$0.36 of real spend in a month. A higher ceiling buys
more months of trying, not a faster burn. The reservation stays at US$0.04,
pinned by this ADR and written into every ledger as `CHECK(micro_usd = 40000)`;
re-deriving it from the measurement remains separate work requiring a planned
carry-forward migration of the production ledger.

**This cannot be corrected afterwards.** Item 5 of
[the durable-budget runbook](../runbooks/durable-budget.md) forbids deleting,
truncating, recreating, cloning or restoring a ledger to regain an allowance,
and it governs this one exactly as it governs the service ledger. Both flags on
the creation command are money in micro-USD, never attempt counts: `225` is
US$0.000225 and is refused outright, but `400000` would silently create a usable
ten-attempt ledger that could never be replaced. Read the attempt count the
command echoes back before confirming it.
