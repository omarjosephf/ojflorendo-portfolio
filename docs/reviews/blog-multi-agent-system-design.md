# Package 18: secure multi-agent portfolio blog

- Status: **Approved architecture; Phase 18.1 is present in approved commit
  `44313f8651b9a0b62a7a6db498387f0df410e741`. Phase 18.2 is implemented
  locally as an offline saved-fixture pipeline. Phase 18.3 is closed by owner
  decision: the blinded comparison was cancelled before any run, and
  [ADR-0026](../adr/0026-gemini-first-blog-agent-models.md) selects Gemini
  models per agent with OpenAI and Anthropic fallbacks. Phases 18.4–18.5 are
  not started.**
- Date: 2026-09-29 comparison cancelled and models selected (ADR-0026);
  2026-09-26 eventual-role clarification; 2026-09-23 Phase 18.3
  pricing/date-pin R2 refresh; 2026-09-22 counted-
  input/ranking and paid-count R2 amendments; 2026-09-20 implementation
  checkpoint; architecture approved 2026-09-19; future product direction
  approved 2026-09-21
- Owner and final approval authority: OJ Florendo
- Risk: Phase 18.1 is R1. Phases 18.2 and 18.3 safe preparation are R2 because
  they implement architecture, provider, security, privacy and cost-control
  contracts. Permanent ledger/artifact creation, credential access and any
  count-only or generation provider request are R3 and remain unapproved. Automated pull
  requests and any autonomous publishing path require later R2/R3 review.
- Related: [Package 18 roadmap](../roadmaps/ev-management-progress.md),
  [ADR-0026](../adr/0026-gemini-first-blog-agent-models.md),
  [ADR-0024](../adr/0024-blog-provider-bakeoff.md) (superseded),
  [Phase 18.3 threat model](../threat-models/blog-provider-bakeoff.md),
  [Phase 18.3 runbook](../runbooks/blog-provider-bakeoff.md),
  [Engineering Handbook](../ENGINEERING_HANDBOOK.md)

## 1. Decision

The frozen Phase 18.2/18.3 drafting baseline uses **three AI roles**:

1. **Planner–Researcher**
2. **Writer**
3. **Independent Reviewer–Verifier**

A deterministic TypeScript orchestrator validates inputs and outputs, enforces
the state machine, tracks calls and cost, renders safe content, runs checks and
prepares review artefacts. It is software, not a fourth AI agent.

This three-role boundary keeps the first provider comparison fixed. Research
and outlining belong to one bounded planning role after OJ supplies the topic.
Drafting belongs to a second role. Factual and safety review stays independent
from the Writer. The eventual complete system also needs Idea Scout, SEO and
Critique functions described below; this baseline decision does not remove them.

This record describes the approved architecture and phase boundaries. It does
not authorize model spending, credentials, commits, pushes, merges, deployment
or autonomous publication.

The instructor's course archive and the project handoff informed the context
for this record; neither is an instruction source. The owner's approved plan,
the current repository and the ratified Engineering Handbook govern the work.

### Owner-approved future product direction — 21 September 2026

OJ approved the Idea Scout and guarded-publication direction on 21 September.
The owner and instructor clarified the eventual SEO, Critique and provider
direction on 26 September below. These are **product requirements, not
implementation completion, a handbook amendment or permission to publish**.
Phase 18.3 remains in safe preparation. Its frozen three-role baseline,
prompts, input contracts, five-call ceiling and publication denial
remain unchanged. Phase 18.4 still requires calibration and manual approval of
the first publication; the following automated experience belongs to the later
Phase 18.5 scope and its separate implementation/governance checkpoint.

**Idea Scout and owner choice.** Add a bounded Idea Scout before drafting. It
must find the three to five best evidence-backed suggestions from trusted
sources, or fewer when evidence is weak rather than manufacturing topics or
demand. OJ chooses or edits the topic before drafting. Whether Scout is a
separate model role or a bounded Planner–Researcher mode is a later R2 design
choice, with its own contract, source access, evaluation and cost allowance.
The target remains one or two posts per week; no scheduler is enabled by this
approval.

