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
