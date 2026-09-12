# Current state

Updated 11 September 2026. This file is what a fresh session should read first.
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

**E.V assistant** — live but answering from corpus `10ccbbc9` while `main`
carries the refined `9eacd159`. The deployed service is **Anthropic-based**; the
Gemini/Luna work is the candidate and has never run anywhere. No Fly volume
exists, the durable budget has never been cut over, neither provider is
activated.

**RAG management panel** — `/manage` returns 404 in production **by design**,
asserted by `e2e/management-disabled.spec.ts`. Staging now has all ten
migrations applied. The encrypted backup path is no longer blocked by migrations
but is not activated.

## Owner-gated actions: 2 of 9 complete

| # | Action | State |
| --- | --- | --- |
| 1 | Commit the frontend candidate | Done — merged `b6fecb7` |
| 2 | Commit the backend candidate, repin eval, re-run | Done — merged `b94e886` in `omarjosephf/cited` |
| 3 | Owner visual and content review on a real device | Open |
| 4 | Decide the remaining retrieval miss | Open — above floor, outside critical core |
| 5 | Approve and provision the Fly volume | Open — spending |
| 6 | Verify the per-attempt price bound | Open — see below |
| 7 | Approve funded answer captures | Open — spending |
| 8 | Managed qualification | Partly — migrations applied; CAPTCHA, recovery, restore outstanding |
| 9 | Final publication approval and smoke checks | Open |

## Open decisions, both waiting on the owner

**Release-manifest schema version.** Fixing the Gemini thinking configuration
and the output-token cap means changing `answer_effort` and `answer_max_tokens`,
which are `const`-pinned in `docs/schemas/release-manifest-v2.schema.json`,
typed `Literal` in `src/assistant/release_manifest.py`, validator-pinned
`ge=1024, le=1024` in settings, and asserted in three test files and
`fly.oj-assistant.toml`. This is a versioned contract change, not a constant
edit. Recommendation: introduce **v3** rather than amend v2, so previously
recorded manifests stay valid. Do not start this work without an answer.

**Live E.V is broken for every question; cause identified 11 September.** Not a
key, corpus or machine fault — the deployed backend is healthy. `/health`
returns `ok`, 69 chunks, corpus `10ccbbc912bc` and `answers_remaining_today: 40`,
so the allowance is untouched and nothing has been answered. The fault is the
transport pair. The backend's own `/openapi.json` declares
`AskResponse {answer, citations, grounded, refused}` — the unversioned envelope —
while the deployed frontend bundle contains `modelRoute` and "Backup model used",
so what Vercel serves is `main`'s wire-v3 proxy. `src/lib/assistant/service.ts`
rejects any payload whose `version` is not `3`, so every reply fails closed as
`unavailable`. ADR-0013 predicted exactly this for shipping the candidate proxy
without its paired Cited release. The fix is a pairing decision — roll the
frontend back, or release both together — not a rotation. Anthropic keys still
expire 29–30 September; the 22 September Routine covers that separately.

## What is known about the price bound

Verified from the code, not from documentation:

- `GeminiAdapter` sends **no thinking parameter at all**; `OpenAIAdapter` sends
  `reasoning: {effort: "none"}`. The fallback is protected, the primary is not.
- `maxOutputTokens` bounds thinking and visible output together, so the cost
  ceiling holds: ~$0.012 worst case against a $0.04 reservation.
- **Gemini 3 Flash-Lite cannot turn thinking off.** Gemini 3 uses `thinkingLevel`,
  not `thinkingBudget`; sending both returns 400. So the primary competes with
  thinking for the same 1,024 tokens, and a truncated response is malformed
  output — which by design does not fall back, so the reservation is spent and
  the visitor gets an error.
- The exact valid `thinkingLevel` value for `gemini-3.5-flash-lite` is
  **unverified**: `ai.google.dev` is blocked by the session egress proxy and no
  API key is available. Confirm before enabling either provider.
- The code already parses `thoughtsTokenCount` and reconciles it against
  `totalTokenCount`. One real attempt would settle this empirically for $0.04.

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
- **Playwright/Chromium mismatch.** The container's prebuilt Chromium does not
  match the pinned Playwright version, so browser suites fail on launch for an
  environment reason. Rely on CI for browser evidence; the hook reports the
  current mismatch at session start.
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