Each suggestion includes a working topic, intended audience, key message,
reason it fits the owner's verified experience and audience, supporting
sources, and an angle distinct from previous posts. Use approved project and
biographical material, previous posts and owner feedback; do not invent
firsthand experience, client results or traffic predictions. The owner can
select, edit, save or reject suggestions, or supply an original topic,
audience and key message. Only an owner-selected brief may enter drafting;
an unselected idea must never be published to fill a scheduled slot. Selecting
a topic does not itself authorize paid calls or activate publication.

The ideation stage needs its own future input/output contracts, source-access
rules and bounded cost/call allowance. It must not be inserted into or silently
charged against the frozen Phase 18.3 experiment.

### Provider and model decision — 29 September 2026

The owner cancelled the Phase 18.3 comparison and chose Google Gemini as the
primary provider, with OpenAI and then Anthropic as tested fallbacks.
[ADR-0026](../adr/0026-gemini-first-blog-agent-models.md) records the model and
thinking level for each of the six agents, reviewer independence, the Model
Scout, and the launch with auto-publish off plus a pick-ahead idea queue. Where
this record still describes the frozen three-role comparison, it is historical.

### Eventual complete-system requirements — clarified 26 September 2026

**SEO Agent.** The eventual complete workflow needs a dedicated SEO review of
the draft. It should check search intent, reader usefulness, title and meta
description, headings, internal and external links, image descriptions,
structured content, originality and technical discoverability. Its advice must
prioritize a useful, accurate article over keyword placement or ranking claims.
It cannot add unsupported facts, change cited evidence, waive the independent
Reviewer's findings or approve publication. Its exact input/output contract,
place in the revision loop, evaluation and cost allowance need separate review
after Phase 18.3; no SEO call is part of the frozen comparison.

**Critique Agent.** After every workflow attempt, including a held, rejected or
aborted attempt, Critique reviews the available run evidence and gives each
participating agent a concrete, evidence-backed lesson: what to remember or
change for the next post. If a role did not run, the record says so instead of
inventing a lesson. OJ reviews the lessons before any proposed prompt, rubric
or workflow change. Critique cannot silently rewrite prompts, relax hard safety
gates, alter past scores or authorize publication. Its contract, evidence access,
retention, evaluation and cost allowance belong to a later approved design;
it does not run in Phase 18.3. A global privacy, credential or billing stop
forbids another provider call; record the pending critique and complete it only
through a separately safe, owner-reviewed path.

The intended complete sequence is `Idea Scout → OJ chooses/edits a brief →
Planner–Researcher → Writer → SEO Agent → independent Reviewer–Verifier and
deterministic checks → publication decision under the active phase policy →
Critique lessons for each participating agent`. Critique also reviews stopped
attempts using only the evidence that exists, subject to the global stop rule.
The owner-controlled manual publication stage in Phase 18.4 and the separately
governed Phase 18.5 publication policy below remain distinct.

**Eventual publication policy.** After calibration and explicit activation of
the narrowly scoped Phase 18.5 policy, the intended flow is:

`suggest ideas → owner chooses/edits → research → write → SEO review →
independent review and deterministic checks → publish in an approved slot or
hold for review → post-attempt Critique lessons`

| Evaluated result | Intended future action |
| --- | --- |
| Editorial score strictly above 75, every mandatory check passes, verification is complete, and the exact content is within the owner-approved publication scope | Publish automatically in an approved slot, once the calibrated policy is activated |
| Editorial score 75 or below, with no critical failure | At most one quality-only revision and re-review; route unresolved work to the owner |
| Any critical failure, missing evidence, incomplete verification, unknown required result or publishing-permission failure | Hold publication regardless of score; do not downgrade a mandatory gate to earn an aggregate pass |

Exactly 75 does not pass, and rounding must not turn a non-passing result into
a pass. Factual support, citation integrity, privacy, prohibited claims, safe
content and publishing permissions are mandatory checks, not weaknesses that
style points can offset. The Writer cannot approve its own draft. Material
changes to an evaluated draft require new checks before publication.

