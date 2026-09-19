# Current state

Updated 19 September 2026. This file is what a fresh session should read first.
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
asserted by `e2e/management-disabled.spec.ts`. Staging has all ten migrations
applied. The encrypted backup path is no longer blocked by migrations but is not
activated.

**That migration claim was checked against the live database on 17 September and
is true** — the first time it had been verified rather than repeated. It had sat
here unchecked since 11 September while two other documents said the opposite,
and this file happened to be the one that was right. The objects were read out
of the catalogs, not just the version rows, and the security advisors agree; the
[migration runbook](../runbooks/ev-staging-migrations.md) carries the evidence.

**Package 17 merged on 19 September 2026** as `f849648`, adding a seventh,
read-only RAG configuration section to the panel — chunking, embedding model and
per-question cost. It changes nothing a visitor can reach: `/manage` is still
404 in production. It is instructor-set coursework and **not a release gate**;
packages 13–16 still define public release and none of them moved. `verify` was
green on head `91e0835`, and `release-approval` passed on the
`approved-to-deploy` label, applied on the owner's explicit instruction under
[ADR-0021](../adr/0021-recorded-approval-to-merge-main.md) and recorded in a
comment on the pull request. **Three costing items stay open** and the merge
closes none of them: the per-answer figure rests on six calls of one question,
no invoice has been read into this repository, and the public setup and retainer
prices await an owner decision.

## Owner-gated actions: 6 of 9 complete

| # | Action | State |
| --- | --- | --- |
| 1 | Commit the frontend candidate | Done — merged `b6fecb7` |
| 2 | Commit the backend candidate, repin eval, re-run | Done — merged `b94e886` in `omarjosephf/cited` |
| 3 | Owner visual and content review on a real device | Done — 13 Sep, desktop light/dark and phone |
| 4 | Decide the remaining retrieval miss | Done — fixed 12 Sep, live since the 13 Sep deploy; passes at rank 4 of 4 |
| 5 | Approve and provision the Fly volume | Done — `vol_r1j28g1m15o9j3pr`, ledger initialised 12 Sep |
| 6 | Verify the per-attempt price bound | Done — measured 12 Sep, $0.0024 against $0.04 |
| 7 | Approve funded answer captures | **Step 5 ran on 15 Sep and failed at question 37 of 75.** Every code blocker is closed and merged, the seventh (`omarjosephf/cited#18`, a refused `os.replace`) as `360e8fa`, CI green. **The replacement allowance ledger was created on 17 Sep** as `allowance-225.sqlite3`, ceiling `10440000` carrying `1440000`, 0 reservations, `integrity_check` `ok`, reading **225 attempts**; the retired `allowance.sqlite3` is kept unspent-from at 114 under runbook item 5. The **service** ledger still holds its 36 September reservations and reads 114 until the month turns. So the remaining blocker is the calendar: **the earliest capture is 1 Oct 2026 UTC**. **No complete capture exists.** |
| 8 | Managed qualification | **Checked against the code 17 Sep.** Packages 1–12 of [the 16-package tracker](../roadmaps/ev-management-progress.md) are complete; 13–16 are not. **Restore is done, not outstanding** — `test:management:restore` ran here on 17 Sep, 46 isolated checks passed, with a recovery contract and evidence review behind it. "Recovery" is two things: application-data recovery is those 46 checks; **managed Supabase recovery and off-site backups are not started** (package 13). **CAPTCHA is code-complete, wired into the owner sign-in and locally qualified**; what remains is a Turnstile site key in `EV_AUTH_TURNSTILE_SITE_KEY` and the enforcement setting inside Supabase Auth — console actions, not code. **Package 15 is blocked on Action 7's answer captures** and on independent human labels. **Re-checked 17 Sep against the live staging database**, which had never been done: all ten migrations are applied and their objects exist, so package 13's *event staging* is complete and only the deployed backend call, managed recovery and CAPTCHA remain on it. |
| 9 | Final publication approval and smoke checks | Open, but advanced on 17 Sep. **The smoke-check runbook now exists** — [`docs/runbooks/deployment.md`](../runbooks/deployment.md), the file handbook §38 required and §34 assumed, absent until now. Its free read-only checks were executed against `https://ojfr.me` the same day, so **the production denial is verified against the live deployment** for the first time: `/manage`, `/manage/live`, `/api/management/owner` and `/api/conversations` all return 404 on the real Vercel instance, not merely on a local build. **The free checks have now run three times**, the second after a deployment and the third over a genuinely changed build, passing identically each time — so the denial holds across a deploy and across a dependency upgrade, not merely at one moment. **The browser checks were run for the first time on 17 Sep, and all four items now pass**: navigation and interactions, console and network errors, responsive, and `prefers-reduced-motion` — the last run with Playwright against production, with a no-preference control proving the preference takes effect rather than the page having nothing to animate. **The deployed SHA is no longer outstanding.** A fourth free run on 17 Sep, after #94 merged as `4231867`, is the first to name the deployment it tested: GitHub's Deployments API records that commit's production deployment as `success`, and the checks ran after it. §34 step 6 is answered, and it needed no Vercel console. What remains: contact delivery, the assistant check — both owner-operated, both with side effects — and the owner's publication approval. **None of this is a release smoke pass**, and no single run has covered everything: the browser items straddle the `4231867` deploy, three before it and one after. |

