# Current state

Updated 14 September 2026. This file is what a fresh session should read first.
The session-start hook points at it by name. Keep it short and true; when it
stops matching reality, correct it rather than adding to it.

## Why this file exists

On 10 September the project's handoff lived at
`C:\Users\omarf\Downloads\OJ Portfolio Workspace\EMERGENCY-HANDOFF-...md`. Cloud
sessions cannot read a local path, so three turns went into establishing which
files existed before any work began. The next day OneDrive moved that whole
folder and every absolute path in it broke at once. State that matters belongs
in the repository.

## The three products

**Portfolio website** — released 10 September, live, CI green. Effectively done.

**E.V assistant** — **deployed and verified 13 September.** The Gemini/Luna
runtime is live on Fly over wire v3, on a pinned machine with the durable ledger
mounted at `/data`, now serving corpus `7bddb04dedc7`.

The source/production corpus gap is **closed**. It is worth recording what the
13 September deploy carried, because it was three changes at once: the corpus
move from `9eacd1593d6a` to `7bddb04dedc7`, the 12 September retrieval fix, and
the architecture-routing fix from `omarjosephf/cited#13`. Verified afterwards
against the live service, not inferred:

- `GET /health` reports `7bddb04dedc7`, matching the checksum the export printed
  on the owner's machine and the one this repository computes. Two independent
  machines, same digest.
- "What is your AI Models?" returns the approved architecture text with **zero
  citations**, which is what distinguishes the fixed policy response from a
  generated one.
- A question naming Cited no longer receives E.V's own configuration.
- Retrieval still reaches `project-cited.md` when asked in the past tense, so
  the present-tense refusal is grounding judgement rather than a retrieval
  failure.

**The durable ledger survived a real machine restart.**
`answers_remaining_today` came back at 3 rather than resetting to a full
allowance. That is the first proof under production conditions of the property
the Fly volume exists for; the old in-process counter reset on every machine
start.


**RAG management panel** — `/manage` returns 404 in production **by design**,
asserted by `e2e/management-disabled.spec.ts`. Staging now has all ten
migrations applied. The encrypted backup path is no longer blocked by migrations
but is not activated.

## Owner-gated actions: 6 of 9 complete

| # | Action | State |
| --- | --- | --- |
| 1 | Commit the frontend candidate | Done — merged `b6fecb7` |
| 2 | Commit the backend candidate, repin eval, re-run | Done — merged `b94e886` in `omarjosephf/cited` |
| 3 | Owner visual and content review on a real device | Done — 13 Sep, desktop light/dark and phone |
| 4 | Decide the remaining retrieval miss | Done — fixed 12 Sep, live since the 13 Sep deploy; passes at rank 4 of 4 |
| 5 | Approve and provision the Fly volume | Done — `vol_r1j28g1m15o9j3pr`, ledger initialised 12 Sep |
| 6 | Verify the per-attempt price bound | Done — measured 12 Sep, $0.0024 against $0.04 |
| 7 | Approve funded answer captures | **Steps 1-4 done; every code blocker to step 5 is closed.** Both ledgers created, verified correct, entirely unspent. The sixth blocker — `AnswerConfiguration` carrying the live-service budget bounds — was fixed by `omarjosephf/cited#17`, merged 14 Sep as `6237ab5`, CI green. Verified against the merged code on 15 Sep. **Step 5, the paid capture, has not been run.** |
| 8 | Managed qualification | Partly — migrations applied; CAPTCHA, recovery, restore outstanding |
| 9 | Final publication approval and smoke checks | Open |

**Rows 8 and 9 have not been checked against the code.** What this file says
about Action 7 was read out of `omarjosephf/cited` at `6237ab5` on 15 September,
except where a line says otherwise. Rows 8 and 9 are carried forward from earlier notes, and this file
has been wrong about implemented state four times in a week — so treat them as
what was believed, not what is proven. **Verifying them is the first task after
Action 7 closes**, before either is planned or scheduled.

## Decisions, both now closed

**Release-manifest schema version — closed 12 September. No change needed.**
The concern was that fixing the Gemini thinking configuration and the
output-token cap would mean editing `answer_effort` and `answer_max_tokens`,
which are `const`-pinned in five places, forcing a v3 schema. Measurement showed
there is nothing to fix: thinking costs zero tokens and 1024 is ample. Keep v2,
keep the pins, write no migration. Reopen this only if a future measurement
shows thinking actually consuming budget.

**Live E.V — resolved 12 September.** The cause was the transport pair: the
deployed backend emitted an unversioned envelope while the frontend required
wire v3, so every reply failed closed. Fixed by deploying the paired backend
rather than rotating a key or rolling the frontend back. Both sides now speak
v3, verified against the live schema.

**One consequence to know about.** The ledger was initialised with a
carry-forward of 12 attempts, derived from September's Anthropic usage
(51,849 input tokens, about 9 calls, rounded up). But the **effective daily
ceiling is 10 attempts, not 40** — the $0.40 daily money cap binds before the
40-attempt cap at $0.04 per reservation. Carrying 12 charged $0.48 to today,
so `answers_remaining_today` is 0 until 00:00 UTC. Any carry-forward of 10 or
more would have done this. September is unaffected: $1.52 and 38 attempts
remain. **Do not re-initialise the ledger to clear this** — recreating a ledger
to regain allowance is the exact operation the runbook prohibits.