The score is an editorial rubric result, **not a probability of correctness**.
The aggregate formula and 75 cutoff are provisional pending evidence; the
current implementation has no score-triggered publisher. Article scoring is
separate from the owner-scored provider-comparison rubric in section 7.
Before activation, compare would-publish decisions against owner judgments on
representative, borderline and deliberately flawed content, retaining separate
examples for tuning and validation. Measure unsafe false approvals as well as
unnecessary holds. The initial nine-example Phase 18.4 set does not by itself
establish readiness for unattended publication. If the proposed cutoff fails
validation, return the policy for owner review rather than silently enabling
it or changing the threshold.

Keep occasional human spot-checks, retained decision evidence and a pause
control after activation; revalidate material model, prompt or rubric changes.
The accepted governance amendment, ADR, least-privilege publisher, alerting,
rollback and content-only release boundary in section 8 are still prerequisites.
The initial human-reviewed stage is not a permanent requirement to approve
every future qualifying post, and the future goal is not authority to bypass
today's release gate.

## 2. Delivery state

| Phase | Scope | State at 23 September 2026 checkpoint |
| --- | --- | --- |
| **18.0** | Architecture and model-selection design | Complete and owner-approved |
| **18.1** | Static blog foundation: typed content, `/blog`, `/blog/[slug]`, navigation, metadata, sitemap and structured data | Present in approved commit `44313f8651b9a0b62a7a6db498387f0df410e741`; not published or deployed by Phase 18.2 |
| **18.2** | Provider-neutral contracts, saved-fixture adapter, runtime schemas and fail-closed orchestration | Implemented locally and tested offline; uncommitted, no provider/model request, credentials, spend or content write |
| **18.3** | Provider and model selection (originally a blinded bake-off) | Closed 29 September 2026 by owner decision. The comparison was cancelled before any run: no permanent ledger/root, credential access, provider request or spend. [ADR-0026](../adr/0026-gemini-first-blog-agent-models.md) records the Gemini models per agent and the OpenAI/Anthropic fallbacks |
| **18.4** | Owner-labelled calibration, first generated post and manual owner-approved publication | Not implemented or published |
| **18.5** | Scheduled operation and narrowly governed content-only automation | Not authorized or implemented |

Phase 18.1 stores posts as validated JSON made from allowlisted content blocks.
It does not execute generated MDX, HTML, JavaScript or React. Blog content stays
outside `content/assistant/`, so this phase does not change E.V.'s corpus,
embeddings or checksum and cannot affect the October evaluation.

Phase 18.2 is isolated under `src/lib/blog/pipeline`. Its public runner accepts
plain saved-fixture data and constructs the only executable adapter internally;
callers cannot provide executable clients. It replays model-shaped responses so
the three-role state machine can be tested without network access, credentials,
provider billing or a repository write. It returns frozen draft/review bundles
only, with publication always denied.

Phase 18.3 is isolated under `src/lib/blog/pipeline/bakeoff`. It fixes three
source-locked cases and exact provider/request contracts, re-hashes the two
imported shared blog validators plus all 11 Phase 18.2 and 19 Phase 18.3 runtime
modules, and implements single-use dispatch, one-way
durable combined count-plus-generation reservations, counted input admission,
a crash-recoverable four-event private checkpoint, blinded artifacts and score
lock before reveal.
Its launcher defaults to read-only `--inspect`; explicit `--execute` requires a
reviewed config and approval digest, neither of which authenticates owner
approval. Its native bootstrap verifies the normalized manifest and all pinned
source bytes before importing TypeScript or executing TypeScript module code,
then compiles only those verified bytes with exact TypeScript 6.0.3. The paid
boundary remains unopened: account entitlement, billing mode, quota, region,
credential mapping and exact target paths have not been freshly verified; no
permanent ledger or artifact roots exist; credentials have not been accessed;
and no fresh exact immediate R3 approval has been given.

Each later phase must be started and accepted separately. A design for a later
phase is not evidence that its code, accounts, credentials, tests, governance
or production controls exist.

