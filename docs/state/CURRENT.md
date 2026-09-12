# Current state

Updated 12 September 2026. This file is what a fresh session should read first.
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

**E.V assistant** — **deployed 12 September.** The Gemini/Luna runtime is live on
Fly, serving the refined corpus `9eacd1593d6a` over wire v3, on a pinned machine
with the durable ledger mounted at `/data`. The transport mismatch that broke
every answer since 10 September is fixed: the backend's own OpenAPI now declares
`version: const 3` with `AnsweredResponse [version, state, answer, citations,
model_route]`, exactly the key set `service.ts` requires. It cannot answer until
00:00 UTC on 13 September — see the budget note below.

**Source and production disagree on the corpus, and nothing at runtime says so.**
`main` carries `7bddb04dedc7`, the 12 September retrieval fix, merged as
`f53ddda` in PR #64. Production still serves `9eacd1593d6a`, confirmed from
`GET /health` at 19:33 UTC on 12 September. The fix is merged and not live.

Nothing detects that gap while it lasts. `service.ts` sends only the question
and the recent history; no digest crosses the wire. The checksum guard is the
backend verifying *its own* bundled corpus at startup and **refusing to start on
a mismatch** — it catches a bad copy on the serving side and cannot see that the
authoring side has moved.

`cited/deploy/oj-assistant/` is a build artifact, not a commit: `deploy/*` is
gitignored there. CI rebuilds it from the commit pinned in
`cited/eval/portfolio-source.json`, and a machine deploy ships whatever
`scripts/export-assistant-corpus.mjs` last wrote into it. The pin governs what
CI scores; the local export governs what `fly deploy` uploads. The pin is now
`f53ddda` — it was `b6fecb7c`, which is why the retrieval gate had been passing
over a corpus nobody ships. Closing the gap is one owner-approved backend
deploy, then confirming `/health` reports `7bddb04dedc7`. Until then every
answer E.V gives comes from the pre-fix corpus, including the first real
visitor traffic when the ledger unfreezes at 00:00 UTC on 13 September.

**RAG management panel** — `/manage` returns 404 in production **by design**,
asserted by `e2e/management-disabled.spec.ts`. Staging now has all ten
migrations applied. The encrypted backup path is no longer blocked by migrations
but is not activated.

## Owner-gated actions: 5 of 9 complete

| # | Action | State |
| --- | --- | --- |
| 1 | Commit the frontend candidate | Done — merged `b6fecb7` |
| 2 | Commit the backend candidate, repin eval, re-run | Done — merged `b94e886` in `omarjosephf/cited` |
| 3 | Owner visual and content review on a real device | Open |
| 4 | Decide the remaining retrieval miss | Done — fixed 12 Sep, 50/50 in source; not yet deployed |
| 5 | Approve and provision the Fly volume | Done — `vol_r1j28g1m15o9j3pr`, ledger initialised 12 Sep |
| 6 | Verify the per-attempt price bound | Done — measured 12 Sep, $0.0024 against $0.04 |
| 7 | Approve funded answer captures | Open — spending |
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
  carries the tier** — confirm it in the Google console and record the date
  in that ADR.
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