## Action 7: steps 1-4 done; step 5's code blockers are all closed

Steps 1-3 landed as `omarjosephf/cited#15`, the portfolio pin as
`omarjosephf/cited#16`, and the evidence-identity fix as `omarjosephf/cited#17`.
`cited` `main` is **`6237ab5`**, GitHub CI is green on it, and the complete gate
passes locally on the pinned interpreter.

**Step 4 is done.** On 14 September both permanent ledgers were created and then
verified by reading them back: the service ledger stamped
`150/150/6000000/6000000`, the allowance with ceiling `6000000` and carried `0`,
which the command echoed as 150 attempts. Both are correct, and both remain
**entirely unspent** — zero rows in each `reservations` table. Nothing about
them needs redoing, and item 5 of the durable-budget runbook never came into
play.

**Step 5 was refused, and not by anything an owner could fix at a keyboard.**
The paid capture was run on 14 September and refused before dispatching a single
call; no output file was created, which independently confirms no provider
request was made. The cause is a sixth blocker, below — a code defect in
`omarjosephf/cited`. This section previously stated that no code change stood
between the project and the paid capture. That was the fourth time this file has
been wrong about implemented state, and it was wrong in the most expensive place
available: at the confirmation prompt, with the spend already authorised.

**Where it stands now.** The design question the blocker raised was decided on
14 September and recorded as an ADR-0015 amendment: spend ceilings leave the
evidence identity, and the release manifest goes to v3. That fix is **merged** —
`omarjosephf/cited#17`, merge commit `6237ab5`, both CI checks green.

**Read the next two paragraphs as a pair; they are not the same claim.**

*Verified in the merged code on 15 September,* by reading `main` at `6237ab5`
rather than this file: all four spend ceilings are absent from
`release_manifest.py`, `ReleaseManifest.schema_version` is `Literal[3]`, and
`release-manifest-v3.schema.json` is on disk with v1 and v2 retained beside it.
The pin still holds: nothing under `content/` has changed between `fb77028` and
this repository's `main`, and the question set is 75 at both ends. Format, lint,
mypy and the full suite passed on Python 3.12.10 before the push, and CI passed
the same tree against the pinned revision afterwards.

*Verified on 15 September, after the above:* the state of both ledgers, read
directly with `sqlite3` in `mode=ro` rather than through the script. The
allowance holds ceiling `6000000` and carried `0`. The service ledger is stamped
`150/150/6000000/6000000`, which equals the four limits the script exports, so
`PersistentBudget` has no mismatch to refuse on. **Both `reservations` tables
are empty** — neither ledger has been drawn on at all — and
`integrity_check` returns `ok` on both. By `capture.py:97-99`
(`(ceiling - carried) // 40000 - count`) that is 150 attempts of allowance and
150 of service against an envelope of 150, so the capture clears all three
ceilings with exactly zero slack. This supersedes the 14 September readback as
the newest evidence; nothing was reserved to obtain it. **Step 5 has not been
run.** What closed is the last code defect standing in front of it; what
remains is an operator action against a non-renewing allowance, and this file
has been wrong four times at exactly the point where those two get conflated.

**`Invoke-PaidEvaluation.ps1` was read for the first time on 15 September, and
it is sound.** It had never been inspected, which on this project's record was
its own risk. Verified line by line against the merged code: `$SpecVersion` is
`'3.0'` and `release_evaluation.SPEC_VERSION` is `"3.0"`; `$MaxPaidCalls` is
150, matching the ADR-0015 envelope and the 2 x 75 headroom the CLI demands; it
is free by default and refuses to create either ledger. Its free preflight now
builds `_answer_configuration`, which is the check that did not exist on 14
September.

**Its pin gate covers the question set only.** `git diff --quiet $pinCommit --
$pinQuestions` compares `questions.toml` against the pinned revision and refuses
on a mismatch, but nothing compares the *corpus* or the *system prompt*, and
`deploy/oj-assistant` is gitignored — a staged artifact that CI rebuilds from
the pin on every run while the local copy is whatever was last staged. Checked
by hand on 15 September and clean: the staged corpus is byte-identical to
`fb77028:content/assistant`, the staged `system-prompt.md` byte-identical to
`fb77028:content/assistant-system-prompt.md`, and the corpus tree is
`94d7014` at `f53ddda`, at `fb77028` and at this repository's `main` — it has
not moved at all, so the earlier pin change could not have staled it. That is
true today and is not enforced by anything. **The restage was then done on 15
September rather than trusted:** `deploy/oj-assistant` was rebuilt by exporting
the portfolio at `fb77028` with `git archive` and running that revision's own
`scripts/export-assistant-corpus.mjs` against the export, which is what
`ci.yml:88` does. It produced checksum `7bddb04d` and a recursive diff against
the pre-restage copy found no change at all: the staging was already correct,
and is now correct by construction rather than by inspection. Restage again if
anything touches that directory before the capture.

