# Admin panel: what the blog-agent section should do

- Status: **Research, R0. Decides nothing.** Input to
  [ADR-0025](../adr/0025-unified-owner-admin-panel.md) and the
  [package 19 plan](../roadmaps/admin-panel-package-19.md)
- Date: 2026-09-28
- Owner: OJ Florendo
- Package: 19, instructor-set (one online, owner-only admin panel holding the
  E.V RAG management panel and the blog multi-agent admin). Not a release gate
  for packages 13–16

## 1. The question

The instructor asked for one admin panel, deployed online, that only OJ can
sign in to, holding two things: the E.V RAG management panel that already
exists, and an admin for the blog multi-agent system, which does not. This note
answers what that second section should *do*. The course materials come first,
then official sources, then the facts of this repository.

An **admin panel** here means a private set of web pages where the owner sees
what a system is doing and makes the decisions it is not allowed to make alone.
It is not a place to write code or change prompts by hand.

## 2. What the course says

Read from the rendered course PDFs on 28 September 2026 (the PDFs are images;
they were rendered page by page and read).

**Week 6 Part 04, AI agents.**

- *Read tools and write tools.* A read tool only fetches information and is
  low-risk. A write tool changes something in the world. The golden rule is that
  any high-risk write tool sits behind human approval.
- *Levels of autonomy, L0 to L4.* The consultant's rule is to start at L1:
  "copilot first, agency later". The human watches and approves the agent's
  suggestions until trust is earned.
- *Four core guardrails for every agent project:* a human approval gate for
  sensitive actions; caps and budget (maximum loop turns, maximum token cost);
  full logging of every thought, tool call and result; and a sandbox, meaning
  the agent is proved on test data before it touches the real system.
- *Multi-agent warning.* Every extra agent multiplies cost and lets one agent's
  mistake spread to the rest.

**Week 6 Part 05, automation and workflows.** The three golden rules of safe
automation: keep customer-facing output in draft mode first and let a human
approve it; log every run; and raise a failure alarm, because "the worst
automation is one that dies silently". Human approval belongs wherever output
touches the brand's reputation or someone's money.

**Week 6 Part 10, cron jobs.** The professional pitfalls: UTC versus local
time, overlapping runs, missing logs and silent failures.

**Week 8 Part 01, the multi-agent content production studio.** This is the
closest course example to the blog system. Its anatomy has eight parts: an
input brief plus a persistent brand-voice document, an orchestrator, three
specialist agents, a brand guard, a **human approval station** and a **memory
and archive**. System design is answering five questions before building:
what are the parts; where does the data live; how do the parts talk; where does
the human stand; and what happens when it breaks (logging, error alerts and
cost caps). The course also warns that the quality of the whole studio is
capped by the quality of its input brief.

**Week 8 Part 02, building an agency.** One of its three ready prompts is an
internal "control room": a private Next.js and Supabase tool with row-level
security (RLS, the database rule that each row is visible only to the right
user). It also lists "below the iceberg" work as mandatory on every project:
isolation, backups, cost caps and logging.

**What this means for the blog section.** The course's human approval station
and memory and archive *are* the admin panel. The panel should expose the four
guardrails (approval, caps, logs, sandbox), raise alarms rather than fail
silently, and keep the system at L1: the agents propose, OJ decides.

## 3. What official sources add

- **Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).**
  Prefer a fixed workflow when the task is well defined. Give agents stopping
  conditions such as a maximum number of iterations. Pause for human feedback at
  checkpoints. Make the agent's planning steps visible, so the owner can see
  *why* as well as *what*. Test in a sandbox before production.
- **OWASP, [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).**
  The three root causes are too much functionality, too many permissions and too
  much autonomy. The mitigations: give each tool the minimum scope; require
  human approval for high-impact actions; enforce authorization in the
  downstream system rather than trusting the model; log and monitor; and
  rate-limit.