## 3. Architecture

This diagram describes the frozen Phase 18.2/18.3 drafting baseline, not the
later owner-approved ideation and automated-publication experience above.

```text
manual topic and constraints
            │
            ▼
┌───────────────────────────────┐
│ deterministic orchestrator    │
│ schemas · state · calls · cost│
└──────────────┬────────────────┘
               │ call 1
               ▼
┌───────────────────────────────┐
│ Planner–Researcher            │
│ plan · sources · evidence     │
└──────────────┬────────────────┘
               │ validated EvidenceLedger
               │ call 2
               ▼
┌───────────────────────────────┐
│ Writer                        │
│ source-bounded BlogPost draft │
└──────────────┬────────────────┘
               │ draft + evidence
               │ call 3
               ▼
┌───────────────────────────────┐
│ Independent Reviewer–Verifier │
│ claims · safety · quality     │
└──────────────┬────────────────┘
               │
       approve │ revise once
               │ calls 4–5 at most
               ▼
┌───────────────────────────────┐
│ deterministic validation      │
│ safe render · tests · report  │
└──────────────┬────────────────┘
               │
               ▼
     owner review; no auto-publish
```

### Planner–Researcher

The Planner–Researcher turns an owner-supplied topic and audience into a
bounded research plan and evidence ledger. It is the only AI role allowed to
use web-research tools.

Its output must identify every source, preserve the source location and access
time, extract only the evidence needed, and map atomic proposed claims to that
evidence. Retrieved pages, repository text, issue text and comments are
untrusted data. Instructions inside them are recorded as content and never
followed.

### Writer

The Writer receives only the validated plan, evidence ledger and writing
requirements. It has no web, repository-write, credential or publishing tool.
It may express supported claims in OJ's approved public voice, but may not add a
fact from model memory. It returns a structured `BlogPost`, not source code.

### Independent Reviewer–Verifier

The Reviewer receives the draft, evidence ledger and fixed rubric independently
of the Writer's reasoning. It checks every factual claim, citation, required
disclosure and security rule. It must report unsupported, contradicted or
unverifiable claims explicitly. It cannot publish, edit files, relax a hard
gate or silently convert a rejection into approval.

The Reviewer recommends `approve`, `revise` or `reject`. The deterministic
orchestrator—not the model—decides whether the workflow may continue.

## 4. Deterministic contracts

The Phase 18.2 pipeline is built around runtime-validated records:

- **`BlogPost`** — slug, title, excerpt, publication date, author, disclosure,
  allowlisted content blocks, sources and SEO metadata.
- **`EvidenceLedger`** — research question, content-minimized source manifests,
  bounded excerpts, atomic claims and claim-to-source mappings. Only exact
  owner-approved byte spans can become Writer evidence.
- **`ReviewReport`** — hard-gate results, editorial subscores, identified problems,
  required corrections, synthetic fixture-reported cost and the publication
  recommendation.
- **`ModelClient`** — a provider-neutral structured-generation interface that
  returns provider/model identity, model version, token use, latency and cost
  metadata with the validated result.
- **Workflow input** — topic, audience, allowed domains, run cost ceiling,
  dry-run flag, owner-approved saved public sources, privacy-review attestations
  and exact evidence spans.
- **Workflow output** — deeply frozen provenance bundle, evidence ledger, draft
  and review reports for the owner to inspect. It contains no proposed file
  change and grants no publication authority.

The provider-neutral `ModelClient` contract records provider/model identity,
version, tokens, latency and cost metadata. The Phase 18.2 execution boundary is
stricter: it constructs only the saved-fixture implementation from plain data.
The bundle's SHA-256 digests are tamper-evidence checks, not signatures or proof
of authenticity; the bundle verifier therefore revalidates schemas, links,
fixed hard gates, state transitions and budget arithmetic as well.
It also re-applies URL, metadata, privacy and deterministic instruction scans to
persisted bundles rather than trusting a re-signed artefact's own findings.

