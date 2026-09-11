# Release packet — refined corpus, backend candidate and E.V runtime

**Status: not approved, not published.** This packet exists so the owner can
make one informed decision. It records the exact candidate, its configuration,
its spending limits, its rollback path and the actions only the owner can take.
Prepared 11 September 2026. Risk of the work described: R3 at the point of
publication; everything assembled so far is R1.

Nothing in this packet has been committed, pushed, merged, tagged or deployed.
No provider call was made, no paid service enabled, no account, secret, DNS or
hosting setting changed.

## 1. Exact source

### Frontend — `omarjosephf/ojflorendo-portfolio`

| | |
| --- | --- |
| Worktree | `C:\Users\omarf\.codex\worktrees\a2d0\ojflorendo-portfolio-public` |
| Branch | `fix/evaluation-set-critical-flag` |
| HEAD | `b790485a9e82cc1803e923dd209a423097d765b8` |
| Remote `main` | `df3422f16271bf3e04cbcd84de3007fcba49e382` |
| HEAD vs remote `main` | identical trees; `git diff` between them is empty |

The candidate is HEAD **plus an uncommitted working tree**. Nineteen paths:

```text
 M content/assistant-eval/questions.toml
 M content/assistant/about-oj.md
 M content/assistant/project-cited.md
 M content/assistant/services.md
 M docs/adr/0014-luna-gemini-fallback.md
 M docs/adr/0019-service-first-portfolio-and-about-route.md
 M docs/releases/2026-09-10-service-first-portfolio.md
 M docs/reviews/ev-release-candidate-verification.md
 M docs/roadmaps/ev-management-progress.md
 M docs/runbooks/assistant-corpus.md
 M e2e/interaction-feedback.spec.ts
 M public/images/projects/personal-portfolio-website.webp
 M src/app/globals.css
 M src/components/ui/InteractionFeedback.tsx
 D src/components/ui/PortraitMark.tsx
 M src/data/assistant-corpus.generated.ts
 M src/data/management-corpus.generated.json
?? docs/releases/2026-09-11-release-packet.md
?? src/data/assistant-eval.test.ts
```

Grouped by what they are:

- **Corpus and evaluation set** — the four `content/` files and the two
  regenerated `src/data/*.generated.*` records. This is the reviewed wording
  correction the owner approved. It changes what E.V tells visitors.
- **New test** — `src/data/assistant-eval.test.ts`, ten checks on
  question/corpus integrity.
- **Dead-code removal** — `PortraitMark.tsx` deleted, the `.portrait-trigger`
  branch removed from `InteractionFeedback.tsx`, 31 unreferenced CSS rules
  removed, and the matching observer branch in the e2e spec.
- **Recaptured screenshot** — `personal-portfolio-website.webp`, 1104x320,
  taken from a production build of the released design.
- **Documentation** — ADR-0014's superseded provider order, ADR-0019's stale
  "Proposed" status and stale checksum, the corpus runbook's suite flag and
  exit-code contract, the verification/roadmap/release evidence, and this
  packet.

### Backend — `omarjosephf/cited`

| | |
| --- | --- |
| Assembled working copy | `C:\Users\omarf\Downloads\OJ Portfolio Workspace\cited-release-candidate` |
| Base commit | `4d7d9bce21c8eb62bc5c99f976f68867fbdcec06` |
| Current remote `main` | `4d7d9bce21c8eb62bc5c99f976f68867fbdcec06` — the same commit |
| Local branch | `candidate/ev-durable-budget-provider-integration` |
| Uncommitted | 29 modified tracked files, 49 untracked paths (78 status entries) |

The candidate is **not** behind `main`, contrary to the emergency handoff's
warning. The older registered checkout `oj-doc-assistant` at
`874f9bd5cdbb5a7df6c8caae9bef6b27063720c9` is an *ancestor* of the candidate's
base and holds nothing the candidate lacks.

