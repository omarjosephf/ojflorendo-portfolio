# ADR-0026: Gemini-first blog agent models with OpenAI and Anthropic fallbacks

- Status: **Accepted — owner decision, 29 September 2026. Supersedes the
  blinded provider comparison in
  [ADR-0024](0024-blog-provider-bakeoff.md), which was never executed.**
- Date: 2026-09-29
- Owner: OJ Florendo
- Risk: **R2** provider, model and architecture decision. It authorizes no
  implementation, credential creation or access, provider request, spend,
  storage change, deployment or publication. Each of those keeps its own
  approval under the [Engineering Handbook](../ENGINEERING_HANDBOOK.md);
  production secrets, paid requests and deployment remain **R3**
- Related:
  [ADR-0024](0024-blog-provider-bakeoff.md) (superseded),
  [Package 18 design](../reviews/blog-multi-agent-system-design.md),
  [Package 18 roadmap](../roadmaps/ev-management-progress.md)

## Context

ADR-0024 prepared a source-locked, blinded comparison of exactly
`gemini-3.8-flash`, `gpt-5.6-terra` and `claude-sonnet-5` so that Phase 18.3
could select a provider configuration from evidence. Its offline preparation
passed every check, but it never ran: no permanent ledger or artifact root, no
credential access, no provider request and no spend exist.

On 29 September 2026 a read of the official model and pricing pages found
every catalog price unchanged, but two of the three frozen candidates
superseded. OpenAI now lists a GPT-6 family (`gpt-6-astra`, `gpt-6-sol`,
`gpt-6-luna`); Anthropic labels Claude Sonnet 5 "Legacy" and recommends
Claude Sonnet 5.5. A result on the frozen set would not describe the models
that would actually be used.

The owner, following the course instructor's direction, has chosen Google
Gemini as the primary provider. The owner's quality bar is a model capable
enough for a personal portfolio blog, not the most capable model available.
With that choice made, the comparison could no longer change the decision.
Cost did not need an experiment: published list prices already place Gemini's
suitable models below the comparable OpenAI and Anthropic tiers.

The design record's complete workflow has six AI agents, clarified with the
instructor on 26 September 2026: Idea Scout, Planner–Researcher, Writer, SEO
Agent, independent Reviewer–Verifier and Critique Agent. The deterministic
orchestrator is software, not an agent.

## Decision

### 1. Cancel the Phase 18.3 comparison

The ADR-0024 comparison is cancelled, not run. Its code, manifests, tests and
documents stay as history and as reusable evaluation machinery (section 5).
Its runbook must not be executed. No R3 run follows from ADR-0024. The
documents are on `main`; the harness code is not carried there and stays on
the owner's unpublished backup branch
`backup/blog-18-2-18-3-pre-r2-2026-09-28`, so links from the historical
documents into `src/lib/blog/pipeline/bakeoff` do not resolve on `main`.

### 2. Primary models by agent

| Agent | Primary model | Thinking level |
| --- | --- | --- |
| Idea Scout | `gemini-3.8-flash` with Grounding with Google Search | medium |
| Planner–Researcher | `gemini-3.8-flash` | medium |
| Writer | `gemini-3.8-flash` | medium |
| SEO Agent | `gemini-3.5-flash-lite` | low, if the model exposes levels |
| Reviewer–Verifier | decided by Phase 18.4 test posts: `gemini-3.1-pro-preview` or `gemini-3.8-flash` | high |
| Critique Agent | `gemini-3.8-flash` | medium |

`gemini-3.8-flash` is the newest stable Flash model and costs the same as the
older 3.7 and 3.6 Flash models, and less than 3.5 Flash. Flash-Lite would save
only cents per post on the precision roles, which depend on exact evidence
quotation and strict structured output. The SEO Agent gives advice only and
cannot change facts, so it uses the cheaper Flash-Lite model.

The Reviewer–Verifier should not share the Writer's model, so that the
reviewer does not share the writer's blind spots. `gemini-3.1-pro-preview` is
preferred for that independence, but it is a preview model. Phase 18.4 test
posts decide between it and `gemini-3.8-flash`. If the same model is chosen for
both roles, the owner accepts that residual risk explicitly at that time.

These choices rest on official documentation, not measured output. Phase 18.4
validates them and may change a role's model or thinking level with evidence.
ADR-0024's 2,048-token output cap includes thinking tokens and is likely too
small for high thinking. Phase 18.4 must size it.

### 3. Fallbacks

| Agent | Fallback 1: OpenAI | Fallback 2: Anthropic |
| --- | --- | --- |
| Idea Scout | `gpt-6-sol` with web search | `claude-sonnet-5-5` with web search |
| Planner–Researcher | `gpt-6-sol` | `claude-sonnet-5-5` |
| Writer | `gpt-6-sol` | `claude-sonnet-5-5` |
| SEO Agent | `gpt-6-luna` | `claude-sonnet-5-5` |
| Reviewer–Verifier | `gpt-6-sol`, high | `claude-sonnet-5-5` or `claude-opus-5-5` |
| Critique Agent | `gpt-6-sol` | `claude-sonnet-5-5` |

OpenAI is first because its input-token count is exact, which suits the
pipeline's reservation controls. This order is provisional until each fallback
passes the same test posts. A fallback that has not passed is not relied on.
Fallbacks apply when a primary model is unavailable, retired or failing. They
are not a way to retry a single failed request. Each provider needs its own new,
least-privilege, spend-limited production credential. The dedicated ADR-0024
credentials are never repurposed.

### 4. Publication flow