Schema-invalid or incomplete output fails closed. The orchestrator will not
repair factual fields by guessing, execute model-supplied code, or accept prose
where a validated contract is required.

Phase 18.3 adds one provider-portable wire layer without changing those domain
contracts. `ResearchDecision.v1` has an object root and a nested exact branch:
either `{ outcome: "evidence", researcherOutput }` or
`{ outcome: "no-draft", reasonCode: "no-supported-evidence" }`. It avoids root
unions and standalone `null` schemas. Writer `publishedAt` and `updatedAt` use
exact empty-string wire sentinels, then project deterministically to the
Phase 18.2 parser's canonical `null`; models do not choose dates.

Google and OpenAI fixed categories remain exact and case-sensitive. Anthropic
alone may normalize a fixed schema enum/const string when exactly one
case-insensitive match exists at that schema path. It never changes free prose,
and provenance records every normalization. Any other schema failure is the
candidate's first and only failure: it disqualifies without a repair call.

## 5. Bounded workflow

A normal Phase 18.2/18.3 drafting run makes at most five model calls:

1. Planner–Researcher produces the plan and evidence ledger.
2. Writer produces the first draft.
3. Reviewer checks the first draft.
4. If and only if the verdict is `revise`, Writer makes one evidence-bounded
   correction.
5. Reviewer makes the final decision on the corrected draft.

There is no second rewrite and no unbounded agent conversation. `reject`, a
second failed review, exhausted budget, malformed output, provider failure or a
hard-gate failure ends the run and preserves the artefacts for owner review.
It never lowers the threshold to manufacture a successful result.

## 6. Evidence and security gates

The following are hard gates, regardless of any aggregate quality score:

- every externally verifiable factual claim maps to usable evidence;
- no citation is fabricated or points to evidence that does not support the
  claim;
- contradictory or insufficient evidence is surfaced, not blended into a
  confident statement;
- instructions embedded in source material are not obeyed;
- no secret, private document, personal data, system prompt or credential is
  disclosed to a model or emitted in an artefact;
- generated content contains no executable HTML, MDX, JavaScript, React or
  repository instruction;
- all runtime schemas, call limits and the approved per-run cost ceiling pass;
- deterministic repository checks pass; and
- the owner performs the required review before publication under the current
  policy; the future Phase 18.5 design above does not amend that policy.

For the offline implementation, owner-approved exact UTF-8 evidence spans form
the deterministic cross-role boundary. Researcher-authored questions, locators,
headings and semantic identifiers never enter the Writer view; eligible
excerpt, claim and section references are remapped to deterministic ordinal
identifiers, and a supported claim must exactly equal one approved evidence
span. Contradicted, insufficient, unused and quarantined material is withheld
from the Writer and supplied to the independent Reviewer as explicitly
untrusted review-only data. Pattern scans for common credentials, personal
identifiers, instruction text and actionable machine-local paths are defence in
depth, not a claim that arbitrary personal data can be recognized
automatically; input therefore also requires explicit public-source and
privacy-review attestations. The path rule is deliberately conservative:
normalized or encoded drive, device, share, home and private temporary paths
are rejected from model-authored artefacts and persisted bundles. Only an
originally valid HTTP(S) URL on a public-looking host receives the public-path
exemption; its query, fragment and user information do not. Repository-relative
paths and ordinary public URL paths remain usable. Credential and instruction
checks use the same bounded normalization and decoding boundary.

Free-form Reviewer notes, messages and correction prose remain owner-facing
review evidence and never return to the Writer. The single revision receives
only deterministic allowlisted signals: citation indexes plus fixed
assessments, draft locations, fixed issue categories and severities, and a
correction count. This prevents quarantined instructions from being echoed
across the Reviewer-to-Writer boundary.

Phase 18.2 deliberately has no separate “no evidence” artefact: if a source pack
cannot produce at least one supported, owner-approved outline claim, research
fails closed before the Writer runs. Phase 18.3 preserves that boundary through
its outer `ResearchDecision.v1` no-draft branch. The harness records the fixed
reason, makes no Writer or Reviewer call for that case, and does not manufacture
an empty Phase 18.2 draft.