Provenance: the sandbox integration clone was preserved as 117 files
(1,275,285 bytes) with per-file SHA-256 in
`output\release-takeover-2026-09-10\backend-checkpoint.json`. All 117 were
re-verified against both the preserved copy and the live clone, then overlaid
onto a fresh clone of `main`. The result reproduces the recorded 78-entry dirty
status exactly.

## 2. Configuration

### Corpus

| | |
| --- | --- |
| Source checksum | `9eacd1593d6ab0d61469c1bf33dae903e0a5f2b74c835f7b0082a22c8167fd0b` |
| Currently deployed | `10ccbbc912bc9ad0ddc5a46c850d71a007705be9719ae246cd4448ef8db0af95` |
| Documents | 10, 122.2 KiB |
| Management snapshot | 69 chunks over 10 sources, maximum 327 tokens |

Source and production **disagree by design** right now: the refined corpus is
uncommitted. The service recomputes the digest at startup and refuses to run on
a mismatch, so the site and the corpus must be released together or E.V will
either refuse to start or answer from superseded content.

### Runtime and provider

Per ADR-0015: Gemini 3.5 Flash-Lite primary, GPT-5.6 Luna availability fallback.
Two serial attempts, zero retries, the 3/6/8/9/10-second nested bounds,
32,000-byte requests, 1,024 output tokens, text only, no tools. Billing, quota,
authentication, malformed output and local budget failures never trigger
fallback. ADR-0014's original Luna-primary order is superseded and its title now
says so.

### Storage

One pinned Fly Machine, a real `/data` mount, one process-shared SQLite
admission lock. Read-only inspection on 9 September found **one started London
E.V Machine and zero volumes** — the volume does not exist yet.

## 3. Cost caps

These are **application reservation caps enforced before any network request**,
not invoice guarantees.

| Limit | Value |
| --- | --- |
| Reservation per dispatch | 40,000 micro-USD (US$0.04), never refunded |
| Attempts | 40 per UTC day, 200 per UTC month |
| Money | US$0.40 per UTC day, US$2.00 per UTC month |
| Effective ceiling at full reservations | 10 attempts/day, 50/month |
| One answer that uses the backup | consumes two attempts |

Whichever limit is reached first wins. Incremental storage at published prices
checked 9 September 2026: US$0.15/GB-month for the volume, billed while
unattached or stopped; snapshots US$0.08/GB-month after the organization's
shared first 10 GB.

Before activation, the conservative per-attempt price bound must be verified
against the actual provider configuration **including thinking tokens**. Until
that is done, US$0.04 is not a proven worst-case invoice cost. Raising any
maximum needs an explicit reviewed budget decision.

## 4. Rollback

**Portfolio.** Known-good target `842c72752736d4bafeb21b687eed285325d609de`,
deployed 31 August 2026. Roll back by promoting that deployment in Vercel after
approval, or by reverting through a new reviewed pull request. Never force-push.
No environment-variable or provider contract changes, so existing secrets stay
compatible. Leave DNS and secrets alone.

**Corpus.** Re-export the previously recorded checksum by the corpus runbook and
confirm `/health` reports the matching prefix.

**E.V runtime.** Disable answering, then restore a compatible complete
source/image/configuration tuple. **Retain the ledger** as evidence — never
delete, truncate, recreate, clone or restore an older ledger to regain an
allowance. An older image with in-memory counters does not inherit the durable
safeguards and must not be silently reactivated.

## 5. Verification behind this packet

Complete `npm run test:ci`, exit status 0: both dependency audits clean, doc
anchors, lint, both type checks, corpus consistency, 120 database checks, 82
restore checks, 614 unit tests, production build, 89 production-browser checks,
42 management-browser checks.

A confirmatory run of the same gate on the same code exited 1, with two
management accessibility checks timing out at their closing full-page
screenshot while the machine was under concurrent load. Re-running that suite
alone on an idle machine passed 42/42. Those two checks have only four to seven
seconds of headroom against the default 30-second timeout even when idle, so
they will fail intermittently in CI. No timeout was raised. See the
[candidate verification](../reviews/ev-release-candidate-verification.md) for
the full account; it is listed as item 4 in section 6 below.

