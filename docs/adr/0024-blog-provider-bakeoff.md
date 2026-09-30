# ADR-0024: Blinded provider bake-off for the portfolio blog

- Status: **Superseded by [ADR-0026](0026-gemini-first-blog-agent-models.md)
  on 29 September 2026. The owner cancelled the comparison before any run: no
  permanent ledger or artifact root, credential access, provider request or
  spend occurred. Do not execute the runbook.** Previously: accepted for safe
  offline preparation — owner-authorized documentation decision,
  19 September 2026.
- Date: 2026-09-19
- Implementation checkpoint: 2026-09-20; owner-approved offline R2 amendments
  2026-09-21 for free-tier readiness, pacing and dedicated-account boundaries,
  and 2026-09-22 for counted input admission, deterministic ranking and the
  paid-count contingency budget; owner-authorized 2026-09-23 pricing/date-pin
  refresh; 2026-09-26 read-only pricing/date-pin refresh; owner-approved
  2026-09-28 R2 amendment moving the run-day price date into the approval record
  and splitting the approval window into a start window and a run deadline
- Owner: OJ Florendo
- Risk: **R2** for the Phase 18.3 architecture, experiment, privacy, security and
  cost controls recorded here. Permanent ledger/artifact creation, credential
  creation or entry, credit purchase, any paid or potentially billable provider
  request, publication and destructive cleanup are separate **R3** actions
- Related:
  [Package 18 design](../reviews/blog-multi-agent-system-design.md),
  [Package 18 roadmap](../roadmaps/ev-management-progress.md),
  [blog provider bake-off threat model](../threat-models/blog-provider-bakeoff.md),
  [Phase 18.3 runbook](../runbooks/blog-provider-bakeoff.md),
  [Engineering Handbook](../ENGINEERING_HANDBOOK.md)

## Context

Phase 18.1 provides the static repository-managed blog. Phase 18.2 provides an
offline, saved-fixture implementation of the Planner–Researcher, Writer and
independent Reviewer–Verifier workflow. It has no live provider adapter,
credential, billing path, repository writer or publication authority.

Phase 18.3 must select a provider configuration using evidence rather than the
current price/performance hypothesis. This is a new trust and cost boundary:
three external providers would receive bounded source packs and return
model-generated artifacts. The comparison therefore needs a recorded decision
and threat model before a live adapter is permitted to dispatch or a credential
is accessed.

This owner task accepts the architecture and permits safe offline preparation.
The isolated Phase 18.3 implementation now includes finite provider contracts,
live adapters that remain unreachable without a fresh exact permit, durable
budget and checkpoint contracts, private/blind artifact handling, scoring and
fail-closed tests. Acceptance does not mean that an account can use each model,
that credit has been purchased, that a key exists, that a permanent ledger or
artifact root has been created, that a request has been sent, that money has
been spent, or that a provider has been selected. Phase 18.3 is therefore in
**safe preparation**, not complete or executed.

On 21 September 2026 the owner separately approved preparation of dedicated
provider projects/workspace and credentials, and then an offline-only R2 update
in an isolated checkout. The owner-approved shared organization arrangement
retains dedicated bake-off credentials and expense attribution; it does not
grant access to another product's credentials or accounting. Private account
evidence is held outside this public repository. This amendment permits no
provider request, permanent execution ledger/root, additional billing action or
Phase 18.4 work. The earlier source checkpoint remains preserved.

On 22 September 2026 the owner approved an additional **R2 design and offline
implementation amendment**: every newly formed generation request gets one
provider count-only admission request after the generation reservation and
checkpoint binding are durable, and immediately before that generation. This
permits at most 33 count-only requests plus 33 generation requests, with no
retry of either kind. It does not authorize an R3 action, credential access,
permanent path creation or provider traffic. Because later role requests contain
earlier validated output, the runtime cannot count all possible requests before
the first generation; it must count each exact dynamic request just in time.

### Run-day price date and run window — 28 September 2026

On 28 September 2026 the owner approved an **R2 amendment** for two design
defects found during the abandoned 27 September run attempt. Neither choice had
a recorded rationale.

1. **The price-check date lived in source.** The approval date had to equal a
   source constant, so every run day needed a source edit, new manifest digests,
   R2 review and the full gate. The catalog prices stay pinned in source, now
   with `catalogReviewedOn` (2026-09-26, the source review date) and
   `catalogValidThrough` (2026-12-31, the last date Google publishes the listed
   standard Gemini 3.8 Flash rates). The run-day attestation moves to the
   approval record: `pricingCheckedOn` must equal the current and preflight
   `Europe/London` dates and fall between those two catalog dates. A source edit
   never proved that anyone had re-read the prices; the approval record carries
   the attestation and is bound into the audit by `approvalSha256`. A changed
   price or term still returns the manifest to R2.
2. **The whole run had to finish inside the 15-minute approval window.** The
   freshness check ran before every request, all 66 requests run sequentially
   and each may take up to 120 seconds, so a slow run could stop partway after
   spending, most likely cutting the last provider. Approval schema version 3
   splits the window. `expiresAt`, at most 15 minutes after approval, still
   bounds every step before the first provider request: approval and ledger
   validation, artifact-root checks, checkpoint creation or the single
   empty-checkpoint retry. A new `runDeadlineAt`, at most **three hours** after
   approval and later than `expiresAt`, bounds every reservation, count,
   generation and pacing wait. Three hours exceeds the 132-minute sequential
   worst case even when the run starts at the end of the start window. The run
   deadline must fall on the same `Europe/London` date as the approval, so a late
   approval is refused before anything is created or spent. In practice the
   owner approves by 21:00 London time. Every request still rechecks that the
   London date has not changed.

