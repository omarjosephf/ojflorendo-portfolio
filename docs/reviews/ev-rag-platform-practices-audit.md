# RAG management platform practices audit

Reviewed 9 September 2026. Scope: local E.V management candidate, its prepared
PostgreSQL policies/adapter, prior backend qualification evidence and the new
shared theme. **The architecture covers important practices, but the platform is
not yet verified for live production operations.** A successful sample dashboard
is not evidence of a working production conversation pipeline.

The review uses OWASP's pipeline security guidance and Microsoft's staged RAG
design/evaluation guidance as reference frameworks, not a claim of certification.
OWASP emphasizes protecting ingestion, access, retrieval, output and operational
boundaries. Microsoft separates chunking, embedding, retrieval and answer
assessment so a strong score at one stage is not mistaken for overall quality.
[OWASP RAG security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html),
[Microsoft RAG design and evaluation](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide).

## Findings against this candidate

| Practice | Evidence inspected | Assessment and remaining acceptance work |
| --- | --- | --- |
| Operational workspace | Six interactive sections, searchable inbox, transcript/trace, filters, draft editor and real local persistence | Implemented locally. Managed owner workspace now reads actual chats, stores drafts and reports retained questions. Full diagnostic/gap integration remains. Sample events are labelled. |
| Identity and least privilege | SQL grants/RLS; verified-user adapter; private owner allowlist plus AAL2 policy | 42 local PostgreSQL checks, 13 real Supabase checks, seven owner-app checks and eight live operations checks cover isolation, refresh, concurrent retries and synthetic MFA. Live revocation exposed and then verified a database-session fix. Human MFA recovery remains. |
| Production separation | Loopback development launcher; independent page/API gates; production-denial browser tests | Local preview is isolated from production. Do not remove the gate to simulate a live platform. |
| Durable conversations | Stable request IDs, atomic answer/event RPC and conflicting-retry rejection | Guest creation, resume/delete UI, durable generation claims and signed save-only retries are wired into the local chatbot. Six real app integration and six browser checks pass; public activation stays disabled. |
| Knowledge provenance | Required draft provenance, strict input validation, source and indexed-text digests; source-controlled published corpus | Saving a draft does not publish. A publish job with versioned artifacts, evaluation evidence and rollback remains necessary before automated ingestion. |
| Poisoning and unsafe ingestion | Current interface accepts text drafts and does not fetch arbitrary URLs or execute document instructions | No automatic ingestion of user chats. File/URL connectors would need a separate parser, network, scanning and resource-limit review. |
| Corpus and tenant boundaries | Current E.V knowledge is deliberately public; visitor records have per-user access policies | Do not describe this as a private multi-tenant knowledge search. Future private documents need authorization before retrieval and in caches/indexes, with isolation tests. |
| Grounding and output safety | Reviewed system prompt, constrained response contract, allowed citations, app-owned fallback, backend validation | Local regression evidence exists. Human grading of the exact final prompt/model/corpus combination remains; citations alone do not prove support. |
| Chunking and embeddings | 67 actual chunks, exact tokenizer audit, model/index identifiers; 12 local comparison configurations | Keep current E.V baseline. A frozen 38-question assistant-authored check also favours the baseline. Human labels, multi-turn coverage and supported-answer review are needed before claiming general superiority. |
| Honest analytics | UTC windows, distinct sessions, explicit feedback denominator, repeated-question normalization, source exposure | Live report and deletion reconciliation pass with seeded staging data; missing diagnostic coverage and truncation are explicit. Citation frequency measures exposure, not satisfaction or disinterest. Runtime event instrumentation remains. |
| Gap diagnosis | Missing information, retrieval miss, provider failure and policy boundary are separate | A content draft can address missing knowledge. Provider failure requires service work; another model cannot supply missing authoritative facts. |
| Traceability | Outcome, provider route, source IDs, latency and corpus/prompt hash fields | Prepared schema/preview, not live telemetry. Add request-to-save correlation, model/index version, error classification and actionable alerts without secret/raw-text logging. |
| Cost and resilience | Existing bounded fallback and persistent spending candidate; time/size limits in storage transport | Shared admission must qualify on any multi-instance host. Saving a reply must never redispatch the LLM. No unlimited model retries. |
| Retention and recovery | 30-day expiry, hidden expired records, cascading purge and content-free run records | Guest deletion and manual purge pass live. Hourly scheduling, inactive guest cleanup and transactional deletion replay now pass. Isolated full backup restoration and backup expiry still need evidence. A database backup is not a deletion workflow. |
| Accessibility | Shared System/Light/Dark preference; keyboard controls, responsive layout, Axe and CSP browser checks | Verify both color schemes on all sections, with manual screenshot review. Chromium evidence does not imply all-browser or assistive-technology certification. |
| Maintenance and releases | Migration files, threat model, runbook, dependency audits, review packet and owner release boundary | Keep deployment evidence tied to exact artifacts. Restore drills, alerts and real production smoke checks remain. |

