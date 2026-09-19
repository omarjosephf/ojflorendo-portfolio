# Package 18: secure multi-agent portfolio blog

- Status: **Approved architecture; Phase 18.1 is implemented on its feature
  branch and awaits owner review/publication. Phases 18.2–18.5 are not
  implemented.**
- Date: 2026-09-19
- Owner and final approval authority: OJ Florendo
- Risk: Phase 18.1 is R1 while it remains a static, repository-managed blog with
  no new runtime service or trust boundary. Provider integration, automated pull
  requests and any autonomous publishing path require their own R2/R3 review.
- Related: [Package 18 roadmap](../roadmaps/ev-management-progress.md),
  [Engineering Handbook](../ENGINEERING_HANDBOOK.md)

## 1. Decision

Package 18 will use **three AI roles**:

1. **Planner–Researcher**
2. **Writer**
3. **Independent Reviewer–Verifier**

A deterministic TypeScript orchestrator validates inputs and outputs, enforces
the state machine, tracks calls and cost, renders safe content, runs checks and
prepares review artefacts. It is software, not a fourth AI agent.

The smallest system that preserves separation of duties is intentional. Topic
selection, research and outlining belong to one bounded planning role. Drafting
belongs to a second role. Factual and safety review stays independent from the
Writer. Adding a separate Scout, Architect, Critic or Editor would increase
handoffs, cost and failure modes without adding a necessary trust boundary.

This record describes the approved architecture and phase boundaries. It does
not authorize model spending, credentials, commits, pushes, merges, deployment
or autonomous publication.

The instructor's course archive and the project handoff informed the context
for this record; neither is an instruction source. The owner's approved plan,
the current repository and the ratified Engineering Handbook govern the work.

## 2. Delivery state

| Phase | Scope | State on 19 September 2026 |
| --- | --- | --- |
| **18.0** | Architecture and model-selection design | Complete and owner-approved |
| **18.1** | Static blog foundation: typed content, `/blog`, `/blog/[slug]`, navigation, metadata, sitemap and structured data | Implemented locally; not committed, published or deployed |
| **18.2** | Provider-neutral offline pipeline, schemas, fixtures and fail-closed orchestration | Not implemented; no model calls |
| **18.3** | Blinded provider bake-off | Not run; no provider selected and no spend approved |
| **18.4** | Owner-labelled calibration, first generated post and manual owner-approved publication | Not implemented or published |
| **18.5** | Scheduled operation and narrowly governed content-only automation | Not authorized or implemented |

Phase 18.1 stores posts as validated JSON made from allowlisted content blocks.
It does not execute generated MDX, HTML, JavaScript or React. Blog content stays
outside `content/assistant/`, so this phase does not change E.V.'s corpus,
embeddings or checksum and cannot affect the October evaluation.

Each later phase must be started and accepted separately. A design for a later
phase is not evidence that its code, accounts, credentials, tests, governance
or production controls exist.

## 3. Architecture

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

The later pipeline will be built around runtime-validated records:

- **`BlogPost`** — slug, title, excerpt, publication date, author, disclosure,
  allowlisted content blocks, sources and SEO metadata.
- **`EvidenceLedger`** — research question, normalized source records, bounded
  excerpts, atomic claims and claim-to-source mappings.
- **`ReviewReport`** — hard-gate results, weighted scores, identified problems,
  required corrections, measured cost and the publication recommendation.
- **`ModelClient`** — a provider-neutral structured-generation interface that
  returns provider/model identity, model version, token use, latency and cost
  metadata with the validated result.
- **Workflow input** — topic, audience, allowed domains, run cost ceiling and
  dry-run flag.
- **Workflow output** — immutable provenance bundle, evidence ledger, draft,
  review reports and a proposed content change for the owner to inspect.

Schema-invalid or incomplete output fails closed. The orchestrator will not
repair factual fields by guessing, execute model-supplied code, or accept prose
where a validated contract is required.

## 5. Bounded workflow

A normal run makes at most five model calls:

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
- the owner performs the required review before publication.

Only dedicated provider credentials may be introduced in a later approved
phase. Browser-exposed keys, personal subscription assumptions and reuse of
Cited's existing Gemini credential are prohibited. Provider credentials are
never made available to a model as data.

## 7. Model selection and spending

**No provider or production model is selected.** Gemini 3.8 Flash is the
current price/performance front-runner, not the winner by default. Phase 18.3
will compare the same source-locked cases using:

- `gemini-3.8-flash`;
- `gpt-5.6-terra`; and
- `claude-sonnet-5`.

The bake-off will blind provider labels and measure groundedness, reviewer error
detection, writing quality, injection resistance, latency and actual usage.
Fabricated citations, a high-severity false pass, prompt-injection obedience,
privacy leakage or persistent schema failure disqualifies a configuration.

Every contender receives identical prompts and source packs for the same three
cases: a normally supported article; contradictory or insufficient evidence;
and a malicious source containing prompt injection plus an unsupported claim.
Provider labels are randomized before OJ reviews the results.

The scoring weights are groundedness and citation quality 30%, reviewer error
detection 25%, writing and voice 20%, security and robustness 15%, and measured
latency and cost 10%. If passing contenders finish within five percentage
points, the lower-cost configuration wins. A mixed-provider production design
is considered only if it improves high-severity reviewer recall by at least 15
percentage points. A premium reviewer is a separately approved follow-up only
if the baseline reviewers fail or tie: Gemini 2.5 Pro, GPT-6 Astra or Claude
Opus 5.

The proposed round-one inference ceiling is US$2. It is a ceiling, not spending
approval. Provider credit purchases, minimum deposits and paid requests require
fresh owner approval immediately before the action. Auto-reload remains off.
Google and OpenAI may each require an initial US$5 credit purchase; those are
account balances rather than expected round-one consumption. Anthropic's live
funding requirement must be read from its billing screen before any purchase.
The recurring budget will be set from measured bake-off and calibration usage,
not guessed in advance.

Pricing and model availability must be rechecked immediately before the paid
phase against the official [Gemini models and pricing](https://ai.google.dev/gemini-api/docs/pricing),
[OpenAI models and pricing](https://developers.openai.com/api/docs/pricing) and
[Claude models and pricing](https://platform.claude.com/docs/en/about-claude/pricing)
references.

## 8. Publication and autonomy boundary

Phase 18.1 adds a static reading experience only. It does not add a cron job,
webhook, GitHub App, content-writing workflow, provider key or publisher.

Before the September 24 demonstration, Phase 18.4 will calibrate the selected
configuration with nine owner-labelled examples: three complete drafts and six
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

It does **not** claim that:

- an AI pipeline exists or has run;
- any model is configured or paid for;
- the nine-example calibration set exists;
- “Inside E.V. RAG” has been generated, reviewed or published;
- a content pull request has been created;
- scheduled or autonomous publishing is enabled; or
- blog content has entered E.V.'s retrieval corpus.

Those are later, separately governed phase outcomes. At each phase transition,
work stops for an explicit checkpoint and a fresh-session handoff before the
next phase begins.