**Nobody but the owner can run step 5.** The script reads both provider keys
through `Read-Host -AsSecureString` at the keyboard. No agent can supply them
and none should be asked to, so both the free preflight and the paid capture are
owner-operated by construction. The free preflight is the correct way to verify
both ledgers: it opens them read-only, reserves nothing, and prints
`service remaining`, `allowance left` and the effective ceiling before anything
can be spent. Run it, read those three numbers, and only then consider `-Paid`.

The key prompt sits *above* the preflight block and is **not** gated on `-Paid`,
so the free half is owner-operated for the same reason the paid half is. A
handoff that asks an agent to "run the free preflight and read the three
ceilings" is asking for something that cannot be done. What an agent can do
without keys is everything else: restage from the pin, run the pin gate, diff
the staged corpus and system prompt against the pinned revision, and read both
ledgers read-only as recorded above. What it cannot reach is `answering_enabled`
and `_answer_configuration` — precisely the two checks the preflight exists
to perform, and they remain unverified until the owner runs it.

On 13 September the paid command was run and refused before any provider call:

> Paid evaluation capture is disabled without an existing carried-forward
> qualification allowance (--allowance-ledger and --allowance-id).

Six things blocked it, and each was invisible until the one before it cleared.
The third was found on 13 September by reading the code rather than this file,
which until then asserted the run was ready to go. It was not. The fourth and
fifth were found on 14 September the same way. The sixth was found later that
day by running the paid command, because nothing free reaches it. Each bullet
below is marked with what it is today. This list has been wrong four times; read
the code before trusting it complete.

- **CLOSED by `cited#15` — the settings bounds rejected the capture envelope.**
  This was the real blocker, and no amount of correct command-line arguments got
  past it. `src/assistant/settings.py:153-156` in `omarjosephf/cited` hard-capped
  every budget field at exactly the live service's values, so pydantic refused
  the capture ceilings before any ledger was opened. The bounds now read
  `le=150` / `le=200` / `le=6_000_000` / `le=6_000_000`; as they stood:

  | Field | Bound today | Capture needs | |
  | --- | --- | --- | --- |
  | `daily_answer_limit` | `le=40` | 150 | blocks |
  | `monthly_answer_limit` | `le=200` | 150 | fits |
  | `daily_budget_micro_usd` | `le=400_000` | `6_000_000` | blocks |
  | `monthly_budget_micro_usd` | `le=2_000_000` | `6_000_000` | blocks |

  Three bounds needed widening, not four. `cmd_eval` builds `Settings(...)` and
  passes it to `service_budget(settings)` (`cli.py:249-254`), so there is no
  path around the model. ADR-0015's amendment authorised this widening in
  writing, and for a while the code was simply never written — `main` sat clean
  at `5d2dd8f` with nothing matching it in history. `cited#15` wrote it.
- **OPEN — neither ledger exists.** This one is step 4 itself, not an obstacle
  to it. `cmd_eval` refuses without `--allowance-ledger` and
  `--allowance-id`, and separately requires durable service accounting — a local
  `PersistentBudget`. Both are operator-initialised by design and neither may be
  recreated later to regain authority, so their ceilings are permanent choices.
- **CLOSED by `cited#15` — the budget bootstrap CLI could not stamp a
  capture-scoped service ledger.** `persistent_budget.main()` now takes
  `--daily-attempts`, `--monthly-attempts`, `--daily-micro-usd` and
  `--monthly-micro-usd`, defaulting to `BudgetLimits()`. As found on 14
  September, and why it made the commit three changes rather than two:
  `initialize_ledger` writes the limits *into* the ledger at creation
  (`persistent_budget.py:94`, `limits.encoded()`), and `PersistentBudget`
  refuses at runtime on any mismatch between the stored limits and the ones it
  is constructed with (`:193-197`,
  `BudgetUnavailable("budget_identity_or_limits")`). But
  `persistent_budget.main()` calls `initialize_ledger(..., BudgetLimits(), ...)`
  — the hardcoded live defaults, 40/200/US$0.40/US$2.00. The runbook's bootstrap
  command therefore creates a ledger permanently stamped at the live envelope.
  Run the capture against it with the widened settings and it refuses on the
  mismatch; run it with the live values and money binds first at 10 attempts.
  Either way the ledger is wrong, and §5 of the runbook forbids recreating one
  to fix it — so this must be corrected *before* step 3, not discovered during
  it. `persistent_budget.main()` needs explicit limit flags, keeping
  `BudgetLimits()` as the default so the production bootstrap command documented
  in the runbook keeps its current meaning.
- **STANDING — `--max-paid-calls 67` refuses on its own.** Not a defect; this is
  how the tool behaves, and it still governs the run. Before dispatching
  anything the capture demands room for two attempts per case (`cli.py`:
  `maximum = 2 * len(questions)`), so the 75-question suite needs **150**. That
  is compared against `min(--max-paid-calls, service, allowance)`
  (`capture.py:131`), so all three ceilings must independently clear 150. Note
  that US$6.00 is exactly 150 x $0.04: the money bound and the attempt bound
  coincide, with no slack between them.