**Rows 8 and 9 were both checked against the code on 17 September**, row 9 later
the same day and against the live deployment as well as the tree. What this
file says about Action 7 was read out of `omarjosephf/cited`
at `6237ab5` on 15 September and re-checked against `origin/main` at `360e8fa`
on 17 September, except where a line says otherwise.

Row 8's check was requested by the owner ahead of Action 7 closing, and it found
the previous row materially wrong: it listed restore as outstanding when restore
passes 46 checks, and it collapsed two different kinds of recovery into one
word. That is the fifth time this file has been wrong about implemented state.
**The evidence is the two suites executed on 17 September plus the package
tracker**, which is itself dated 9 September — so the tracker's prose may
understate progress, while the executed checks are current. Where they disagree,
believe the checks.

**Row 9's unwritten half is now written, and one slice of it is proven.** The
earlier note here said the production-denial code existed but no smoke-check
procedure did. The procedure now exists as
[`docs/runbooks/deployment.md`](../runbooks/deployment.md), and running its free
checks turned up the first live evidence for row 9: the four management and
conversation paths return 404 on the deployed instance, which `e2e` could only
ever assert against a local build. The rest of row 9 is still unproven — the
checks with side effects are unrun, `prefers-reduced-motion` is untested, and
publication is unapproved. Do not read the runbook's existence as the row being
closed.

**The free checks were run a second and then a third time the same day**, and
every one passed each time. That is worth more than a repeat: the first run
happened with nothing deployed that day, so it proved the denial at a moment;
the second followed a deployment, so it proves the denial survives one; and the
third followed #91, the first merge recorded here that changed what is served
rather than shipping documentation, so it proves the denial survives a dependency
upgrade as well. All three are in the runbook's evidence log, as is the browser
pass that followed them. **This file knew only of the first two until now** —
#93 recorded the third in the runbook and never came back here, which is the
same drift this file keeps cataloguing.

**No *response* identifies the build, and that half is settled.** Two candidate
fingerprints were tested against the live site: Next.js 16 serves assets under a
fixed `/_next/static/immutable/` segment carrying no per-build identifier, and
`X-Vercel-Id` changes on every request because it is a request trace. So no
check against the live site can say which commit is serving.

**The other half was wrong, and was corrected on 17 September.** This file said
reading the deployed SHA "stays a Vercel console action... no agent can perform".
It is not a console action: Vercel's GitHub integration writes every production
deployment to GitHub's own Deployments API with its source SHA and a status,
readable with `gh` by anyone who can read the repository. That is how the fourth
smoke run identified `4231867`. The claim had never been tested — it was
inferred from the fingerprint result and then repeated, which is the same shape
as the migration drift below: an assertion about something outside this
repository, made without reading it.

**The two are not equivalent, and the distinction is the point.** The deployment
record is Vercel's report of what it deployed; a fingerprint would be the live
site's account of what it is running. A rollback or promotion made in the console
afterwards would not show in the record. So exposing a fingerprint is still worth
doing and is still R2 — but it now buys a narrower thing than this file claimed,
and §34 step 6 no longer waits on it.