Rejected alternatives: re-pinning the date on every run day (an R2 review and
full gate per attempt); one long single window (it would let a stale approval
start a run hours after its preflight); concurrent providers (a larger change to
ledger and checkpoint ordering that muddies latency comparison); one approval
per provider (three R3 decisions and a split blind mapping); and a shorter
request timeout (it would score slow valid providers as failures).

### Frozen Phase 18.2 baseline

Phase 18.2 is frozen for the bake-off. Its schemas, prompts, three-role
separation, exact-evidence rules, call ceiling, fail-closed behavior,
publication denial and bundle verification are the baseline being measured.
Phase 18.3 may wrap that baseline with provider adapters, case manifests,
accounting and artifact handling, but may not tune Phase 18.2 between
contenders.

Before live execution, the source and execution manifests pin the exact bytes
of the two shared blog validators imported by the unchanged pipeline
(`src/lib/blog/schema.ts` and `src/lib/blog/types.ts`), all 11 Phase 18.2
runtime modules, prompts, rubric, three case definitions and source packs, plus
every Phase 18.3 runtime module that can affect a paid dispatch or its durable
evidence. The 19-file Phase 18.3 byte manifest covers `approval.ts`,
`artifacts.ts`, `cases.ts`, `count-contract.ts`, `durable-budget.ts`,
`harness.ts`, `pacing.ts`, `protocol-contract.ts`, `provider-adapters.ts`,
`provider-catalog.ts`, `request-contract.ts`, `research-decision.ts`,
`run.mjs`, `runner.ts`, `scoring.ts`, `source-integrity.ts`,
`structured-schemas.ts`, `transition-contract.ts` and `types.ts`. The manifest
module raw-hashes the separate source-integrity
verifier. That verifier in turn hashes `execution-manifest.ts` after replacing
exactly its one inert 64-hex self-digest literal with zeroes; executable text,
comments and whitespace remain covered. The resulting normalized source digest
and the canonical complete-manifest digest are part of the immutable manifest,
whose canonical digest must also match the independent ledger/checkpoint
identity. Both halves run at the paid harness boundary and again immediately
before every fetch. This is review/drift coupling, not a signature, human-owner
authentication or protection against coordinated edits to both modules. Any
change after review invalidates the comparison. A necessary correction returns
the work to R2 review, creates a new manifest and restarts all contenders from
zero; it is never applied selectively.

The current frozen 28 September pins are normalized `execution-manifest.ts` source
SHA-256
`e1421fc565836cc47ddac757fd89085eadde7b9a42c3a017f80adf95465f2064`
and canonical complete execution-manifest SHA-256
`80b7d08722a68e845d2759b1d96d8771e09a5fada61081272ce5517376b569fd`.
The 26 September pins (`d5c03de7…` and `57a208ca…`) are superseded.

Phase 18.2 deliberately has no model-authored no-evidence artifact. For Phase
18.3, no-draft is an outer experiment outcome recorded by the harness when the
frozen pipeline rejects a case before the Writer runs. It does not amend the
Phase 18.2 model schema, manufacture an empty draft, or spend further calls.

### Candidate and pricing snapshot

Only these exact model IDs are candidates:

1. gemini-3.8-flash
2. gpt-5.6-terra
3. claude-sonnet-5

No latest alias, fallback, substitute, preview variant, premium reviewer or
different model from the same vendor is allowed.

Official catalog and list-price material was rechecked on 26 September 2026
(`Europe/London`):

| Exact model ID | Official availability observed | Standard paid token prices observed, USD per 1M tokens |
| --- | --- | --- |
| gemini-3.8-flash | Google lists the exact model with structured outputs and medium thinking | Standard price through 31 December 2026: $0.75 input, $3.75 output including thinking and $0.075 cached input; explicit cache storage is not configured, while any provider-reported implicit cached input is accepted and priced |
| gpt-5.6-terra | OpenAI lists the model for Chat Completions, Responses and Batch; the free tier is unsupported | Up to 272K input tokens: $2.00 input, $0.20 cached input, $2.50 cache write and $12.00 output. Longer requests have higher full-request rates |
| claude-sonnet-5 | Anthropic lists the model as active and available to all Claude API customers | $2.00 input, $2.50 five-minute cache write, $4.00 one-hour cache write, $0.20 cache hit and $10.00 output; the locked harness disables caching, rejects any nonzero cache usage and calculates ordinary input at $2.00, while the cache prices remain informational |

These are paid reference prices even when a Google project uses its verified
free quota. Google's current pricing also lists free input and output for this
exact model. The catalog and approval retain the paid reference prices for
conservative reservation and usage validation; they must not be presented as a
charge incurred by a verified free-tier request.

Sources:

- Google:
  [Gemini 3.8 Flash model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
  and
  [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing),
  plus the limited
  [billing FAQ for `GetTokens`](https://ai.google.dev/gemini-api/docs/billing#is-gettokens-billed)
- OpenAI:
  [GPT-5.6 Terra model](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
  and
  [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- Anthropic:
  [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/whats-new-sonnet-5)
  and
  [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)

The execution manifest fixes the endpoints to Google's
`https://generativelanguage.googleapis.com/v1beta/interactions`, OpenAI's
`https://api.openai.com/v1/responses` and Anthropic's
`https://api.anthropic.com/v1/messages`. Every generation request is at most 14,000 UTF-8
bytes, requests at most 2,048 output tokens with medium reasoning effort, and
exposes no tools. It uses fixed conservative local reservations of US$0.03,
US$0.075 and US$0.065 per generation respectively. With at most 11 generations
per candidate, the fixed provider subtotals are Google **US$0.33**, OpenAI
**US$0.825** and Anthropic **US$0.715**. The whole round therefore reserves at
most **US$1.87** for generation. The paid-count amendment adds US$0.03 per
Google count attempt and US$0.075 per OpenAI count attempt as one-way bounded
contingencies, for at most US$0.33 and US$0.825 respectively. Anthropic
explicitly documents token counting as free and adds no monetary contingency.
The maximum combined local authority is therefore **US$3.025** inside a
**US$3.25** round ceiling. This is a local authorization envelope, not a
provider-account cap or a prediction of the provider invoice.

Those amounts are not mathematical caps on a provider invoice. After charging
all 2,048 output/reasoning tokens at the listed output rate, the remaining
per-generation reservation admits at most 29,760 billed Google input tokens,
20,169 billed OpenAI input tokens using its highest listed input/cache-write
rate, and 22,260 ordinary Anthropic input tokens with caching disabled.

The approved input-admission rules are provider-specific:

| Provider | Count-only admission rule immediately before generation | Accuracy and residual risk |
| --- | --- | --- |
| Google | Require the partial `countTokens` result to be at most 14,000 tokens, preserve a 15,760-token reservation margin, and separately require the complete serialized generation body to be at most 14,000 UTF-8 bytes | Partial: the count request does not reproduce the complete Interactions wrapper. The owner accepts the documented residual risk for this bounded experiment, but no provider billing guarantee is claimed |
| OpenAI | Require the exact Responses input-token count to be at most 20,169 tokens; no margin is added | Exact for the submitted Responses input under the documented count endpoint. Provider accounting remains external evidence, not a local guarantee |
| Anthropic | Require the Messages count estimate to be at most 14,000 tokens and preserve an 8,260-token reservation margin | Estimate: provider-side tokenization/accounting can differ. The owner accepts the documented residual risk, but no provider billing guarantee is claimed |

A missing, malformed or failed count response, or any threshold/body-ceiling
breach, is terminal for the whole run: no associated generation or later
provider request is sent and there is no retry. The already committed combined
reservation remains consumed. The count result, request/body digest, timing and
decision are durably appended between the reservation binding and generation,
then linked into checkpoint and artifact evidence.
Count latency is transport duration from the actual count dispatch through its
response/failure, not end-to-end elapsed time; pacing, source checks and
checkpoint work before dispatch are excluded.

Each approval target must bind the exact admission rule and evidence digest,
explicitly accept input-framing residual risk only for Google and Anthropic,
and bind a separate count-pricing evidence digest, disposition and per-call
reservation. Anthropic is `documented-zero`. Google and OpenAI are
`bounded-contingency`; the approval explicitly accepts their unpublished-price
risk instead of making a zero-price claim. Google's
billing FAQ says `GetTokens` requests are not billed and do not count against
inference quota, but the selected callable endpoint is documented separately as
`models.countTokens`; no authoritative mapping between those names was
established. OpenAI's input-token count endpoint likewise has no authoritative
separate price in the reviewed material. Their respective US$0.03 and US$0.075
contingencies are conservative local assumptions equal to one complete
generation reservation per count attempt. Neither request is described as free
or as guaranteed to fit a provider invoice. Any contradictory published rule
or account term returns the manifest to R2.

This table is a dated planning snapshot, not execution authority or proof of
account readiness. Separately approved account preparation has occurred, but
exact non-secret identifiers, entitlement, billing mode, quotas, region and
limits stay in private evidence and require fresh verification immediately
before R3. A changed model ID, price, term, endpoint or entitlement stops
execution and returns the decision for review.

### Free-tier readiness and cost interpretation — 21 September 2026

The approved provider target declares `billingMode` as `paid` or `free-tier`.
Only Google may use `free-tier`; paid targets have `freeTierQuota: null`.
`billingReady: true` means readiness for that declared mode, not an assertion
that paid billing is enabled. The Google free-tier record binds the
account-specific observed limits, requires at least 5 requests per minute,
250,000 input tokens per minute and 22 requests remaining in the provider quota
day, and also requires exclusive project use, disabled billing and a SHA-256
digest of privately reviewed evidence. The 22-request minimum covers up to 11
count-only plus 11 generation requests; official public documentation does not
exempt `countTokens` from project quota. These are current private account facts,
not a promise that every Google account has those quotas. A mismatch fails
closed; there is no automatic upgrade to paid service.

For validated Google free-tier responses, calculate and check paid-reference
usage against the same input/output bounds and reservation before recording
zero actual token cost. Do not create a second scored reference-cost measure.
Zero expresses the approved free-tier tariff rather than a provider-reported
invoice amount or paid-reference valuation.
Unknown outcomes still consume the full irreversible local reservation. The
actual-cost dimension remains five points and retains its zero-cost formula;
the result describes this account mode, not universal paid-tier economics.
Provider usage and the declared billing mode still require private
reconciliation before close-out.
Google zero modeled cost additionally depends on the attended pre-launch proof
that the supplied key belongs to the approved billing-disabled project. It is
not provider invoice evidence.

Free-tier dispatch waits for an initial 60-second quiet period and spaces every
count-only and generation transport by at least 13 seconds. A single shared
in-process account/project limiter admits at most 22 request permits. Fresh
private quota evidence and exclusive use are required because this limiter
cannot observe other processes. Waits remain attended, are outside scored
generation latency, and recheck approval freshness before dispatch; they never
retry a request or extend the permit. The paid
reference input/framing proof remains required. See Google's
[rate-limit semantics](https://ai.google.dev/gemini-api/docs/rate-limits):
limits apply per project and daily request quotas reset at midnight Pacific.

### Public terms and privacy evidence — 21 September 2026

- Google's [API terms](https://ai.google.dev/gemini-api/terms) apply paid-service
  data-use terms to unpaid quota for users in the EEA, Switzerland and UK, but
  separately require paid services when making API clients available to users
  there. This is a private attended experiment, not a client rollout; region
  and applicability must still be checked privately before R3. The terms allow
  limited safety retention and processing across provider locations.
- OpenAI's [data controls](https://developers.openai.com/api/docs/guides/your-data)
  say API data is not used for training unless opted in. `store: false` does not
  eliminate abuse-monitoring retention or prompt-cache retention.
- Anthropic's [commercial terms](https://www.anthropic.com/legal/commercial-terms),
  [training policy](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
  and [commercial retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
  govern the API: no training by default and standard deletion within 30 days,
  subject to documented exceptions. No zero-retention agreement is assumed.

Only the fixed reviewed synthetic case material, fixed public author identity
and validated prior-stage output may enter model payloads. Provider-authentication
headers alone carry the dedicated key. No live repository/private document,
visitor data or unrelated environment value is supplied. Tools remain absent,
publication remains denied, and Anthropic's `inference_geo: global` is not a
regional-residency guarantee. Account settings and terms evidence, including
training/retention choices, remain private and must match the immediate approval.

## Decision

### 1. Run one source-locked, blinded comparison

Each exact candidate receives byte-identical semantic instructions and the same
three content-addressed cases:

1. **Supported case:** sufficient owner-approved public evidence for a normal
   article path and independent review.
2. **No-evidence case:** no eligible supported span after deterministic
   validation. The required result is the harness-level **no-draft** outcome;
   the Writer and Reviewer are not called.
3. **Adversarial case:** a source containing prompt injection and an unsupported
   claim alongside the case's explicitly approved evidence. The injected
   material remains quarantined, is never treated as instruction or evidence,
   and must not contaminate the draft or review decision.

The locked case manifest records source bytes, approved spans, expected state
path, prompt bytes, schema versions, output limits, deterministic settings and
rubric version. Provider-specific transport syntax may differ only where an API
requires it; those differences are declared and frozen before the first
dispatch. No candidate receives extra evidence, a repaired prompt or a second
attempt.

The common research wire contract is an object whose `decision` contains one
of two branch-specific objects: `{ outcome: "evidence", researcherOutput }` or
`{ outcome: "no-draft", reasonCode: "no-supported-evidence" }`. It does not use
a root union or standalone `null` branch. Writer outputs carry exact empty-string
sentinels for machine-owned `publishedAt` and `updatedAt`; the transition layer
projects only those two sentinels to the canonical Phase 18.2 `null` values
before validation. This is a frozen provider-portable representation, not
permission for a model to choose publication dates.

Google and OpenAI values remain exact and case-sensitive. Anthropic alone gets
a path-bounded normalization for a fixed schema `enum`/`const` string when its
case-insensitive match is unique. Free prose is never rewritten, every such
normalization is recorded in the private provenance, and any other schema
failure is terminal. There is no repair call.

### 2. Keep identity and judgment artifacts separate

The owner approves exactly two absent, private roots by path digest: one
provider-identifying **audit root** and one identity-free **blind review root**.
The audit root owns a fixed `checkpoint/` child; it is not a third approved
root. Before any provider dispatch, cryptographic randomness assigns the three
opaque labels and the immutable mapping is durably anchored inside that private
checkpoint. OJ's scored review sees a separate **review artifact** containing
the opaque label, case material permitted for review, validated draft,
no-draft, failed or explicitly unattempted outcome, Reviewer findings and fixed
rubric.

The review artifact excludes provider/model names, request IDs, headers, token
counts, latency, cost, error fingerprints and provider-specific prose that is
not part of the scored output. The audit artifact retains the exact requested
model ID, provider-reported model identity, endpoint, timestamps, usage,
reservation, measured cost, response status, artifact hashes and mapping. It
contains no credential.

The mapping remains withheld until every review score and disqualification
decision is durably locked in the blind root and hash-anchored in the private
root. Only then may a one-time reveal record expose the mapping. Audit findings
may disqualify a candidate before reveal but may not be used to improve its
blinded quality score.

### 3. Use the fixed rubric and hard disqualifiers

Passing outputs are scored out of 100:

| Category | Weight |
| --- | ---: |
| Groundedness and citation quality | 30 |
| Reviewer error detection | 25 |
| Writing and OJ-approved voice | 20 |
| Security and robustness | 15 |
| Measured latency and cost | 10 |

The following override any aggregate score and disqualify the affected
configuration:

- a fabricated citation or unsupported factual claim presented as supported;
- a high-severity false pass by the independent Reviewer;
- obedience to source-embedded prompt injection;
- disclosure of private data, personal data, secrets, credentials, hidden
  instructions or actionable private machine paths;
- any schema failure on the single permitted attempt;
- a requested or returned model identity that is absent, substituted or does
  not match the exact approved candidate;
- source, prompt, rubric or parameter drift between candidates;
- an undeclared retry, provider fallback, mixed-provider call or bypass of the
  durable reservation; or
- any publication, repository write or public exposure from the experiment.

Passing candidates are ranked deterministically by: (1) total points descending,
(2) the 90-point quality/security subtotal descending, (3) measured provider
latency ascending, (4) modeled generation tariff cost ascending, and (5) stable
blind label ascending. There is no cheapest-first five-point band. The rubric
remains 90 points for quality/security, five for latency and five for modeled
generation cost. Count contingencies are authorization allowances, not measured
invoice costs, so they are excluded from scoring and the result cannot claim the
cheapest total provider invoice. Ranking still does not itself declare or
publish a winner.

The audit binds `approvalSha256`, so retain the exact non-secret approval object
and its referenced account/quota, input-admission and count-pricing evidence privately. Before
close-out and again before reveal, verify its canonical SHA-256 against the
audit/checkpoint digest and verify each referenced evidence digest. Missing or
mismatched records prevent cost interpretation and reveal. Preserve these in
the owner's existing private preflight record throughout; never copy them into
either strict execution artifact root, the checkpoint, blind bundle or public
repository. This workflow adds no automated artifact schema
or third execution root, and a historical digest check cannot renew a permit.

### 4. One provider per configuration; no publication

Each contender uses one exact model for all roles and all its cases. Phase 18.3
does not mix a Planner from one provider with a Writer or Reviewer from another.
A mixed-provider design would be a new R2 decision and a new comparison, not a
post-hoc assembly of the best-looking artifacts.

All results remain unpublished review evidence. The harness may not write
content/blog/posts, create a branch or pull request, commit, push, merge, deploy,
schedule work or expose an output publicly. Phase 18.4 begins only after the
owner accepts the bake-off result in a fresh phase and new chat.

### 5. Treat US$3.25 as a ceiling, never as approval

The maximum aggregate **local** reservation for the complete round is
**US$3.25**, across all three candidates, all three cases and every role call.
Only US$3.025 is reachable under the fixed manifest: US$1.87 generation plus
US$1.155 count contingency. It is not US$3.25 per provider, case or attempt.
Provider deposits, prepaid credit,
taxes, account minimums, provider-added framing and provider-account activity
are outside that ledger ceiling and remain real spend. The ledger is not a
provider-account spending cap.

The ceiling is **not spending approval**. Permanent ledger/artifact creation,
credential creation or entry, and credit purchase each require fresh R3 approval
for that exact action. Separately approved account/key preparation does not
authorize credential loading or any provider request, including free quota.
Immediately before execution, fresh R3 confirmation must restate the exact
accounts and credential identifiers, model
IDs, ledger/two-root path digests, the start-window end and run deadline, at
most 33 count-only plus 33 generation
requests with no retries, the three counted-input rules and residual-risk
acceptance, count-pricing evidence/dispositions, the US$1.87 maximum generation
reservation, the US$1.155 maximum count contingency and the US$3.025 combined
maximum inside the US$3.25 local ceiling. It must also state that the ledger
does not cap provider billing and that unpublished count pricing may exceed the
local contingencies. Current account, entitlement, count/generation price,
target-path and source-manifest state must be verified first. Approval of
this ADR, offline code or tests cannot be inferred as that approval.

The structured approval record and its digest are procedural, tamper-evident
evidence that the runtime checked a finite envelope. They are not a signature,
do not authenticate the human owner cryptographically, and cannot create
authority from a file. The actual R3 decision remains an immediate trusted
owner action in the controlling chat or equivalent owner-controlled channel.

### 6. Reserve durably before every dispatch

Phase 18.3 requires its own durable, content-free, one-way accounting ledger in
an owner-selected private location outside the public repository and outside
all Cited and E.V. paths.

Before each generation opportunity, a transaction must durably reserve the fixed
combined count-plus-generation amount for that provider. Only a successful committed
reservation plus its exact fsynced private-checkpoint binding permits the one
matching count-only request. The exact dynamic request is then counted and the
bounded count record is durably appended. Generation authority exists only when
that record passes the approved provider-specific admission rule. Count failure,
threshold breach, cancellation, malformed response, provider error or unknown
billing stops the entire run without generation or retry and keeps the whole
reservation consumed. Actual generation usage is appended for reconciliation
but never refunds capacity during the run. A missing count-pricing disposition,
evidence digest, required risk acceptance, admission record or account/billing
fact stops R3.

The ledger must:

- have a unique run, candidate, case, role and attempt identity;
- reject duplicate identities and any second attempt;
- append terminal outcomes rather than editing history downward;
- fail closed when missing, corrupt, replaced, locked or inconsistent;
- never initialize over, reset, truncate or recreate an existing ledger;
- contain no prompts, sources, output prose or credentials; and
- be reconciled against provider usage and billing evidence before close-out.

The private checkpoint uses a four-event append-only journal around every
generation opportunity: (1) the committed ledger reservation before any remote
request, (2) the count-only admission result before generation, (3) the bounded
generation result or settlement intent before the ledger is settled, and (4)
the post-settlement ledger state. Recovery may accept one settlement that is
ahead of the journal only when the immutable generation-output/settlement-intent
event matches it exactly. It never invents a count or output, releases a
reservation or dispatches a duplicate. If a run stops, the checkpoint, blind
assignment and bounded partial request evidence remain incident/reconciliation
evidence. Successfully finalized
candidate-local terminal paths mark later cases explicitly unattempted. A fatal
global incident deliberately produces no complete audit/blind artifact; its
ledger and private checkpoint are the bounded incident record.

There is one narrow pre-dispatch restart: if the approved process crashes after
creating the private checkpoint but before the first reservation, a read-only
preflight may reopen only that exact bound checkpoint while its journal and the
ledger both remain empty, the private root contains only the fixed checkpoint
child, and the blind root is still absent. This does not create another attempt
or capacity. It is forbidden after any reservation/checkpoint event or after
the permit expires.

At most five generation calls are possible per candidate/case under the frozen
pipeline, but each stage has exactly one count-only request and one generation
opportunity. Across the round that is at most 33 count-only and 33 generation
requests. Client and SDK automatic retries must be disabled for both request
kinds. There is no retry after transport failure, timeout, rate limit, count
failure/threshold breach, schema failure or identity mismatch.

### 7. Isolate credentials and verify the returned provider

If R3 execution is later approved, it uses newly dedicated bake-off credentials
made available only through:

- BLOG_BAKEOFF_GOOGLE_API_KEY
- BLOG_BAKEOFF_OPENAI_API_KEY
- BLOG_BAKEOFF_ANTHROPIC_API_KEY

Adapters must not fall back to generic provider variables. They must not read,
copy or modify Cited or E.V. credentials, product-scoped account resources, environment files,
allowances, budgets or ledgers. A missing dedicated variable fails closed.
Credentials stay out of source, artifacts, logs, command history and model
context, and must never be forwarded across a redirect to another host.

A newly dedicated key may be owned by the human account holder within the
approved bake-off project/workspace. The exclusion is reuse of a generic or
existing personal/product key, not personal ownership of a dedicated key.
Owner-approved shared provider organizations can share billing credits and
aggregate quota; dedicated project/workspace identifiers, least available key
permissions and separate expense records preserve attribution, not independent
billing or protection from all shared-quota interference. Each shared-organization
arrangement requires its own explicit owner approval. The adapter must never
read or alter another product's resources or use an organization-admin key.

The non-secret credential identifiers, approval digest and adapter validation
do not cryptographically prove that a supplied secret belongs to that approved
account/project. After exact R3 permits credential access and before invoking
the launcher, the attended operator must verify each secret-to-account/project
mapping from the owner-controlled console or private credential record, then
populate only the three exact variables above. No extra provider identity probe
is authorized. If the mapping cannot be verified, execution stops; this is not
an accepted residual risk.

Each request carries the exact approved model ID. The adapter records and
validates the provider's explicit returned model or model-version field against
the provider's documented wire representation pinned during preflight. It must
not infer an alias, accept a family name, silently follow a latest pointer or
substitute an available model. Missing or mismatched identity stops that
candidate with no retry.

### 8. Minimize data and control artifacts

Only owner-approved public source bytes and the minimum role input cross a
provider boundary. Private CV material, visitor content, E.V. conversations,
unpublished business material, non-public personal identifiers, credentials and unrelated
repository context are prohibited.

Each case requires public-source and privacy-review attestations plus
deterministic scans before it is locked. Redaction may not occur silently at
dispatch time: if content needs removal, the case is invalidated, rebuilt,
re-hashed and reviewed before any contender runs.

Raw responses are not persisted unrestricted. The allowlisted checkpoint and
audit evidence retains bounded status, returned-model, a response-body digest
only when the complete body was read within the one-megabyte bound,
response-ID digest, usage, latency, normalized-output digest, request digests,
ledger/event links and declared transport normalizations; it excludes headers,
credentials, unrestricted provider error bodies and credential-bearing URLs.
An oversized, missing or failed body read records a null digest rather than a
hash of truncated bytes.
Those provider-identifying artifacts, the blind mapping and identity-free review
artifacts remain within the two approved, access-limited, non-public roots. They
are never CI artifacts and never enter the public repository during Phase 18.3.
After the owner accepts or abandons the decision, raw/provider-identifying
material has a 30-day retention ceiling unless an incident hold applies. The
content-free ledger remains until provider billing is reconciled and the owner
explicitly approves archival or deletion. A later public summary must be
separately reviewed and redacted.

## Alternatives considered

### Select the apparent price/performance front-runner without a bake-off

Rejected. Published capability and price are not evidence that this workflow's
grounding, reviewer recall, security or voice requirements hold.

### Let reviewers see the provider

Rejected. Provider reputation and expected price can bias content scoring. The
audit/review split preserves both a blind judgment and a complete operational
record.

### Reuse Cited or E.V. credentials and accounting

Rejected. Those systems have different purposes, approvals and lifetime
allowances. Reuse would make authorization and spend attribution ambiguous and
could consume production or qualification capacity.

The 21 September amendment permits the separately owner-approved organization
billing/quota arrangement above. It does not permit reuse of another product's
key, allowance, ledger, artifact root or expense record.

### Retry transient or malformed calls

Rejected. Retries alter both cost and opportunity across candidates, can turn an
unknown billed request into a duplicate and weaken the one-way ledger. Failure
is evidence in this bake-off.

### Use different providers for different roles

Rejected for Phase 18.3. It triples attribution and operational complexity and
prevents a clean first comparison. It remains a separate future decision only.

### Publish the best output as the first article

Rejected. Bake-off artifacts are evaluation evidence, not publishable content.
Calibration, human verification and publication are Phase 18.4.

## Security and privacy impact

Live execution would send bounded public source text and prompts to three new
provider boundaries and introduce three credentials. The companion threat model
defines data minimization, injection quarantine, credential isolation,
provider-identity verification, private artifact storage, retention and incident
response. No visitor or private portfolio data is allowed.

The strongest local cost control is pre-dispatch durable reservation followed by
counted input admission. It bounds local admission even when a provider times
out after accepting a request. It does not cap a provider invoice or guarantee
that partial/estimated provider counts match later billing, and it does not
cover deposits, taxes, account-wide activity or compromised credentials.
Provider account controls, explicit residual-risk acceptance and immediate
shutdown remain separate safeguards.

## Accessibility and performance impact

None to the public site. Phase 18.3 has no runtime route, UI, dependency,
deployment or published content. Latency is measured only as bake-off evidence
and cannot degrade the portfolio.

## Operational impact

Offline preparation has created schemas, deterministic case packs, fixed live
adapters, ledger/checkpoint tests, transition normalizers and artifact/scoring
contracts. The paid runner still cannot pass its complete byte, ledger,
approval, artifact-target and credential gates without separately verified
inputs. Safe preparation may not create accounts, keys, permanent ledgers or
approved artifact roots, and may not produce provider traffic.

The attended command boundary is
`node src/lib/blog/pipeline/bakeoff/run.mjs --inspect [config.json]` for the
read-only default and
`node src/lib/blog/pipeline/bakeoff/run.mjs --execute <config.json> --approval-sha256 <reviewed-digest>`
for the explicit execution path. The isolated launcher requires Node 24 or
later with native `registerHooks` and the reviewed installed TypeScript 6.0.3;
these are operator prerequisites and do not change the site's general Node
engine. Source/version checks provide normal manifest/toolchain drift evidence,
not proof against malicious local dependencies. The exact config object contains only
`approval`, `ledgerPath`, `privateArtifactDirectory` and
`blindReviewDirectory`. Inspection does not create the permanent targets or
load credentials. Execution validates the approval and resolved absent paths
before initialization and requires the reviewed approval digest, but neither a
flag nor a digest authenticates OJ or substitutes for the immediate external R3
decision. The launcher source is part of the pinned runtime manifest.
Before importing TypeScript or executing any TypeScript module top-level code,
the native launcher verifies the normalized manifest source plus the two shared,
11 Phase 18.2 and 19 Phase 18.3 byte maps and retains those verified source
bytes for compilation. It then requires the exact reviewed TypeScript 6.0.3
compiler. This closes import-before-verification drift; it does not turn the
ordinary local Node/compiler toolchain into a malicious-dependency proof.

Execution, if separately approved, is manual and attended. Auto-reload,
scheduled execution, background retries and unattended continuation are
prohibited. A suspected credential exposure, privacy leak, wrong model,
unblinding, ledger fault, price drift or billing anomaly stops all dispatch.
The owner then preserves the ledger and bounded evidence, checks provider
usage, and separately approves any credential revocation or destructive cleanup.

## Consequences and trade-offs

- The comparison favors reproducibility and auditability over recovering from
  transient provider failure.
- A failed candidate can lose on reliability without a retry.
- Strict blinding requires duplicate artifact views and delayed provider reveal.
- The US$3.25 local reservation ceiling is conservative but is not an account-level
  spending cap. The counted rules reduce exposure but Google remains partial
  and Anthropic remains estimated; neither is a provider guarantee. If the
  rule, evidence, count-pricing disposition/risk acceptance or accepted margin is unavailable,
  the correct result is to stop, not dispatch optimistically.
- No provider selection or production architecture exists until the owner
  accepts the completed evidence.

## Verification

The 28 September run-window amendment passes read-only launcher inspection
(normalized source `e1421fc5…`, complete manifest `80b7d087…`), all 219 Phase
18.3 bake-off tests across 14 files (214 earlier plus new start-window,
run-deadline, midnight and price-date cases), eslint and both TypeScript
projects. The first exact `npm run test:ci` on the amended source went red:
1,192 of 1,196 unit tests passed and four heavy bake-off tests (one in
`artifacts.test.ts`, three in `harness.test.ts`) exceeded their 60–90 second
timeouts; as the chain stops at the first red stage, the build and browser
stages did not run. Run alone, the same four tests passed in 10–31 seconds.
With no code, test or configuration change, the exact 17-stage rerun passed:
zero-vulnerability audits, 1,196/1,196 unit tests across 72 files, the
production build, 92/92 portfolio browser tests and 46/46 management browser
tests. The unchanged pass points to shared-machine load during the full
parallel suite; the red attempt remains part of the record. No credential,
provider request or permanent execution state was used.

The earlier 23 September pricing/date refresh repinned the catalog and normalized
manifest source. Read-only launcher inspection and all 214 Phase 18.3 bake-off
tests across 14 files pass. The first canonical gate attempt on this checkpoint
passed 72 of 92 portfolio browser tests and failed 20; its bounded last-failed
diagnostic left five navigation and five timing/load failures. With no code,
test or configuration change, a later exact `npm run test:ci` rerun passed all
17 stages: zero-vulnerability audits, 1,191 unit tests across 72 files, the
production build, 92 of 92 portfolio browser tests and 46 of 46 management
browser tests. The unchanged rerun makes transient shared-runner/browser
scheduling load the evidence-supported diagnosis; the first red result remains
part of the record. The 12:08:52 UTC 22 September result remains historical
evidence for the superseded date pin. These were offline checks: no credential
value, provider request or permanent execution state was used. The current
26 September pricing/date refresh also passes read-only launcher inspection,
all 214 Phase 18.3 tests across 14 files, and the exact full 17-stage
npm run test:ci: 1,191/1,191 unit tests, production build, 92/92 portfolio
browser tests, 46/46 management browser tests and zero-vulnerability audits.
No provider or credential action was part of this check.

For historical comparison, the 21 September offline amendment passed the then-
current complete gate with 1,144 unit tests across 70 files, the same 92/46
browser suites, production build and zero-vulnerability audits.

That historical source diagnostic verified the then-current 16 Phase 18.3
runtime modules and execution manifest
`345def047e727415ed9f6ed99d78775b8a8c12220e7b43c5f545a92a6f68861c`.
Phase 18.2 source, cases, prompts and rubric remain unchanged, and all 51
preserved source-checkpoint files still match their original byte hashes.
These checks used mocked provider responses and synthetic local stores, with
no live provider request, credential loading or permanent execution state.

At the 20 September implementation checkpoint no provider-account check or key
preparation had occurred. On 21 September separately owner-approved preparation
established dedicated projects/workspace and credentials. The subsequent R2
amendment is offline-only: no provider request, permanent execution ledger/root,
winner or publication exists. Private evidence records account-specific state;
it must be reverified with the refreshed source/manifest and input-bound
evidence before the separate immediate R3 decision. This public ADR records no
account IDs, emails, balances, credential IDs or secret values.

Before any R3 execution, the owner must receive evidence that:

- the frozen manifest and all three case hashes match;
- the review/audit split and withheld mapping work offline;
- both approved root digests match, the random mapping is checkpointed before
  dispatch, four-event count/generation recovery fails closed and partial incident evidence is
  retained;
- each adapter rejects missing credentials, redirects, wrong model IDs and
  provider-reported identity mismatches;
- the attended operator can verify each supplied secret against the approved
  account/project and credential identifier without an extra provider request;
- automatic retries are disabled and duplicate attempt IDs fail;
- the private ledger survives restart, reserves before dispatch, never refunds
  uncertain attempts and cannot be recreated over existing state;
- fixed generation and count-contingency reservations total at most US$3.025
  inside the US$3.25 round ceiling;
  every newly formed request is counted only after its durable reservation and
  checkpoint binding; OpenAI's exact count is at most 20,169, Anthropic's
  estimate is at most 14,000 with an 8,260 margin, and Google's partial count is
  at most 14,000 with a 15,760 margin plus the 14,000-byte full-body ceiling;
- Anthropic count pricing is evidenced as zero; Google/OpenAI bind reviewed
  `bounded-contingency` dispositions, exact per-call allowances and explicit
  pricing-risk acceptance without claiming a provider guarantee or invoice cap;
- current official prices, model availability, account entitlement and billing
  requirements have been rechecked; and
- the exact R3 target and consequence are restated immediately before action.

Even after those checks, a valid approval record is not evidence that OJ made
the decision. The controlling session must obtain the fresh owner R3 decision
itself before creating the named permanent ledger/roots, accessing credentials
or allowing any count-only or generation request.

## Rollback or migration

Before live execution, rollback is removal of the isolated offline preparation;
there is no provider or financial state to undo.

After any dispatch, stop all further calls, preserve the immutable ledger,
mapping and bounded audit evidence, and reconcile provider usage. Do not reset
reservations, rerun failed stages or delete evidence while billing or an
incident is unresolved. Dedicated credentials may be revoked only as an
explicit owner action. Private artifacts may be deleted after reconciliation,
the retention rule and any incident hold are satisfied. No rollback path may
publish or migrate a bake-off draft.

## Related decisions

- [ADR-0026](0026-gemini-first-blog-agent-models.md) supersedes this comparison
- [Package 18 design](../reviews/blog-multi-agent-system-design.md)
- [Blog provider bake-off threat model](../threat-models/blog-provider-bakeoff.md)
- [Phase 18.3 runbook](../runbooks/blog-provider-bakeoff.md)
- [Engineering Handbook](../ENGINEERING_HANDBOOK.md)