- **STANDING — a partial run cannot substitute.** `release_manifest.py` requires
  the saved cases to equal the versioned question set exactly, so the suite
  cannot be sliced across several smaller runs and stapled together.
- **STANDING — the release needs *two* paid captures, and one allowance funds
  both.** Verified against the code on 15 September, because nothing recorded
  it. `release_manifest.py:232` requires both the `demo` and `portfolio` suites
  to be present, and the loop that follows applies
  `capture_state == "complete"` to **every** evaluation (`:244`), not only the
  deployment's selected one — `selected` narrows the corpus/prompt identity
  check at `:282` and nothing else. The demo suite therefore needs its own paid
  capture, gated at 2 x 15 = **30**, drawn from the same 150-attempt lifetime
  allowance. Portfolio still goes first, because its gate needs all 150 free.
  It spends 75 if every question answers on the primary, plus one more for each
  question that falls back to the backup, so **at most 45 of the 75 may fall
  back** before the demo capture becomes impossible and the manifest can never
  validate. Fallback is availability-only — billing, quota and authentication
  failures do not consume one — so this needs a primary outage mid-capture to
  bite, and there is no recovery if it does. Budget the demo capture as part of
  the same allowance, not as a later decision.
- **CLOSED by `cited#16` — `cited` pinned a portfolio revision the question set
  had outgrown.** `eval/portfolio-source.json` now pins `fb77028`; it pinned
  `f53ddda`, whose `content/assistant-eval/questions.toml` holds **70**
  questions, where the suite is **75**. CI reads that pin, checks the revision
  out, stages `deploy/oj-assistant` from it and evaluates *its* set
  (`ci.yml:73-99`). The corpus and the system prompt are byte-identical across
  the two revisions — only the question set moved, in `bc55d8b` and `ed21ea2` —
  so advancing the pin changed the cases and nothing else. **It could not be
  left until after the capture,** which is why it is recorded here rather than
  fixed quietly. `capture.py` only ever inserts into the allowance's
  `reservations` table and never deletes, so a completed 70-question capture
  spends roughly 63 of a 150-attempt lifetime ceiling. The 75-question capture
  is gated on the full 150 being available *before* it dispatches anything, so
  it could then never run — and item 5 of the durable-budget runbook forbids a
  replacement ledger. `docs/runbooks/builds.md` governs how the pin moves: a
  reviewed companion change, never a quiet edit alongside a capture.