- **Next.js 16 authentication guide** (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
  A redirect in Proxy (the file Next.js 16 uses in place of middleware) is only
  an optimistic check. The real authorization check belongs "as close as
  possible to your data source", in a data access layer.
- **Supabase, [multi-factor authentication](https://supabase.com/docs/guides/auth/auth-mfa).**
  Owner-only data can require the second factor in the database itself, using a
  *restrictive* RLS policy on the `aal2` claim. A restrictive policy cannot be
  loosened by some other permissive policy.
- **Supabase, [compute usage](https://supabase.com/docs/guides/platform/manage-your-usage/compute).**
  Micro compute costs US$0.01344 an hour, about US$10 a month. A paid plan
  includes US$10 of compute credit, which covers *one* Micro project. The credit
  belongs to the organization, not to each project.

## 4. What the repository already decides

These records bind the design and are not re-decided here.

- **The blog pipeline is three AI roles and a deterministic orchestrator:**
  Planner–Researcher, Writer and an independent Reviewer–Verifier. Every run ends
  in a *review bundle*: the evidence ledger (sources, excerpts, claims), the
  drafts with their citations, the Reviewer's hard gates and scores, each model
  call with its cost, a budget snapshot, and an integrity digest (a SHA-256
  fingerprint of the whole bundle). Its status is only ever
  `owner-review-required`, `rejected` or `failed`, and `publication.permitted` is
  always `false`. See the
  [blog design](blog-multi-agent-system-design.md) and `src/lib/blog/pipeline/types.ts`
  in the blog worktree.
- **The owner decides the topic.** The eventual Idea Scout proposes three to
  five evidence-backed ideas, and only an owner-selected or owner-edited brief
  may enter drafting (owner decision, 21 September).
- **The owner reviews the lessons.** The eventual Critique role writes a lesson
  for each agent after every attempt. OJ reviews them before any prompt, rubric
  or workflow change, and Critique cannot change anything by itself (26
  September).
- **Publication stays behind the existing gate.** A content-only pull request
  may be opened only after owner approval, and merging it still needs the
  `approved-to-deploy` label. A model's verdict never substitutes for OJ's.
- **Published knowledge stays in Git.** ADR-0016 applies the same rule to E.V:
  saving a draft never publishes.
- **Handbook §48 Track G.** Any admin capability needs R2 approval, an
  authentication and authorisation design, session and CSRF controls (CSRF is a
  forged request from another site), audit logging, backup and recovery,
  monitoring, and its own ADR and runbook.

**Two repository facts constrain the deadline.**

1. **No blog code is on `main`.** Phase 18.1 (the public blog, commit `44313f8`)
   exists only in the local blog worktree. Phases 18.2 and 18.3 (the pipeline
   and the bake-off harness) are uncommitted there. The admin panel cannot
   import types or bundles that are not on `main`.
2. **No agent has ever run against a real provider.** Every existing bundle is
   a saved fixture with synthetic cost. The blog section can honestly show the
   pipeline's shape and fixture bundles, clearly labelled, but it cannot show a
   real run before phase 18.3 executes.

## 5. Recommendation: what the blog section does

Seven views, in order of value. Each one names the course principle it serves.
**Bold** marks the views that are feasible by 30 September.

| View | What OJ sees and does | Principle |
| --- | --- | --- |
| **Status** | Whether the pipeline is running, paused or not built; last run and its outcome; the budget used against the ceiling; any unacknowledged failure | Failure alarm; nothing fails silently |
| Ideas and briefs | Idea Scout's suggestions with their evidence; select, edit, save or reject; or write an original brief. Only a selected brief can start a run | Human chooses the input; the brief caps quality |
| **Runs** | Every run as a timeline: stage, role, model, reservation against actual cost, outcome, stop reason | Full logging; show the planning steps |
| **Review queue** | One run's bundle: the draft with each claim linked to its evidence, the hard gates passed or failed, the scores, any prompt-injection finding *quoted, not obeyed*. Decisions: approve for a content-only pull request, request one revision, or reject | Human approval station |
| Agent lessons | Critique's lesson per agent; accept or decline. Accepting records a decision; it does not rewrite a prompt | Memory and archive, with the human in charge |
| **Configuration (read-only)** | Roles, providers, prompt and rubric digests, cost ceiling, source allowlist, schedule (off) | Config is code, changed by pull request |
| Controls | Pause switch; per-run and monthly cost caps | Caps and budget; a kill switch |

Every decision the panel records carries who, when and **the bundle digest it
applies to**, so an approval cannot be replayed onto a changed draft. This is
the same idea as `approved-to-deploy` being revoked by a new commit.

**What the section must not do.** It must not publish, merge, deploy, hold a
provider key in the browser, edit prompts in place, treat the Reviewer's
"approve" as the owner's, or start an unbounded run. An approval asks the
separately governed publisher to open a pull request. It is not publication.

## 6. Owner decisions taken on this research, 28 September 2026

- Production database: a new production Supabase project (ADR-0025, option A).
- The Blog section on 30 September is static and read-only. The fixture bundle
  viewer waits for phases 18.1 and 18.2 on `main`.
- Order: 19a first, then 18.3, both ahead of phase 13a, recorded in
  [the roadmap](../state/CURRENT.md#roadmap).
- The package 19 plan is approved as R2.