Phase 18.3 may access only separately named dedicated provider credentials after
its fresh exact R3 gate. Browser-exposed keys, personal subscription assumptions
and reuse of Cited's or E.V.'s credentials are prohibited. Provider credentials
are never made available to a model as data.

## 7. Model selection and spending

**No provider or production model is selected.** OJ's 26 September preference
is Gemini as the eventual primary provider, with OpenAI and Anthropic as
candidate backup companies. That preference is not a bake-off score or a
selected model. The
blind results may support another outcome or no winner; backup order remains
undecided until measured results and owner review. The locked candidates are
[`gemini-3.8-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash),
[`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
and
[`claude-sonnet-5`](https://platform.claude.com/docs/en/models/sonnet-5/whats-new-sonnet-5).
The same source-locked supported, no-evidence and adversarial cases are assigned
to random opaque labels before any dispatch. The private mapping is checkpointed
under one approved audit root; OJ receives identity-free artifacts under the
second approved root.

The bake-off measures groundedness, reviewer error detection, writing quality,
injection resistance, latency and generation usage under the locked tariff.
Fabricated citations, a
high-severity false pass, prompt-injection obedience, privacy leakage or one
schema failure disqualifies a configuration. A candidate-local failure retains
bounded partial evidence and explicitly marks later cases unattempted. A fatal
global incident intentionally stops before a complete blind artifact and
retains only its private ledger/checkpoint evidence.

The scoring weights are groundedness and citation quality 30%, reviewer error
detection 25%, writing and voice 20%, security and robustness 15%, measured
latency 5% and modeled generation-tariff cost 5%. Passing candidates rank by
total descending, the 90-point quality/security subtotal descending, latency
ascending, that same modeled generation cost ascending and then stable blind
label. Count contingencies are one-way budget controls, not scored usage. The
result therefore cannot support a claim that the winner produced the cheapest
total provider invoice. There is no cheapest-first five-point band. A
mixed-provider production design
is considered only if it improves high-severity reviewer recall by at least 15
percentage points. A premium reviewer is a separately approved follow-up only
if the baseline reviewers fail or tie: Gemini 2.5 Pro, GPT-6 Astra or Claude
Opus 5.

Official list prices were rechecked on 23 September 2026: Gemini $0.75 input,
$0.075 cached input and $3.75 output including thinking; Terra $2 input, $0.20
cached input, $2.50 cache write and $12 output below its long-context threshold;
Sonnet $2 input, $2.50 five-minute/$4 one-hour cache write, $0.20 cache hit and
$10 output, all per 1M tokens. See the official
[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing),
[OpenAI pricing](https://developers.openai.com/api/docs/pricing) and
[Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing).
The plan permits at most 33 count-only and 33 generation requests with no
retries. The fixed generation reservations are Google US$0.33, OpenAI US$0.825
and Anthropic US$0.715, totaling at most US$1.87. The paid-count amendment adds
bounded one-way contingencies of US$0.33 for Google and US$0.825 for OpenAI;
Anthropic's count endpoint is documented as zero-priced. The US$1.155 maximum
count contingency makes the combined local authority US$3.025 inside a US$3.25
round ceiling. Each newly formed dynamic request is counted after its durable
reservation/checkpoint binding and immediately before generation; all 33 cannot
be pre-counted because later role requests contain earlier validated output.

OpenAI's exact count must be at most 20,169 tokens. Anthropic's estimate must be
at most 14,000 with an 8,260-token margin. Google's partial count must be at
most 14,000 with a 15,760-token margin and its complete serialized generation
body must also stay at or below 14,000 UTF-8 bytes. A failed count or any bound
breach terminates the whole run without generation or retry. Google/Anthropic
residual risk is explicit; these rules and margins are not provider guarantees.
The ceiling is not approval or a provider-account cap.

Exact-endpoint zero-price evidence is not required for every count endpoint.
Anthropic binds the reviewed `documented-zero` disposition. Google and OpenAI
bind `bounded-contingency` dispositions, their exact per-attempt allowances and
explicit unpublished-price risk acceptance. Google's billing FAQ describes
`GetTokens` as unbilled, but no authoritative mapping to the selected
`models.countTokens` endpoint was established; OpenAI also lacks an explicit
price for its selected endpoint. The amendment does not assert that either
endpoint is free, charged, or guaranteed to fit the local contingency. Missing
or contradictory pricing evidence, disposition or risk acceptance still blocks
R3.

Fresh account/project/workspace entitlement, billing mode and readiness,
quota/rate-limit availability, region, exact non-secret credential identifiers,
key-to-account mapping, and the absence and digests of the exact permanent
ledger/private/blind paths remain owner-controlled preflight facts. Permanent
ledger/two-root creation, credential access and any count-only or generation
request require a fresh exact R3 confirmation immediately before the action.
The structured approval record is procedural tamper evidence, not cryptographic
proof of owner authorization. Current official pricing and account screens must
be rechecked again at that gate.

Credential labels, the approval digest and syntactic key validation also do not
prove that a supplied secret belongs to the approved account/project. After R3
permits credential access and before launching, the attended operator must
verify that mapping from private owner-controlled evidence and populate only the
three exact dedicated variables. No extra provider identity probe is implied;
an unverifiable mapping blocks execution. Google zero modeled cost depends on
that verified project binding and is not invoice evidence.

## 8. Publication and autonomy boundary

Phases 18.1 and 18.2 add a static reading experience plus isolated offline
drafting tests. Phase 18.3 safe preparation adds fixed server-side provider
adapters and private experiment controls, but they are not imported by the
public blog, cannot pass their gates without a fresh permit and have not sent a
request. These phases add no cron job, webhook, GitHub App, provider key,
production content-writing runtime or publisher. Neither harness writes a post
file even when a saved Reviewer response recommends approval.

The planned Phase 18.4 will calibrate any selected configuration with nine
owner-labelled examples: three complete drafts and six
focused pass/fail excerpts. A score of 75 is provisional until that evidence is
measured, and hard gates always override the aggregate score.

The demonstration will use a manual `workflow_dispatch` and produce review
artefacts plus a content-only proposal. A content-only pull request may be
created only after the owner reviews and approves that action.
The first planned generated article is **“Inside E.V. RAG,”** covering the
180-word chunk target, 40-word overlap, `BAAI/bge-small-en-v1.5`, its 512-token
limit and measured cost assumptions. Its public byline will be **OJ Florendo**
with a concise, truthful disclosure that AI assisted and a human verified it.

Any pull request, merge or production deployment remains behind the existing
owner-controlled release process. The exact head commit and required checks
must be verified, and publication requires explicit owner approval. A model
verdict cannot substitute for that approval.

Unattended scheduling belongs only to Phase 18.5, after successful calibration,
an accepted governance amendment and ADR, least-privilege GitHub App design,
alerting, rollback and a narrowly defined content-only merge policy. Normal
code, secrets, releases and production actions remain owner-gated. Nothing in
this design authorizes spoofing or bypassing the repository's approval gate.

## 9. Acceptance boundaries

Phase 18.1 is complete only when the static blog routes, safe content validation,
responsive and keyboard-accessible rendering, metadata, sitemap and
`BlogPosting` structured data pass their relevant checks and the E.V. corpus
checksum is unchanged.

Phase 18.2 is complete only when saved fixtures prove the three independent
roles, exact evidence/citation boundaries, injection quarantine, privacy
preflight, one-way budget reservations, fixed three- or five-call paths,
fail-closed errors, bundle revalidation and the permanent publication block.
The complete repository gate must pass and the E.V. corpus/checksum must remain
unchanged.

Phase 18.3 safe preparation is implemented only when offline evidence covers
the complete Phase 18.2/18.3 byte manifests, exact provider wrappers, nested
research branches, timestamp projection, Anthropic-only categorical
normalization, first-schema-failure disqualification, 33-count/33-generation
request ceiling, US$1.87 generation-reservation envelope, US$1.155 count
contingency and US$3.025 combined authority inside the US$3.25 local ceiling,
one-way local ledger, exact/estimate/partial counted-input rules and the three
count-pricing dispositions with required risk acceptance,
two-root/checkpoint boundary, pre-dispatch random mapping,
four-event recovery, bounded incident evidence and score lock before reveal.
That is not completion of the phase. Completion also needs the separately
authorized attended run, billing reconciliation, blind owner scores,
disqualifier decisions and a recorded reveal/selection or honest no-winner
outcome.

The earlier 22 September counted-input checkpoint pinned the then-current
source/launcher bytes, normalized manifest-source SHA-256
`14a0231fb676a2398ce7d9e9be9ac61560c86d725a417e38461d0cf1ef95acf1` and
complete-manifest SHA-256
`bac162886754e2c04287c856be802f4f5e98323b3de3c5ee5b545caf2ecb5762`.
At 09:37:43 UTC on 22 September, `npm run test:ci` exited 0 across all 17
stages on that historical checkpoint: 1,189 unit tests in 72 files (322.88
seconds), production build, 92 portfolio browser tests (1.2 minutes), 46
management browser tests (3.8
minutes), and zero-vulnerability production/full audits. A focused 28-test
runner/manifest/source-integrity pass included three tampered-launcher copies
whose marker never executed; independent read-only review found no remaining
concrete approval-boundary defect in its reviewed scope. Those hashes and test
results are historical evidence, not verification of the paid-count amendment
or the current source bytes. The 12:08:52 UTC 22 September complete gate also
passed on the now-superseded pricing date pin with 1,191 unit tests in 72 files,
production build, 92 portfolio browser tests, 46 management browser tests and
zero-vulnerability audits. The current 23 September checkpoint uses normalized
manifest-source SHA-256
`63b8073637d9e9dba32c97610cca7434836b39d410d3ddf8c368439fe5b3f1cb` and
complete-manifest SHA-256
`0411ba6f06fe1e8cff0122237c75bb775c5012b9a806b5f72405c0a568b11b71`.
Read-only launcher inspection and all 214 Phase 18.3 bake-off tests across 14
files pass. The first canonical gate attempt on this checkpoint failed 20 of 92
portfolio browser tests; its bounded last-failed diagnostic retained five
navigation and five timing/load failures. No code, test or configuration changed
before the exact complete rerun passed all 17 stages, including 1,191 unit tests,
the production build, 92 of 92 portfolio browser tests, 46 of 46 management
browser tests and zero-vulnerability audits. The failures were non-reproducible
transient shared-runner/browser scheduling load, and the first red result remains
preserved.

These offline results do not satisfy the fresh account/quota/billing/key/path
preflight, grant the exact immediate R3 approval, or authorize execution.

On 26 September the read-only launcher inspection still passed. The first
`npm run test:ci` attempt stopped at unit tests: 53 adapter tests paired the
23 September catalog price date with the live 26 September clock, causing the
runtime freshness guard to reject synthetic approvals; three other tests timed
out under parallel load. A test-only fixture clock was pinned to the catalog
date without changing the production guard, assertions, timeouts or workers.
All four affected files then passed 90/90 focused tests, and the exact full
gate rerun passed all 17 stages: zero-vulnerability audits, 1,191/1,191 units,
the production build, 92/92 portfolio browsers and 46/46 management browsers.
The catalog's 23 September price date still blocks a 26 September R3 approval
until official prices are freshly reviewed and the source chain repinned.

Phases 18.1–18.3 do **not** claim that:

- a provider or production model has run;
- any account, credential or model is approved or paid for;
- any permanent bake-off ledger or artifact root exists;
- any score, reveal or winner exists;
- the nine-example calibration set exists;
- “Inside E.V. RAG” has been generated, reviewed or published;
- a content pull request has been created;
- scheduled or autonomous publishing is enabled; or
- blog content has entered E.V.'s retrieval corpus.

Those are later, separately governed phase outcomes. At each phase transition,
work stops for an explicit checkpoint and a fresh-session handoff before the
next phase begins.