Backend candidate: 793 tests with seven historical skips, `ruff check`,
`ruff format --check` over 90 files, strict `mypy` over 62 files, `pip check`,
clean `pip-audit`. The eight corpus-privacy tests ran against the **refined**
corpus and passed.

Retrieval, scored by the candidate with `--suite portfolio`: 98% hit rate, 74%
top-1, critical core 16/16, separation −0.168, exit 0. One disclosed miss:
"Does OJ do any AI work for clients?".

Detail in the [candidate verification](../reviews/ev-release-candidate-verification.md).

## 6. Blocking items that are not owner-only

These must be closed by an implementer before the owner is asked to approve
publication.

1. **`eval/portfolio-source.json` pins the pre-refinement corpus revision**
   (`97f76b2b50396c305597825639ba0ad28a2bcfb0`). The backend build runbook is
   explicit that a pass against an older corpus does not qualify a new one. This
   cannot be fixed until the frontend corpus commit exists, which makes it
   ordered behind item 1 in section 7.
2. **The Linux container has not been built.** Docker is unavailable on this
   machine. The CI container check and the actual built image digest are still
   required; a Windows source pass is not a substitute.
3. **Python 3.12.13 was not exercised.** Only 3.13.3 is installed. The locks
   installed and passed on 3.13, which is evidence the candidate is sound, not
   evidence the pinned target was used.
4. **`e2e-management/workspace.spec.ts:80` is timing-marginal.** Six axe scans
   and a full-page screenshot inside the default 30-second timeout with
   `retries: 0`, leaving four to seven seconds of headroom on an idle machine.
   It already failed once here under load. Fixing it is an R2 test-gate change —
   an explicit per-test timeout, or splitting the screenshot into its own test —
   and needs a plan approved before it is made, not a quietly raised tolerance.

## 7. Owner-only actions, in order

1. **Approve committing the frontend candidate** and the branch/PR strategy.
   Nothing above can be released while the corpus is uncommitted.
2. **Approve committing the backend candidate** onto `main` in the assembled
   working copy, then updating `eval/portfolio-source.json` to the new frontend
   SHA and re-running the portfolio suite against it.
3. **Owner visual and content review** of the landing page, `/about`, both case
   studies and E.V, in light and dark, on a real device.
4. **Decide on the remaining retrieval miss.** It is above the documented 0.75
   floor and outside the critical core, so it is disclosable rather than
   blocking — but it is a product judgement, not an engineering one. Do not
   close it by changing the expected target or deleting the question.
5. **Approve and provision the Fly volume**, with the reviewed ledger
   carry-forward and the mounted-restart check, per the durable-budget runbook.
   This is a paid resource and a spending decision.
6. **Verify the per-attempt price bound** against the live provider
   configuration, thinking tokens included, before enabling either provider.
7. **Approve funded answer captures** and arrange independent human labels. The
   seven skipped policy tests and the answer-quality gate depend on these.
8. **Managed qualification**: staging migrations 007/008, actual event
   integration, CAPTCHA enforcement, owner recovery, off-site backup activation
   with key custody, and an isolated managed restore.
9. **Final publication approval**, then production smoke checks against the
   exact deployed identity.

## 8. What is explicitly not proposed

Exposing `/manage` publicly, enabling any paid service, altering DNS, changing
account security settings, sending any message on the owner's behalf, or
resolving the production `/manage` 404 by making the private dashboard reachable.

## Related

- [Candidate verification](../reviews/ev-release-candidate-verification.md)
- [Delivery checklist](../roadmaps/ev-management-progress.md)
- [Corpus runbook](../runbooks/assistant-corpus.md)
- [Durable budget and cutover](../runbooks/durable-budget.md)
- [Rollback](../runbooks/rollback.md)
- [ADR-0015](../adr/0015-durable-budget-and-provider-order.md),
  [ADR-0019](../adr/0019-service-first-portfolio-and-about-route.md)