The approved flow is unchanged: Idea Scout proposes three to five
evidence-backed topics, the owner picks or edits, and the remaining agents run
without further owner input. A post publishes only if its editorial score is
above 75 and every mandatory check passes; otherwise it is held for the owner.

- **Launch with auto-publish off.** Every post waits for owner approval until
  the Reviewer–Verifier's publish/hold decisions have been checked against the
  owner's own judgments, as the design record requires. The owner then enables
  auto-publish from the management panel.
- **Pick-ahead idea queue.** The owner may select several ideas at once to fill
  future slots, at a target of at least two posts a week. An email reminder is
  sent when the queue runs low. An idea the owner did not select is never
  published. An empty queue skips the slot.

### 5. Model Scout: recommend, test, one-click approve

A Model Scout keeps the models current without silent changes:

1. On a schedule, it reads each provider's official model-list API. It does not
   read arbitrary web pages.
2. It flags new models, price changes and announced retirement dates.
3. It evaluates a promising candidate on a fixed set of test posts with the
   same rubric, reusing ADR-0024's blinded evaluation machinery where it fits.
4. It shows the owner a comparison of score, cost and checks. The owner
   approves or rolls back with one click.

The only automatic change it may make is switching a role to its pre-approved,
tested fallback when a model is retired or persistently failing. It never
promotes an untested model.

### Pricing snapshot — 29 September 2026

USD per million tokens, standard paid tier, from the official pages:

| Model | Input | Output |
| --- | ---: | ---: |
| `gemini-3.8-flash` | 0.75 | 3.75 |
| `gemini-3.5-flash-lite` | 0.30 | 2.50 |
| `gemini-3.1-pro-preview` (prompts ≤200k tokens) | 2.00 | 12.00 |
| `gpt-6-sol` | 2.00 | 10.00 |
| `gpt-6-luna` | 0.10 | 0.50 |
| `claude-sonnet-5-5` | 2.00 | 10.00 |
| `claude-opus-5-5` | 4.00 | 20.00 |

The `gemini-3.8-flash` rates hold through 31 December 2026 and double from
1 January 2027. Grounding with Google Search includes 5,000 free requests a
month, then US$14 per 1,000. OpenAI web search is US$10 per 1,000 calls. The
Anthropic web-search price must be verified before that fallback is built.

## Alternatives considered

### Run the frozen ADR-0024 comparison

Rejected. Two candidates are superseded, and the result could not change the
owner's decision.

### Refresh the candidates and run a new comparison

Rejected. It would delay delivery to answer a question the owner has already
decided. The evaluation machinery is retained for the Model Scout.

### One Gemini model for every agent

Considered and rejected. It is simpler, but it gives up reviewer independence
and a cheaper fit for the advisory SEO role.

### Gemini 3.1 Pro for several agents

Rejected for unattended roles. It is a preview model and costs about three
times as much as 3.8 Flash. It is considered only for the test-gated
Reviewer–Verifier.

### Claude Haiku 4.5 or top-tier fallbacks

Rejected. Anthropic lists Haiku 4.5 for retirement no sooner than
15 October 2026, and it has no effort control. GPT-6 Astra and Claude Fable 5.1
cost about thirteen times more than needed.

### An agent that swaps models automatically

Rejected. A new model can break structured output or safety checks. A silent
swap of the Reviewer–Verifier would change the publication gate without a test.
An agent reading web pages to choose models is also exposed to prompt
injection.

### Auto-publish from launch

Rejected until the Reviewer–Verifier's decisions are validated against the
owner's judgments.

## Security and privacy impact

- Up to three providers may receive blog source material and drafts, but only
  approved, publishable content. Never visitor data, secrets or private
  documents.
- Each provider needs a new production credential with least privilege and a
  spend limit. Cited and E.V. credentials, ledgers and budgets stay separate.
  The ADR-0024 bake-off credentials are not reused.
- Idea Scout brings untrusted web content into the pipeline through search
  grounding. That content is data, never instructions, and it cannot bypass the
  Reviewer–Verifier or the deterministic checks.
- The Model Scout reads only official model-list APIs and cannot promote a
  model without owner approval.
- The production pipeline needs its own threat model before implementation.
  ADR-0024's threat model covers only the cancelled comparison.

## Operational and performance impact

A post takes about eight model calls. From list prices, the estimated maximum
is about US$0.10 per post on the Gemini primaries, and about three times that
on the fallbacks. Google Search grounding at two posts a week stays inside the
free monthly allowance. The Gemini price increase on 1 January 2027 is a known
change for the Model Scout to report. Operating three providers means three
credentials, three spend limits and three sets of provider terms to maintain.

## Consequences and trade-offs

- No evidence-based cross-provider ranking exists. That was an explicit owner
  trade-off. Quality evidence now comes from Phase 18.4 test posts.
- The ADR-0024 harness, runbook and threat model become historical. They stay
  in the repository but must not be executed.
- The owner should revoke the dedicated bake-off credentials or let them
  expire.
- Phase 18.4 must add contracts, tests and cost limits for Idea Scout, SEO
  Agent and Critique Agent, which the frozen baseline excluded.

## Rollback or migration

This is a design decision; reversing it needs a new ADR. Changing a model within
the approved provider set follows the Model Scout's test-and-approve path. A
future cross-provider comparison can reuse the ADR-0024 machinery with fresh
candidates, prices and approvals.

## Related decisions

- [ADR-0024](0024-blog-provider-bakeoff.md): the superseded blinded comparison
- [ADR-0000](0000-handbook-adoption.md): handbook adoption