## Chunking and embedding decision

Use the source's structure and meaning to choose boundaries, then check the exact
model tokenizer including headings or other text actually embedded. Preserve
source IDs, headings, version, indexed text and token counts. Avoid chunks that
split a necessary qualification from its claim. Overlap is a hypothesis to test,
not a universal percentage. Measure retrieval quality and total context cost.
[Microsoft chunking guidance](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-chunking-phase).

The executed comparison covered two local BGE models, three word-based chunk
settings and both E.V/Cited development datasets. E.V's existing small model
retrieved the expected source in the top four for all 43 answerable development
questions; the larger model missed one follow-up. This does not establish 100%
real-world answer accuracy. The corpus has 67 chunks, none above its 512-token
limit. [Exact comparison and limitations](ev-embedding-comparison.md),
[prompt/token audit](ev-prompt-and-retrieval-review.md).

Retain **BAAI/bge-small-en-v1.5 and the present 180-word/40-word-overlap setting**
for this release candidate. A smaller-chunk configuration gained one top-one hit
on this small development set, which is insufficient reason to change it.
Benchmark semantic boundaries, hybrid retrieval or reranking only when a measured
failure pattern justifies the added complexity. Evaluate Cited separately: its
small dataset cannot establish that the same choice is optimal for both products.

For package 15, freeze an independent set before comparing candidates. Include
ambiguous follow-ups, combined questions, missing facts, conflicting evidence,
untrusted source instructions and critical public claims. Report retrieval recall
and ranking separately from groundedness, completeness, refusal correctness,
latency and cost. AI-generated questions require source-label inspection and are
not human answer review. Any changes made after inspecting results turn that set
into development evidence; reserve a fresh qualification set.

## Platform improvements to prioritize

Finish reliable data collection before building more charts. Reconcile an actual
chat request, saved user message, saved answer, trace and feedback as one inspected
workflow. Show unsaved state and allow a storage-only retry. Ensure logout/expired
sessions cannot expose a previous visitor's transcript.

Make editorial changes inspectable: source provenance, revision, reviewer,
publication state, failed-ingestion state and which deployed index contains the
change. Preserve the published version until its replacement passes retrieval
and answer checks. Public conversation text must never become approved content
automatically. The current draft workflow already preserves that separation.

Add a visible operations view backed by real checks: last successful retention
run, most recent restore rehearsal, ingestion failures, current model/index,
fallback rate and storage errors. Define warning thresholds only after collecting
credible baselines; sample metrics cannot establish them. Audit editorial and
owner-security actions without copying transcript bodies into operational logs.

Supabase anonymous accounts do not clean themselves up automatically. Qualify a
bounded cleanup job for inactive, unlinked guest identities, protecting active
conversations, linked accounts and owners. Include signup anti-abuse controls;
per-conversation limits alone do not stop mass account creation.
[Supabase anonymous-user lifecycle](https://supabase.com/docs/guides/auth/auth-anonymous).

## Release evidence still needed

Packages 13-15 remain implementation/qualification work; package 12 is complete locally and in staging. Owner package 16 remains
the final preview and public-release decision. The audit does not turn those
remaining packages into completed work by documenting their acceptance criteria.

The [delivery checklist](../roadmaps/ev-management-progress.md),
[preview review packet](ev-management-preview-review.md),
[threat model](../threat-models/ev-management.md) and
[operations runbook](../runbooks/ev-management.md) record the current boundaries.
The [long-term platform comparison](ev-long-term-platform-review.md) must inform
staging provisioning and hosting qualification before any new paid commitment.

Live evidence and limitations are recorded in the [storage staging review](ev-storage-staging-review.md).
