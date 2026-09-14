# Current state

Updated 13 September 2026. This file is what a fresh session should read first.
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
| 7 | Approve funded answer captures | Approved 13 Sep; free rehearsal passed. Steps 1-3 merged as `omarjosephf/cited#15` (`main` `4e08207`). **Steps 4-5 blocked** — `eval/portfolio-source.json` pins a 70-question revision and the suite is 75; see below |
| 8 | Managed qualification | Partly — migrations applied; CAPTCHA, recovery, restore outstanding |
| 9 | Final publication approval and smoke checks | Open |

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

## Action 7: steps 1-3 merged; the capture is blocked on a stale pin

Steps 1-3 landed as `omarjosephf/cited#15`. `cited` `main` is `4e08207`, GitHub
CI is green, and the complete gate passes locally on the pinned interpreter.
That closed the two code defects below, and only those two. On 13 September the
paid command was run and refused before any provider call:

> Paid evaluation capture is disabled without an existing carried-forward
> qualification allowance (--allowance-ledger and --allowance-id).

Each was invisible until the one before it cleared. The third was found on 13
September by reading the code rather than this file, which until then asserted
the run was ready to go. It was not. The fourth was found on 14 September the
same way. **A fifth, found the same way on 14 September, is open and is now the
live blocker.** Each bullet below is marked with what it is today. This list has
been wrong three times; read the code before trusting it complete.

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
- **OPEN — `cited` pins a portfolio revision the question set has outgrown.**
  `eval/portfolio-source.json` pins `f53ddda`, whose
  `content/assistant-eval/questions.toml` holds **70** questions. Portfolio
  `main` (`fb77028`) holds **75**. CI reads that pin, checks the revision out,
  stages `deploy/oj-assistant` from it and evaluates *its* set
  (`ci.yml:73-99`). The corpus and the system prompt are byte-identical across
  the two revisions — only the question set moved, in `bc55d8b` and `ed21ea2` —
  so advancing the pin changes the cases and nothing else. **It cannot be left
  until after the capture.** `capture.py` only ever inserts into the allowance's
  `reservations` table and never deletes, so a completed 70-question capture
  spends roughly 63 of a 150-attempt lifetime ceiling. The 75-question capture
  is gated on the full 150 being available *before* it dispatches anything, so
  it could then never run — and item 5 of the durable-budget runbook forbids a
  replacement ledger. Advance the pin first, through a reviewed change, per
  `docs/runbooks/builds.md`.

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

**Steps 1-3 are done and merged** as `omarjosephf/cited#15`; `main` is
`4e08207`. They are kept below as the record of what was decided and why. Step 4
is next, and is blocked until the portfolio pin is advanced — see the fifth
blocker above.

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
- **Eval pinned to a pre-refinement corpus** — `eval/portfolio-source.json` pins
  `b6fecb7c`, the PR #54 merge on `origin/main`, whose `content/assistant` tree
  is byte-identical to `db774af`. CI also passes `--suite portfolio` correctly.

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
