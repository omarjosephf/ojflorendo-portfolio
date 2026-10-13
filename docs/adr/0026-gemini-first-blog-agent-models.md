# ADR-0026: Gemini-first blog agent models with OpenAI and Anthropic fallbacks

- Status: **Accepted — owner decision, 29 September 2026. Supersedes the
  blinded provider comparison in
  [ADR-0024](0024-blog-provider-bakeoff.md), which was never executed.**
- Amended: **13 October 2026**: every agent reaches its model through
  OpenRouter, and the Idea Scout searches with Exa, not Google grounding. See
  [the amendment](#amendment--openrouter-route-13-october-2026)
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

## Verification — Phase 18.4, 30 September 2026

The first live runs used a new, dedicated Google project ("Project Zero Blog",
Tier 1 Prepay on the owner's existing billing account, linked on the owner's
explicit approval) and a new key the owner saved outside the repository. The
bake-off and E.V. keys were not used. Spend is recorded in the durable ledger
of `src/lib/blog/live`: **US$0.6699 of the approved US$5.00**, with no run
above the US$1.00 per-run ceiling.

- **Idea Scout** (`gemini-3.8-flash`, Google Search). Two early calls cost
  US$0.03 each but could not be used. Google's current keys contain a full
  stop, and store-less responses omit the interaction id. The search steps also
  nest their queries and Search Suggestions one level deeper than first
  assumed. All three issues were fixed with tests. The third call returned five
  ideas with Search Suggestions, shown to the owner as the grounding terms
  require. The owner chose idea 1.
- **Four drafting attempts on that idea:**
  1. `run-20260930-014625` passed every gate after one revision, but review
     found it flawed and the owner did not choose it: it mixed first and third person, left a quoted
     reference dangling and made an uncited first-person claim.
  2. `run-20260930-015026` was held. The stricter Reviewer v2 found an uncited
     sentence (claim coverage).
  3. `run-20260930-015308` returned no draft. Researcher v2 over-restricted
     sentences that name OJ.
  4. `run-20260930-015400` passed every gate on the first review. The owner
     approved it for publication (record digest
     `93ad917d3e3feb4d15c1c3434f98caa5c8064d36bf49aff7ffd8f0dbfd7bba63`).
- **Approved run: calls and cost.** Its five calls cost US$0.0971 in total.
  The largest output was the Researcher's: 611 visible and 5,751 thinking
  tokens.

  | Call | Model | Cost | Time |
  | --- | --- | ---: | ---: |
  | Research | `gemini-3.8-flash` | US$0.0260 | 18 s |
  | Draft | `gemini-3.8-flash` | US$0.0151 | 11 s |
  | SEO | `gemini-3.5-flash-lite` | US$0.0010 | 2 s |
  | Review | `gemini-3.1-pro-preview` | US$0.0514 | 21 s |
  | Critique | `gemini-3.8-flash` | US$0.0036 | 4 s |

  Every call stayed far below its output cap (16,384 or 24,576 tokens,
  thinking included). The 2,048-token cap would not have been enough.
- **Reviewer choice.** Kept on `gemini-3.1-pro-preview` for independence from
  the Writer. It is not yet validated. The Reviewer scored both passing drafts
  100 on every measure, including the flawed draft the owner did not choose, so its
  scores are not calibrated to the owner's judgement. Auto-publish stays off
  until the calibration set exists.
- **Not done in Phase 18.4:** the OpenAI and Anthropic fallbacks, the Model
  Scout, OpenRouter (raised by the owner for testing; a candidate for the
  fallback phase) and the nine-example calibration set.

## Amendment — OpenRouter route, 13 October 2026

- Status: **Accepted. Owner decision, 13 October 2026**, in the approved
  [phase plan](../roadmaps/PLAN-blog-19b.md) (phase A). It changes only the
  route to the models. The six agents, their models, thinking levels and
  output caps are unchanged. Push, merge and key revocation keep their own
  owner approvals.

### Decision

1. **One route.** Every live agent calls its Gemini model through
   OpenRouter's chat-completions API with one key (`blog-agents`), which has
   a hard US$5 total limit and expires on 11 January 2027. The direct Gemini
   client is deleted. The runner keeps its US$1 per-run ceiling, and the
   route has its own durable ledger with a US$2 ceiling for phase A.
2. **Google only, at list price or below.** Each request sets
   `provider.only` to Google AI Studio and Google Vertex, with
   `require_parameters: true`. Its `max_price` equals the reviewed list price.
   No other host receives blog material. The dearer priority tier cannot be
   chosen; the cheaper flex tier can. Prices were re-read from OpenRouter's
   endpoint list on 13 October 2026 and match the snapshot above.
3. **Idea Scout: Exa search in two steps.** Step 1 uses OpenRouter's
   `openrouter:web_search` server tool, with the engine fixed to Exa and at
   most 3 searches, and returns short plain-text reader notes. Step 2 has no
   tools and returns the strict `IdeaSlate.v1`. Two steps are needed because
   OpenRouter did not hold a tool-using call to the schema. The engine is
   pinned because `auto` on Gemini means Google's own grounding. Only each
   result's address and title are kept: Exa's terms limit copying and storing
   results. Google grounding and Search Suggestions are no longer used
   anywhere.
4. **Wire schemas use the subset that survives the route.** OpenRouter
   passes the structured-output schema on to Gemini, but a schema holding an
   integer `enum` (`schemaVersion: 1`) together with array bounds reached the
   model as an empty object, and the model returned `{}`. So the wire schemas
   carry:
   - no version field;
   - no integer `enum`, `const`, numeric range or array bound.

   Code stamps the version, heading levels travel as the strings `"2"` and
   `"3"`, and the unchanged Phase 18.2 parsers still check every rule that was
   removed. A unit test keeps the schemas to this subset.
5. **Cost is OpenRouter's reported charge, never less than the reviewed
   price.** Each call settles at the larger of OpenRouter's `usage.cost` and
   the cost computed from tokens and the price table. A response whose usage
   record states neither the charge nor, for a call without search, both
   token counts is an unknown outcome and keeps its full reservation. A
   search call needs the stated charge, because only that includes Exa's
   fee. A failed call billed above its reservation stops every further call.

### Why

- One key with a hard credit limit, and any agent's model changeable later by
  changing one model name.
- The process retro of 12 October 2026 makes Vercel AI Gateway the default
  for apps hosted on Vercel, and OpenRouter the choice when a firm per-key
  cap is needed. The blog runner runs on the owner's computer, not on
  Vercel, and needs that firm cap.
- Moving the Idea Scout off Google grounding removes the Search Suggestions
  display and storage rules that phase B's run upload would otherwise have to
  carry.

### Alternatives considered

- **Vercel AI Gateway.** It charges no markup and, on Pro, offers zero data
  retention per request. It was rejected for this runner because its budgets
  are soft, BYOK spend is not counted, and its keyless OIDC access is designed
  for code hosted on Vercel. It stays the default for hosted features.
- **Direct Gemini (status quo).** It has no intermediary and no OpenRouter
  fee (5.5% on credit purchases, per the 12 October research), and Google
  enforces the schema itself. It was rejected because every later model
  change would need another provider, client and key. The Idea Scout would
  also stay on Google grounding and its Search Suggestions rules. It remains
  the fallback if the route fails, which is why the Gemini key is revoked
  only after A4.

### Security and privacy impact of the amendment

- OpenRouter becomes a processor of blog source material, drafts and Idea
  Scout search queries; Exa receives the search queries. Neither receives
  visitor data, secrets or private documents.
- Owner check, 13 October 2026: OpenRouter's input and output logging is
  off, and so are broadcast and paid-model training. Zero data retention is
  not switched on.
- The key sits outside the repository in `openrouter.env`. It is passed with
  `--env-file` and never logged, returned or included in an error.
- Search results remain untrusted data. The reader notes are capped at 4,000
  characters and enter step 2 only as data.

### Known limits

- `usage.server_tool_use.web_search_requests` reported **0** on every
  search call, although `usage.cost` included Exa's charge. The A3 search
  call was reported at US$0.013205 against a token cost of US$0.006205, a
  difference of exactly one US$0.007 search. Settling at the reported cost
  keeps the ledger whole, but the recorded search count is unreliable. The
  3-search cap is enforced only through the request (`max_uses`,
  `max_tool_calls`), not checked afterwards.
- The Reviewer again scored a passing draft 100 on every measure. It remains
  uncalibrated, and auto-publish stays off.

### Verification — phase A, 13 October 2026

All spend is recorded in `openrouter-spend-ledger.json`: **US$1.3736 of the
approved US$2.00**.

- **Three failed A3 attempts (US$0.1135).**
  - One call with search and schema together returned invalid JSON.
  - A second returned JSON that did not match `IdeaSlate.v1`.
  - In the third, the search step worked, but the slate call, with no tools,
    returned 4 visible tokens.
- **Diagnosis: three tiny `gemini-3.5-flash-lite` calls (US$0.0011).**
  1. The real slate schema came back as `{}`, with 63 prompt tokens, so the
     schema never reached the model.
  2. The same shape without the integer enum and array bounds was followed
     exactly, with 309 prompt tokens.
  3. The simplified Writer schema, with nested `anyOf`, was followed in
     shape. It produced a level-1 heading, which led to the string-enum
     level.
- **A3 passed.** `ideas-20261013-040817` returned four ideas for US$0.0243:
  the search call US$0.0132 (Google Vertex, five cited pages) and the slate
  call US$0.0111 (Google AI Studio).
- **A4 passed.** `run-20261013-040919` (idea 3) reached owner review on the
  first review, with every hard gate passed, for **US$0.1127** in five calls:

  | Call | Model | Cost |
  | --- | --- | ---: |
  | Research | `gemini-3.8-flash` | US$0.0192 |
  | Draft | `gemini-3.8-flash` | US$0.0240 |
  | SEO | `gemini-3.5-flash-lite` | US$0.0011 |
  | Review | `gemini-3.1-pro-preview` | US$0.0647 |
  | Critique | `gemini-3.8-flash` | US$0.0037 |

- **Review and final verification, 13–14 October 2026.** A fresh-context
  review found four gaps, all fixed with tests:
  - an empty usage record settled a call at zero;
  - a failed call billed above its reservation was not a global stop;
  - the search reservation omitted earlier turns' outputs;
  - web page titles reached the terminal with control characters.

  Six more live runs on slate `ideas-20261013-230822` then found further
  faults, each fixed and checked live:

  | Run | Result | What it showed |
  | --- | --- | --- |
  | `run-20261013-230928` | held | Quoted sentences kept their Markdown and mid-sentence capitals. Fix: Markdown sentences are no longer offered, and Writer v4 never splices a quote |
  | `run-20261013-231844` | failed | The Writer spent 15,728 tokens thinking and hit its 16,384 cap. Fix: the cap is now 32,768 |
  | `run-20261013-232216` | no-draft | The Researcher refused the brief. Bold lead sentences were being dropped. Fix: they are offered without their markers |
  | `run-20261013-232504` | held | The prompt-injection gate fired, as designed, on ADR-0006, a document about prompt injection |
  | `run-20261013-232843` | no-draft | Correct: the brief claimed what the sources do not say |
  | `run-20261013-233000` | held | The Reviewer recommended approve, but one uncited sentence failed claim coverage, and any failed gate rejected without the revision built to fix it. Fix: a first-review claim-coverage or claim-support failure now takes the single revision; the final review must still pass every gate |
  | `run-20261013-233533` | held | The revision ran and every gate passed on the final review. The Reviewer still asked for writing fixes: quoted sentences that rely on their source's context ("V", "recorded below") |

  Every call in these runs returned valid output. The open quality gap is
  sentence choice: the Researcher still picks sentences that need their
  original context. That is the next prompt-quality task.

## Related decisions

- [ADR-0024](0024-blog-provider-bakeoff.md): the superseded blinded comparison
- [ADR-0000](0000-handbook-adoption.md): handbook adoption