**The Vercel MCP connector is not the route.** Tested 17 September: `403
Forbidden`, "Trying to access resource under scope `oj-s-personal-projects`. You
must re-authenticate to this scope." Same shape as the Cloudflare connector
reaching the wrong account, recorded below. Re-authenticating it is an owner
console action; reading the GitHub record needs nothing.

**Action 8 was carried further on 17 September, against the live staging
database rather than against documents.** All ten migrations are applied —
verified by reading the objects each one creates out of the catalogs, and
corroborated by the security advisors showing exactly the change the runbook
predicted. 122 database checks and 46 restore checks were executed here, 0
failed. The tracker and the migration runbook were both stale and are corrected;
see [the reconciliation checkpoint](../roadmaps/ev-management-progress.md#reconciliation-checkpoint-17-september-2026).

**Package 13's last reachable item needs the owner and costs nothing.** The
deployed backend event integration is implemented at both ends and deployed —
the backend has emitted `X-Assistant-Event` since the same commit that
introduced wire v3, which is what the 13 September deploy carried, and the live
`/health` still reports that corpus. One end-to-end call would prove it. That
call needs `X-Assistant-Secret` at the keyboard, so no agent can make it. It
need not spend money: `screen_question` runs before retrieval and before any
paid call, and a question retrieving nothing is refused at the prefilter, so a
deliberately off-corpus question returns a real event with `route: "none"` and
`model: null` without dispatching a provider request.

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

## Action 7: step 5 ran, failed at question 37, and spent 36 of 150 attempts

Steps 1-3 landed as `omarjosephf/cited#15`, the portfolio pin as
`omarjosephf/cited#16`, and the evidence-identity fix as `omarjosephf/cited#17`.
`cited` `origin/main` is **`360e8fa`** — the locked-replace fix `cited#18`,
squash-merged after `6237ab5`. GitHub CI is green on it. This file said
`6237ab5` until 17 September, which was true only until `cited#18` landed.

**The local clone is on `main` at `360e8fa`, as of 17 September.** It was
fast-forwarded from the stale `6237ab5` and its working tree is clean and
byte-identical to `origin/main`; `fix/capture-survives-a-locked-replace` is
retained locally and on the remote, and nothing was rewritten. Until then the
clone sat on that branch — the code a capture would run was already correct, but
the checkout did not say so on its face, and evidence should come from a
checkout that is provably the merged code.

**The complete gate has still not been re-run against `360e8fa` on this
machine**; it last passed locally on the pinned interpreter at `6237ab5`. What
was run against `360e8fa` on 17 September is narrower and should not be read as
the gate: `tests/test_capture.py` only, 10 passed on Python 3.12.10, including
all three of `cited#18`'s locked-replace tests. GitHub CI is green on the full
tree.

**Step 5 ran on 15 September and did not complete.** It stopped at question 37
of 75 with exit 2, having spent **36 of the 150-attempt lifetime allowance**.
114 attempts remain. The portfolio suite is gated on 150 being free *before* it
dispatches anything, so **this allowance can no longer fund it**. Item 5 of the
durable-budget runbook forbids a replacement ledger that *regains* an allowance;
the 17 September amendment below authorises one that carries the 1,440,000
micro-USD already spent forward, which does not, and which was created on
17 September. The two ledgers that existed on 15 September — the now-retired
`allowance.sqlite3` and the service ledger — each hold 36 reservations and each
still read 114; `integrity_check` is `ok` on both, re-read read-only on
17 September. **There are now three ledger files and only the service one is
still in play**, the retired allowance being kept as a record and the
replacement carrying its spend forward.

**Neither the providers nor the budget were involved.** All 36 calls returned
`provider_outcome: "completed"` — 36 calls for 36 cases, so nothing fell back
and the fallback headroom recorded below was never in play. The preflight had
been clean: `answering_enabled: True`, the evidence identity built and
validated, and all three ceilings reading 150 against a need of 150.

The capture died writing a file. That is the seventh blocker, below, and it is
fixed and merged as `omarjosephf/cited#18` (`360e8fa`).

**The budget decision it needed was taken on 17 September** and is recorded as
an [ADR-0015
amendment](../adr/0015-durable-budget-and-provider-order.md#qualification-allowance-raised-to-225-attempts-17-september-2026):
the qualification allowance rises to **10,440,000 micro-USD carrying 1,440,000,
leaving 225 attempts**. The carry-forward is exactly the 36 attempts already
spent (36 x 40,000), so the replacement regains nothing. The service envelope
deliberately does not move — `Settings` bounds `daily_answer_limit` at `le=150`
and both money limits at `le=6_000_000`, so a ledger stamped higher could not be
used at all.

**The amendment is approved and the ledger now exists.** The owner created it on
17 September 2026 at `allowance-225.sqlite3`, using the runbook's
[qualification allowance
ledger](../runbooks/durable-budget.md#qualification-allowance-ledger) command.
It echoed `leaving 225 attempts`, and the file was then read back read-only
rather than trusted: ceiling `10440000`, carried `1440000`, **zero** reservation
rows, `integrity_check` `ok`, stamped identity equal to the one passed on the
command line, and `(ceiling - carried) // 40000 - 0` = **225 attempts**.

The retired `allowance.sqlite3` is untouched beside it — same size and
timestamp, still ceiling `6000000`, carried `0`, 36 reservations, 114 attempts.
It is kept rather than deleted under item 5, and nothing should ever be drawn
from it again. **Both files now sit in the same directory and only the filename
distinguishes them**, which is why the replacement is named for its envelope.

**The replacement cannot be created at the retired ledger's path, and no
document said so until 17 September.** `QualificationAllowance.initialize` opens
its target with `path.open("xb")`, so aimed at the existing `allowance.sqlite3`
it raises `FileExistsError` and creates nothing. The replacement is therefore a
second file beside the first — created as `allowance-225.sqlite3`, named for the
envelope stamped inside it — and the retired ledger stays on disk under item 5.
Every later run must be pointed at the new file by hand: `-AllowanceLedger` is a
mandatory argument that nothing cross-checks, and a run aimed at the retired
ledger would find 114 attempts and refuse on headroom, which reads exactly like
a budget fault. `Invoke-PaidEvaluation.ps1`'s `.EXAMPLE` block named the retired
ledger until 17 September, when it was corrected to name the replacement and to
carry a note saying why; the script parses clean and nothing else in it changed.
That file lives in the workspace root, is not under version control, and is not
covered by any check here — so treat this sentence as a record of what was done,
not as a guarantee of what the file says today.

**The 225 arithmetic was rehearsed on 17 September, not merely computed.** The
approved flags were run against a throwaway path outside both repositories,
echoed `ceiling 10440000 micro-USD (US$10.44), carried 1440000 micro-USD
(US$1.44), leaving 225 attempts`, and read back `remaining: 225`; the throwaway
file was then deleted. The command prints and creates in one breath, so this
retires the arithmetic risk before the one-shot run rather than after it. It
does not retire the path or identity risk, which are per-run and still the
operator's.

**Creating it does not make the capture runnable in September.** The service
ledger counts `WHERE month = ?` (`persistent_budget.py:226`), so its 36 rows
from 15 September stay inside the September window and it also reads 114 until
the month turns. The portfolio gate needs 150 free on all three ceilings
independently, so **the earliest possible capture is 1 October 2026 UTC**, and
it must be the first paid work of that month. **Do not re-run the capture before
then** — it refuses, and refusing costs nothing but proves nothing.

**Step 4 is done.** On 14 September both permanent ledgers were created and then
verified by reading them back: the service ledger stamped
`150/150/6000000/6000000`, the allowance with ceiling `6000000` and carried `0`,
which the command echoed as 150 attempts. Both were stamped correctly, and both
were **entirely unspent as at 14 September** — zero rows in each `reservations`
table. **That is no longer their state.** The 15 September capture put 36 rows
in each and both now read 114. The stamping was right and the service ledger
needs no redoing; the allowance ledger must nonetheless be replaced under the
17 September amendment, because its ceiling is the superseded one.

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
ceilings with exactly zero slack. Nothing was reserved to obtain it.

**That readback is superseded, and by the capture itself.** It was taken earlier
on 15 September, before step 5 ran. Step 5 ran later the same day and spent 36,
so the state is now 36 reservations and 114 attempts in each ledger — read
read-only on 17 September and recorded at the top of this section. Read both
15 September paragraphs above as the record of a moment that has passed, not as
the ledgers' state. This file has been wrong four times at exactly the point
where a closed code defect and an unperformed operator action get conflated,
which is why the readback is marked rather than deleted.

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
both ledgers: it reserves nothing, and prints `service remaining`,
`allowance left` and the effective ceiling before anything can be spent. Run it,
read those three numbers, and only then consider `-Paid`.

**It is not read-only, and this file and the script both said it was until
17 September.** Both classes open their database `mode=rw` and take a
`BEGIN IMMEDIATE` write lock even when not reserving (`capture.py:79-82`,
`persistent_budget.py:172-203`), and `QualificationAllowance.__init__` calls
`self.remaining`, so merely constructing it locks the file. The allowance is
locked but not written — its only write is the `INSERT` under `if reserve:`.
**The service ledger is written on every read:**
`UPDATE identity SET last_seen` sits outside that guard
(`persistent_budget.py:255`) and commits each time. Its stored value read
`2026-09-15T02:32:28Z` on 17 September — the capture, not a later touch.

None of that consumes an attempt or moves money, so "reserves nothing" holds and
the preflight stays free. But `last_seen` is a monotonic clock guard: `_totals`
refuses with `budget_clock_regressed` if the clock is ever behind it, so each
preflight advances a watermark the ledger will afterwards insist on. Worth
knowing before running one on a machine whose clock is about to be corrected
backwards.

The key prompt sits *above* the preflight block and is **not** gated on `-Paid`,
so the free half is owner-operated for the same reason the paid half is. A
handoff that asks an agent to "run the free preflight and read the three
ceilings" is asking for something that cannot be done. What an agent can do
without keys is everything else: restage from the pin, run the pin gate, diff
the staged corpus and system prompt against the pinned revision, and read both
ledgers read-only as recorded above.

**Do not widen that into "the preflight's own checks are out of reach."** Of the
two, only `answering_enabled` is. `_answer_configuration` is built on the free
path: `cli.py:213` opens `if not args.paid:` and `cli.py:241` builds the record
inside it, needing no credential. It was run keylessly on 16 September with both
suites passing, and traced field by field on 17 September. The record it
produces is identical to the capture's — `_answer_configuration` (`cli.py:423`)
reads nine values off `Settings`, `top_k` from the caller and `WIRE_VERSION`
from the transport module, plus a block of literals, and **not one of them is a
budget field or a credential**. Nothing the capture's environment exports can
move it. The equivalence holds as long as the free run passes `--top-k 4`, the
only caller-supplied field.

**Exactly one check still needs the owner: `answering_enabled`** — the
seven-variable credential gate at `settings.py:290-308`, read at `cli.py:291` on
the paid path and in the script's preflight. Everything else the preflight
reports is now either reachable without keys or has been read directly out of
the ledger files.

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

- **FIXED by `cited#18`, merged as `360e8fa` with CI green — a refused
  `os.replace` ended the capture and spent the allowance.** This stopped the
  15 September run, and unlike the six above it was not found before the money
  went. `save_capture`
  (`capture.py:146-160`) writes `<output>.pending`, fsyncs it, then calls
  `os.replace`. At the top of iteration 36 the temp write succeeded and the
  replace did not. The proof is the pair of files left in `eval/results/`,
  identical but for one key: `active_case` is `35` in the output and `36` in the
  `.pending`, which only a written-but-not-replaced temp file produces.
  `cmd_eval`'s bare `except Exception` (`cli.py:333`) then discarded which
  exception it was, so neither the console nor the file named the cause; the
  failure was reconstructed from those two files afterwards.

  On Windows a file-sync client, search indexer or malware scanner holding the
  target for a moment is enough to refuse a replace, and this repository sits
  under `OneDrive\Documents` — a location *Environment facts* below already
  records as having broken every absolute path once and the backend virtualenv
  since. That history makes OneDrive the leading candidate. Be precise about
  what is established, though: the failed `os.replace` is proven by the two
  files, and its cause is inference. The fix does not depend on which of them
  held the handle.

  `cited#18` retries the replace over roughly thirteen seconds before believing
  it, and stops requiring exclusive creation of `.pending` so that one
  interrupted replacement cannot make every later save fail with
  `FileExistsError`. Verified against a real `CreateFileW` handle with
  share mode 0 held on the target — what a sync client actually does — which
  reproduces `PermissionError [WinError 5]` on the old code and clears in 1.50s
  on the new.

  **The blindness is not fixed.** The bare `except Exception` is deliberate:
  provider exceptions and secrets must never reach the console, so narrowing it
  is a security decision rather than a bug fix and it was left alone. It is why
  this cost a forensic session instead of a line of output.

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
re-read `docs/runbooks/durable-budget.md` and the two ledgers now in play —
`allowance-225.sqlite3` and the service ledger — before typing anything.
**Step 5 ran on 15 September and failed at question 37 of 75**, so step 1 below
had to be done again for the allowance ledger alone, under the 17 September
amendment; **that was completed on 17 September** and step 1 is now closed for
both ledgers. What remains is step 3, and it is blocked on the calendar rather
than on any action. The current state is at the top of this file; this section
is the procedure, not the status.

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
  had stayed correct. On 15 September the same directory cost a paid capture:
  a refused `os.replace` on a file under it ended the run and spent 36 of a
  non-renewable 150-attempt allowance. `cited#18` makes that survivable, but
  the standing advice is unchanged and now has a price attached — **run
  captures against a path outside the synced tree.**
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
  [ADR-0022](../adr/0022-supabase-pro-for-managed-recovery.md) accepts buying Pro
  for managed recovery, but **the subscription has not been purchased** and its
  trigger is the restore rehearsal, not a date. As with ADR-0020, **no repo field
  carries the plan**: check the `Project Zero` organisation before assuming Pro
  is in force. That ADR's Verification block is the record, and it is empty.
  **The trigger is itself blocked, and not by money.** The rehearsal has to
  restore into an isolated destination, which ADR-0016, the encrypted backup
  qualification and the restore runbook all forbid being the staging project.
  [ADR-0023](../adr/0023-isolated-destination-for-managed-restore.md) is
  **accepted (18 September 2026)** and settles that destination: a locked-down
  disposable clone, deleted in the same working session it is created. It also
  records that a physical Supabase clone is a different operation from this
  project's logical recovery contract — it carries roles, grants and `auth.*`,
  which that contract excludes, plus both live `pg_cron` jobs, one of which
  prunes the deletion-tombstone ledger the contract's merge depends on.
  **Accepted settles the decision and authorises nothing.** No clone exists, no
  Pro subscription has been bought, and ADR-0023's own Verification block is
  empty. Managed recovery is no longer blocked on a decision; it is simply not
  done.
- **Cloudflare connector reaches a different account** than the one holding
  `ev-private-backups`. It cannot verify the backup bucket.
- **The handbook is CRLF in the working tree and LF in git.** `.gitattributes`
  sets `*.md text eol=lf`, so the committed blob is LF while the file on disk
  here is CRLF. Hashing the raw bytes produces a value that passes in CI and
  fails locally on the identical, untampered file — ADR-0000 records that exact
  defect happening once already. `docs:check-handbook-checksum` normalises
  before hashing, verified byte-exact against git's clean filter; anything else
  that hashes a tracked file must do the same.
- **React is held at 19.2 by `@react-three/fiber`, not by preference.** r3f
  declares `react: ">=19 <19.3"`, so any bump to 19.3 fails `npm ci` at
  resolution in about ten seconds, before a single test runs. It did exactly
  that on all three head SHAs the `minor-and-patch` group PR #82 ever had.
  9.7.0 is the newest published r3f and still caps below 19.3, so nothing
  upstream closes this yet. **What this file said until 17 September — that r3f
  renders the hero particle wave (ADR-0002, ADR-0008, ADR-0009), so a forced
  resolution would put the landing page's headline effect on an arrangement
  upstream calls unsupported — is wrong.** r3f renders nothing the site serves.
  [ADR-0010](../adr/0010-warm-portfolio-and-finite-motion.md) unmounted the
  particle wave and the Digital Core on 7 September and supersedes the mounting
  decisions in ADR-0002, ADR-0003 and ADR-0009; ADR-0008 had been withdrawn since
  31 August, so one of the three citations was already dead when it was written.
  Checked both ways on 17 September: at `486b4f0` `ParticleWaveLazy`,
  `DigitalCoreLazy` and `MobileWaveGLLazy` are imported by nothing and
  `.site-wave` has no CSS rule; production serves no `<canvas>` on `/` or
  `/about` at 1024, 512 or 375 px, over 199 KiB of JavaScript in 11 chunks where
  the three.js bundle alone is ~234 KiB. **The hold itself is unchanged and still
  correct** — r3f is still a declared dependency, so `npm ci` still fails at
  resolution in about ten seconds. It protects an unused dependency, not the
  landing page. #90
  holds `react`, `react-dom` and both type packages at minor **and** major in
  `.github/dependabot.yml`; patch updates inside 19.2.x still flow, so security
  fixes are not blocked. The hold lifts when r3f widens its peer range, and
  that condition is recorded in the config beside the TypeScript 7 and
  ESLint 10 deferrals. **The time this saves is diagnostic:** a group PR
  carrying react will fail at install, and reading that as a fault in this
  repository is the wrong conclusion.
- **The hold was exercised the same day and it worked.** #82 closed itself
  four seconds after #90 merged, because the new ignore rules invalidated it,
  and its branch went with it — so the `@dependabot recreate` issued a minute
  later was answered with *"looks like this PR is closed"* and acted on
  nothing. **Merging the config is what rebuilt the group, and it was
  immediate.** Two `Dependabot Updates` workflow runs were created at
  15:19:52 UTC, six seconds after #90 merged and 31 seconds *before* the
  recreate comment existed; the second ran until 15:21:55 and opened **#91**
  at 15:21:46. So the comment cannot have caused it. **The practical rule: a
  merged `dependabot.yml` change triggers an update run at once — there is no
  need to wait for the weekly schedule, and no need for `recreate`.** #91 came
  back as 8 updates with react, react-dom and both type packages absent, the
  `next` 16.3.5 patch among them, and passed the full gate in 5m42s where #82
  had failed at install on all three of its head SHAs. Merged as `b69eff1`.

## The bug class this project keeps hitting

A list — or a pinned value — written in more than one place with nothing keeping
the copies honest. It has appeared seven times: the handbook gate versus
`package.json`; the reviewed migration versions across three files; `test:ci`
versus `ci.yml`; Appendix A's duplicate of the gate list; the handbook's ratified
SHA-256 in ADR-0000 versus the handbook itself; **whether the staging migrations
are applied — written in three documents that gave two different answers**; and
**handbook §38's required-documentation list versus the files that exist**, both
found on 17 September. Three mechanical checks now guard the first five —
`docs:check-handbook-gate`, `docs:check-migration-manifest` and
`docs:check-handbook-checksum` — and each caught a real instance within hours of
being written. When adding a list or a pinned value that must match another, add
the check with it.

**The sixth is a different shape from the other five, and no check would have
caught it.** The duplicated value was not in two files in this repository; it was
in this repository and in a live managed database. `docs:check-migration-manifest`
passed throughout, correctly — it compares the filenames, the backup contract and
the reader setup, all three of which agreed on ten. What nothing compared was
that list against `supabase_migrations.schema_migrations` on the actual project,
because doing so needs network access and a credential that CI does not have.

So three documents drifted apart unnoticed: the tracker said 007 and 008 were
unapplied, the runbook said nothing in it had been run, and this file said all
ten were applied. **This file was the one that was right, and it was right
without ever having been checked** — which is luck, not a control. The
migrations had in fact been applied on 11 September, in version order, in one
session, following the runbook's own procedure; only its status header was never
flipped. A runbook that describes completed work as pending is the dangerous
direction of this bug: following it would have meant re-applying migrations to a
live database.

**The lesson is about which copies matter.** Five of these were repository-versus-
repository and are now mechanically guarded. This one was repository-versus-
reality, and the guard for that is not a script but a habit: when a document
asserts the state of something outside the repository — a live database, a
deployed service, a ledger file, a console setting — say when it was last read
and from where, or do not assert it.

**The seventh shows the first category is not finished.** Handbook §38 lists four
runbooks the repository "should maintain". Three did not exist at the paths it
gives: `docs/runbooks/deployment.md` and `security-incident.md` were genuinely
absent, while `contact-delivery.md` is a naming drift — `contact-email-delivery.md`
covers it, and only the name disagrees. `docs:check-anchors`
could not catch it, because it resolves *section* anchors like
`docs/ENGINEERING_HANDBOOK.md §19.1` and §38's entries are backticked paths, not
links. Nothing else looked. **All three were resolved on 17 September.**
`deployment.md` and `security-incident.md` were written, so the §34 step 7 smoke
checks and the §28/§37 incident procedures finally have a procedure behind them;
`contact-delivery.md` was the handbook naming a file that exists as
`contact-email-delivery.md`, and §38 was corrected rather than the file renamed —
six other documents already used the real name, so the handbook was the single
copy that had drifted. This is repository-versus-repository, so by this file's
own rule it deserves a check rather than a resolution to remember. **That check
now exists, and is enforced.**
`npm run docs:check-required-docs` reads §38's list out of the handbook, takes
every backticked path from it and asserts each one resolves on disk. It reads the
list rather than restating it, so the script is not itself a second copy to
forget, and it fails loudly if §38 or its introducing sentence moves, rather than
matching nothing and passing. The comparison runs one way only: §38 is a minimum,
so the thirteen runbooks that exist without being named there are not failures.

It tells the two kinds of failure apart by looking for similarly named files
beside the missing one: a naming drift, where the document exists under another
name, reads differently from a genuine absence, where nobody wrote it. That
distinction decided how each was fixed — the two absences were written, the drift
was corrected in the handbook. It reported 2 of 9 unresolved when it was written
and **passes today**.

**It is now stage 7 of the required gate**, which is what makes it a control
rather than a script. Adding it cost a handbook edit to §30 and therefore a
second re-ratification of the checksum, in the same commit as the §38 correction;
`1d97c916` is the value that covers both. None of it was allowed to go in while
the check was red, because §31 forbids weakening a check to clear a gate, and a
required stage that is knowingly failing teaches everyone to ignore it.

**What is still unguarded is the other direction.** The check asserts that every
path §38 names exists; nothing asserts that a runbook which exists is any good,
or that `security-incident.md` describes a procedure anyone could follow under
pressure. It has never been exercised. Treat a green stage 7 as proof that the
files are there, and nothing more.

**The fifth one failed in two directions at once.** ADR-0000's recorded checksum
went stale for six days across four commits to the handbook — three of them
*compelled* by §30, which `docs:check-handbook-gate` requires to match
`package.json` and `ci.yml`, so adding a gate stage forces a handbook edit. A
checksum pinned to a ratification event cannot survive that. Separately, a second
copy of the value inside ADR-0000 still labelled the **v1.1.0** hash as
"Current — the version to verify against", unrevised through two later
ratifications: one document, two answers, three versions apart. Both are
corrected, and every recorded value is now verified against the commit it
belongs to.

**It has an operational consequence.** `docs:check-handbook-checksum` is stage 4
of the gate, so **any commit touching `docs/ENGINEERING_HANDBOOK.md` now fails
CI unless it updates the checksum in ADR-0000 in the same commit.** That is the
intent, not a defect. The owner re-ratified the bytes twice on 17 September: once
for `060e0387` (landed as `f542749`, **merged to `main` as PR #84**, so the check
guards every branch rather than only the one it was written on), and again for
`1d97c916` after §38's naming drift was corrected and §30 gained
`docs:check-required-docs`. The gate is 17 stages.

**The second re-ratification is the mechanism, not a stumble.** Correcting §38
and adding a gate stage both edit the handbook, so both force the checksum
forward in the commit that makes them. ADR-0000 predicted exactly this when the
check was built, and it has now happened twice.

**This paragraph said "it is not on `main`" until the merge, and stayed that way
for the rest of the day.** A line that describes where a commit currently sits
goes stale the moment it moves, which is the same repo-versus-reality shape as
the migration drift above — the fact lived in GitHub, not in the repository, so
nothing here could notice. Prefer recording what a change *does* over where it
has got to; where it has got to is answerable with `git log` and does not need
writing down.