- **CLOSED by `cited#17` — `AnswerConfiguration` carried the live service's
  budget bounds.** This is what refused the 14 September paid
  run. It was the first blocker's defect repeated in a second model that
  `cited#15` did not touch: `release_manifest.py:142-145` declared
  `daily_attempt_limit` `le=40`, `monthly_attempt_limit` `le=200`,
  `daily_budget_micro_usd` `le=400000` and `monthly_budget_micro_usd`
  `le=2000000`. `cmd_eval` calls `_answer_configuration(settings, top_k)`
  (`cli.py:277`) to build the evidence identity record, and pydantic rejected
  three of the four — the same three, with `monthly_attempt_limit` again the one
  that already fits. It failed closed before dispatch, which is the design
  working.

  **Point (b) is now traced, and it holds — more strongly than first written.**
  The capture's recorded values were never a free parameter.
  `PersistentBudget._check_identity` (`persistent_budget.py:185-198`) refuses
  any settings that disagree with its ledger's stamped limits, so a capture
  against the 150-stamped service ledger can only ever record
  `150/150/6000000/6000000`; `Invoke-PaidEvaluation.ps1:185-188` already sets
  exactly those. `release_manifest.py:249-250` then requires that config to
  equal `manifest.answer_configuration` — for **every** evaluation, against a
  **single** manifest field, so both suites are bound to the same envelope. The
  deployment that evidence qualifies runs at 40 / `400000` / `2000000`,
  asserted against `fly.oj-assistant.toml` by
  `test_operating_caps_and_worker_settings_validate_against_runtime`. One field
  cannot hold both. So widening the three bounds would not have fixed anything:
  it would have moved the refusal from a free pre-dispatch check to the release
  gate, after the one capture the allowance funds had been spent — or bought a
  green gate with a manifest that misdescribes the running service.

  The schema conflict was also understated. `tests/test_release_manifest.py`
  asserts the checked-in schema equals `ReleaseManifest.model_json_schema()`
  exactly, so widening the model fails CI; the only way to keep it green
  without a new version is to rewrite the published v2 document in place.

  **Decision, 14 September: the four spend ceilings are removed from
  `AnswerConfiguration`, and the manifest goes to v3.** Recorded as an
  amendment to
  [ADR-0015](../adr/0015-durable-budget-and-provider-order.md#spend-ceilings-leave-the-evidence-identity-14-september-2026).
  v3 rather than an in-place v2 edit because removing required fields breaks in
  both directions, and two incompatible shapes must never both stamp
  `schema_version: 2`. No v2 instance is known to exist, which makes v3 cheap
  rather than making an in-place edit safe. v1 and v2 stay on disk, referenced
  by nothing.

  **The fix is merged.** It went in as `omarjosephf/cited#17` from branch
  `fix/evidence-identity-excludes-spend-ceilings`, squash-merged to `6237ab5`
  on 14 September after owner review, with both CI checks green. An unrelated
  build-lock bump found in the same working tree was split onto
  `chore/build-lock-bump` and deliberately left unmerged with no PR: those are
  build packages feeding the image digest the manifest tuple pins, so they want
  the dependency review a Dependabot bump gets, not a silent lock refresh.
- **CLOSED by `cited#17` — no free path built the evidence identity.** This is why a three-line bound mismatch survived to the
  confirmation prompt rather than being caught in CI months earlier. Nothing
  free reached `_answer_configuration`: the preflight never called it, and the
  13 September rehearsal has no `config` key at all
  (`eval/results/portfolio-rehearsal.json`, verified), because the call sat
  inside the paid branch. `docs:check-budget-envelope` keeps the envelope and
  the question count in step but does not reach `AnswerConfiguration`, and
  still does not — it is a Node script that never imports the Python.

  The free evaluation path now builds and validates the same record a capture
  writes, and records it in the rehearsal evidence. Because the ceilings no
  longer reach it, that record is byte-identical to the paid capture's —
  verified by running the free path under the exact `150/150/6000000/6000000`
  environment that refused on 14 September, which now passes. The operator
  preflight in `Invoke-PaidEvaluation.ps1` builds it too, so a run that goes
  straight to `-Paid` still meets a free, specific failure before the
  confirmation prompt. A half-configured credential environment still completes
  a free retrieval run: a configured credential alone never triggers inference,
  and the absence of one must not break a free run either.

  **Note for whoever touches this next: `_write_run` (`cli.py`) is dead code.**
  It is a second, fully-formed writer of the same identity record, called from
  nowhere in the repository. It was left in place rather than deleted, because
  removing it is a separate decision — but it is not a free path, and reading
  it as one is an easy mistake.

**The root cause was one envelope doing two jobs.** The capture inherited the
live service's spend limits, because both build from the same `Settings` model.
40 attempts and $0.40/day bound *visitor* traffic; they were never sized for a
one-off qualification run needing 150.
[ADR-0015](../adr/0015-durable-budget-and-provider-order.md) now records a
capture-scoped envelope of 150 attempts and US$6.00, the live service unchanged
at 40/200 and US$0.40/US$2.00. `docs:check-budget-envelope` keeps that envelope
and the question count in step, so a suite that outgrows it fails CI rather than
a paid run.

**The allowance funds exactly one portfolio capture, and the order is a
permanent choice.** `release_manifest.py:203-215` requires evaluations for
*both* suites, each with `capture_state == "complete"`, and only the paid path
ever writes that field — so the 15-question demo suite needs a paid capture of
its own, gated at 30 attempts. Portfolio first spends roughly 67 of the 150 and
leaves room for the demo's 30. Demo first spends from the same lifetime ceiling,
and the portfolio gate — which needs the full 150 available before dispatch —
can never be met again. Nothing in the code enforces this order: the first
command that touches the allowance ledger decides it.

## Action 7: the approved plan, decided 13 September

Owner-approved on 13 September. The work is in `omarjosephf/cited`, not this
repository, and is still Action 7.

**Steps 1-3 are done and merged** as `omarjosephf/cited#15`, and the portfolio
pin as `omarjosephf/cited#16`. They are kept below as the record of what was
decided and why. **Step 4 was completed on 14 September. The sixth blocker
closed on 14 September with `omarjosephf/cited#17`, so step 5 is no longer
blocked by code.** What is left is the operator action itself, against a
non-renewing allowance: read steps 2 and 3 below for how the run is made, and
re-read `docs/runbooks/durable-budget.md` and both ledgers before typing
anything. Step 5 has not been run.

Superseded as a plan; retained as the procedure. Steps 4 and 5 were to be done
in one sitting, in this order:

1. Create the **service** ledger, then the **allowance** ledger, with the
   runbook commands verbatim. Check the command line before pressing Enter:
   `persistent_budget` echoes its stamped limits only *after* it has created the
   ledger, and `capture.py` echoes the attempt count but does not pause.
2. Run `Invoke-PaidEvaluation.ps1` **without** `-Paid`. It is free, refuses on a
   pin mismatch, and reports the specific configuration or ledger fault instead
   of the CLI's single generic line.
3. Run it again **with** `-Paid`. The portfolio capture must be the first
   command that ever touches the allowance ledger — see the ordering constraint
   above.

1. **Widen the three bounds in `settings.py`, as ADR-0015 already specifies.**
   The alternative considered was a separate capture-scoped settings type,
   keeping `Settings` pinned at production values. That is arguably the better
   design — it splits the overloaded envelope instead of widening it — but
   ADR-0015 already chose widening, stated the trade-off, and named the
   replacement guards. Reopening it buys a distinction the deployment test
   already enforces. **If that design is ever revisited, it is an ADR amendment,
   not a quiet implementation choice.**
2. **Add a CLI entrypoint for the allowance ledger**, mirroring the one
   `persistent_budget` already has. `QualificationAllowance.initialize`
   (`capture.py:43`) is a static method with no `__main__`, so today the only
   way to create the ledger is an improvised snippet. Ledger creation is
   permanent by design and cannot be redone to regain authority; improvising it
   is the class of mistake that has no undo. Treated as non-negotiable, not a
   nicety.
3. **Give `persistent_budget.main()` explicit limit flags.** Added 14 September;
   see the fourth blocker above. Without this there is no way to create the
   capture's durable *service* ledger at 150 / US$6.00, and the ledger it does
   create cannot be corrected afterwards. Steps 1-3 are one commit and one PR;
   none of them creates a ledger or spends anything.
4. **Initialise both ledgers**, using the exact commands in the durable-budget
   runbook's [qualification allowance
   ledger](../runbooks/durable-budget.md#qualification-allowance-ledger)
   subsection rather than values transcribed from here. **The allowance ceiling
   is money in micro-USD, not a count of attempts**: the 150-attempt envelope
   is `6000000`, and a ceiling of `150` is US$0.00015 and buys nothing. The
   service ledger takes both, and needs all four limit flags or it is stamped
   at the live envelope. Carry-forward is **0** on both — there is no prior
   qualification spend on record to reconcile. Every one of these values is
   permanent; read the attempt count each command echoes back and confirm it
   aloud at the moment of creation rather than trusting this line.
5. **Run the capture**, then the free review steps.

**Widening the bounds does not set the values.** `cmd_eval` builds
`Settings(retrieval_top_k=args.top_k)` (`cli.py:251`) and the `evaluate`
subcommand has no budget flags, so widening only makes 150 / `6_000_000`
*admissible* — the run still has to supply them. `Settings` declares no
`env_prefix` and the workspace has no `.env`, only `.env.example`, so they come
from the shell session as `DAILY_ANSWER_LIMIT`, `MONTHLY_ANSWER_LIMIT`,
`DAILY_BUDGET_MICRO_USD` and `MONTHLY_BUDGET_MICRO_USD`, alongside
`BUDGET_PATH` and `BUDGET_LEDGER_ID`. Leave `FLY_APP_NAME` and
`budget_machine_id` unset locally, or `service_budget` applies the Fly mount
checks (`capture.py:120-149`) and refuses.

Production stays guarded throughout by
`test_operating_caps_and_worker_settings_validate_against_runtime`
(`tests/test_deployment.py:417`), which reads the deployed
`fly.oj-assistant.toml` and asserts 40/200 and the 10/50 reservation counts.
That test is independent of the schema bounds and is unaffected by widening
them — which is precisely why ADR-0015 judged the schema guard redundant.

Cost: 67 paid calls are expected of 75 questions; 8 are decided by pre-model
policy guards and cost nothing. At the measured $0.0024 per call that is about
**$0.16**. The $0.34 recorded when this action was approved does not reconcile
with the measured rate — treat it as the approved ceiling, not a forecast. The
US$6.00 envelope is reservation headroom at the pinned $0.04, not money spent.
None of the above changes the cost.

Still true, and still worth knowing:

- **`Invoke-PaidEvaluation.ps1` in the workspace root was rewritten on 14
  September.** The old one was built for the retired Anthropic path: it
  validated an `sk-ant-` key prefix, defaulted to `-SpecVersion v2.1` and 60
  calls against a 54-question set, passed no ledger flags, and pushed into
  `$cfg.Service`, whose path in `assistant-ops.psm1` points at a `Downloads\`
  directory that no longer exists. Every one of those failures surfaces as the
  same generic refusal as a real budget problem. The replacement is free unless
  given `-Paid`, refuses on a pin mismatch, refuses to create either ledger, and
  runs a free preflight that constructs `Settings`, `service_budget` and both
  ledgers read-only before anything can spend.
- `cited-release-candidate/.venv` is **Python 3.12.10** with the locked
  dependencies installed; `import assistant, numpy` succeeds. CI uses 3.12.13.
  The locks are compiled for 3.12 and select by `cp312` ABI, so the patch
  difference does not change which wheels install. Record it in `--reason`
  rather than leaving it unstated.
- **`GEMINI_API_KEY` lives only in the owner's PowerShell session,** and it is
  not sufficient on its own. `cmd_eval` requires `settings.answering_enabled`,
  which needs all seven of `GEMINI_API_KEY`, `GEMINI_PROJECT_ID`,
  `GEMINI_ACCOUNT_VERIFIED`, `OPENAI_API_KEY`, `OPENAI_PROJECT_ID`,
  `OPENAI_ACCOUNT_VERIFIED` and `ENABLE_FALLBACK` (`settings.py:290-308`).
  Neither key is persisted; both are gone when the window closes. Set them with
  a masked `Read-Host -AsSecureString`; setting one inline writes it to
  `ConsoleHost_history.txt` on disk. `Set-Provider-Keys.ps1` is **not** the tool
  for this — it writes Fly secrets, not session variables.
- A paid run requires `--paid`, `--max-paid-calls`, `--output`, `--spec-version
  3.0`, `--allowance-ledger` and `--allowance-id` together. Omitting any of them
  refuses the run before any call is made, which is easy to mistake for a
  failure.
- **The suite and its inputs are not defaulted, and the defaults are wrong.**
  The run also needs `--suite portfolio`, `--questions <the pinned portfolio
  set>` and `--corpus deploy/oj-assistant/content` — the last a *global* flag,
  so it goes before `eval`, not after — plus
  `SYSTEM_PROMPT_FILE=deploy/oj-assistant/system-prompt.md`, which
  `fly.oj-assistant.toml` serves and `release_manifest.py` compares the capture
  against. Left at their defaults these give cited's own 15-question demo set,
  the demo corpus and the built-in prompt: a paid run the manifest rejects.
- **Exit 1 is the expected outcome of a good capture,** not a failure.
  `answer_failures` reports every answer awaiting claim-level review, and
  immediately after a capture that is all of them. Only exit 2 is a refusal.
  Re-running a paid capture on a 1 spends the allowance a second time.
- The eval calls the provider directly and does **not** draw on the deployed
  service's daily allowance — but it does require its own durable local ledger.
- `--output` must name a new file; the CLI refuses to overwrite evidence, and an
  unsaved paid run has to be paid for twice.

After the capture, `review --run <run> --template --output <sheet>` writes the
blank labelling sheet, and `review --review <filled>` scores against it. Both
are free. Recruiting independent labellers is the long pole, not the money.

## Retrieval as measured on 13 September

A free rehearsal run (no `--paid`, so retrieval only) against the deployed
corpus `7bddb04dedc7` and the 75-question set at `2caff9d`:

| | |
| --- | --- |
| Hit rate | 100% (expected section in top-k) |
| Critical core | 100% of 16 — **PASS** |
| top-1 | 76% |
| Separation | -0.189, negative as ADR-0002 describes |

**Three questions sit at rank 4, and `--top-k` is 4.** They pass, but one rank
from missing entirely:

- *"What was the original Cited demo built with?"* — added in PR #67 as evidence
  that retrieval reaches `project-cited.md`. It does, marginally. The PR called
  that "retrieval works", which was true but overstated.
- *"What kind of work does OJ take on now?"* — the question the 12 September
  retrieval fix was written for. The fix worked, and only just.
- *"And what technologies did he use for that one?"*

Nothing here is failing, so nothing is proposed. Recorded because a rank-4 pass
and a rank-1 pass read identically in the headline number, and the next corpus
edit could push any of these out without touching the hit rate until it does.

## The price bound, measured

Six real calls against `gemini-3.5-flash-lite` on 12 September, using the actual
system prompt and four real corpus documents (`measure-gemini-thinking.py`):

| | observed | bound | headroom |
| --- | --- | --- | --- |
| Thinking tokens | **0** | — | — |
| Visible output | 147–388 | 1024 cap | 2.6x |
| Latency | 1.0–1.59 s | 3 s primary | 1.9x |
| Cost | $0.0021–$0.0027 | $0.04 reservation | 15x |

Every call returned `finishReason: STOP`. None truncated, at any cap tried
(1024, 1536, 2048), with `thinkingLevel` both absent and explicitly `minimal`.

`thoughtsTokenCount` was absent from every response, and in all six
`totalTokenCount` equalled `promptTokenCount + candidatesTokenCount` exactly.
Since Google defines the total as prompt + thoughts + candidates, that absence
is a real zero rather than unreported usage.

So `answer_max_tokens = 1024` stands, no `thinkingConfig` is needed, and the
$0.04 reservation is roughly fifteen times the measured cost. **This closes
owner-gated action 6.**

The honest limit of this evidence: one question, six calls. A harder question
could think more. Before publication, run the same measurement across the
critical-core questions — about 50 calls for roughly $0.12 — to bound it
properly rather than extrapolating from one.

### Why the bound matters, and what remains open

- `maxOutputTokens` bounds thinking and visible output together — Google's
  wording is "including thought tokens". Exceeding it returns
  `finishReason: MAX_TOKENS` with truncated output, **still billed for the
  thinking**. `provider_adapters.py` rejects that as `provider_finish`, which by
  contract does not fall back, so the reservation is spent and the visitor gets
  an error. That is the failure the measurement above rules out at 1024.
- `minimal` is supported for `gemini-3.5-flash-lite` and is its default, so the
  adapter sending no thinking parameter already gets the floor. Measurement
  found no difference between absent and explicit `minimal`, so declaring it
  buys nothing today.
- Published paid rates: **$0.30 per 1M input**, **$2.50 per 1M output including
  thinking**. An earlier note in this file said ~$0.012 per answer; the measured
  figure is ~$0.0024.
- **Closed 12 September: paid tier.** A Free Tier exists at no charge, but the
  pricing table marks free-tier traffic "used to improve our products: Yes"
  against "No" for paid. For an assistant taking arbitrary visitor questions that
  is a threat-model decision, not a billing one, and at ~$0.36/month the saving
  was never the point. Recorded in
  [ADR-0020](../adr/0020-gemini-paid-tier-for-visitor-input.md). **No repo field
  carries the tier**, so it was confirmed in the console on 13 September: project
  `EVSmartAssistant` is Tier 1 with £0.02 billed since 17 August, and a £5.00
  monthly spend cap is set. Billed usage is the proof — free-tier traffic costs
  nothing. The cap is Google-flagged experimental with ~10 minute latency, so it
  is a backstop rather than a bound.
- `measure-gemini-thinking.py` in the workspace root reproduces the measurement.
  It needs only `GEMINI_API_KEY` and never prints it; `--dry-run` exercises it
  with no key and no call.

## Release-packet blockers that CI already closes

The 11 September release packet lists four blockers "that are not owner-only".
Checked against the actual CI run for `cited` on 12 September, three are closed:

- **Linux container not built** — CI builds the image on Ubuntu every run, and
  local Docker was never needed since `fly deploy --remote-only` builds on Fly's
  builder. But CI only *built* it: the first deploy crash-looped ten times on a
  missing `packaging`, because a package in both requirement locks never reached
  `/install`. Fixed in `omarjosephf/cited#10`, which also makes CI start the
  container and import the app. Building is not running.
- **Python 3.12.13 not exercised** — closed 12 September. CI runs on exactly
  3.12.13, and so does this machine: uv keeps it under
  `AppData\Roaming\uv\python`. "Only 3.13 is installed" was true only of
  `AppData\Local\Programs\Python`. The backend suite now runs locally on the
  pinned interpreter: 793 passed, 7 skipped.
- **Eval pinned to a pre-refinement corpus** — closed 12 September, when
  `eval/portfolio-source.json` pinned `b6fecb7c`, the PR #54 merge, whose
  `content/assistant` tree is byte-identical to `db774af`. CI also passes
  `--suite portfolio` correctly. **The pin has moved twice since and this line
  should not be read as its current value:** it is `fb77028` as of 14 September
  (`omarjosephf/cited#16`). The corpus was never the problem the second time —
  the *question set* had outgrown the pinned revision. See the Action 7 blocker
  list above, and read the file rather than this paragraph.

The fourth, the timing-marginal management accessibility test, was fixed by
measuring it rather than guessing. Splitting the full-page screenshot into its
own test — the packet's preferred option — moved only 5.5 seconds; the six axe
scans are the real cost, at **28.7 seconds** against Playwright's 30-second
default. The scan test therefore also carries an explicit 90-second timeout that
records that measured cost. Both changes are in place, no check was dropped, and
a real failure still fails. Treat the packet's section 6 as historical from here.

## Environment facts that cost time when unknown

- **`omarjosephf/cited`** is a second repository. Attach it with `add_repo`; the
  Claude GitHub App is installed on both, so pushes work.
- **The workspace moved to OneDrive** (`OneDrive\Documents\OJ Portfolio
  Workspace`). Absolute paths from before 11 September are wrong. The backend's
  virtualenv still carries baked interpreter paths from the old location, so its
  console-script shims and editable install are broken — rely on CI, or rebuild
  the venv outside OneDrive. The seven worktrees under `.codex\worktrees\` broke
  the same way; `git worktree repair` from the clone fixed all seven on
  12 September, and nothing was lost because the repository's own back-pointers
  had stayed correct.
- **Egress is restricted from cloud sessions only.** `fly.io`, `vercel.com`,
  `ai.google.dev`, `ojfr.me` and `oj-assistant.fly.dev` are blocked there;
  WebSearch works. A session on the owner's own machine reaches all of them, so
  live diagnosis belongs in a local session — that is how the transport fault
  above was found. Acting on Fly or Vercel still needs the owner.
- **Playwright/Chromium mismatch — not present in every worktree.** It was
  real where it was found, but on 12 September both browser suites ran clean
  here: 89 production and 46 management checks. Try them before assuming CI is
  the only route to browser evidence.
- **Supabase is on the Free plan.** Leaked-password protection is Pro-only, so
  that advisor finding cannot be closed and is not neglect. There is exactly one
  account, so a strong unique password gives the same protection.
- **Cloudflare connector reaches a different account** than the one holding
  `ev-private-backups`. It cannot verify the backup bucket.

## The bug class this project keeps hitting

A list written in more than one place with nothing keeping the copies honest.
It has appeared four times: the handbook gate versus `package.json`; the
reviewed migration versions across three files; `test:ci` versus `ci.yml`; and
Appendix A's duplicate of the gate list. Two mechanical checks now guard these —
`docs:check-handbook-gate` and `docs:check-migration-manifest` — and each caught
a real instance within hours of being written. When adding a list that must
match another, add the check with it.
