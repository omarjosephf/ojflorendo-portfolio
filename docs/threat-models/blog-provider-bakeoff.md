# Blog provider bake-off — threat model

- **Status:** Historical. The comparison was cancelled on 29 September 2026
  before any run ([ADR-0026](../adr/0026-gemini-first-blog-agent-models.md)).
  No provider call, credential access or spend occurred. This model does not
  cover the production blog pipeline, which needs its own threat model.
  Previously: accepted and implemented for Phase 18.3 safe preparation
- **Date:** 2026-09-28 R2 run-day price-date and run-window amendment;
  2026-09-26 read-only pricing/date-pin refresh; 2026-09-23 prior refresh; 2026-09-22 counted-input/
  ranking and paid-count-budget R2 amendments; 2026-09-21 free-tier/account-
  boundary amendment; initial implementation 2026-09-20, decision accepted
  2026-09-19
- **Owner:** OJ Florendo
- **Risk class:** R2 architecture, security, privacy, provider and cost boundary
- **Decision record:**
  [ADR-0024](../adr/0024-blog-provider-bakeoff.md)
- **Runbook:**
  [Phase 18.3 blog provider bake-off](../runbooks/blog-provider-bakeoff.md)
- **Scope:** The attended, blinded comparison of exactly gemini-3.8-flash,
  gpt-5.6-terra and claude-sonnet-5. It does not cover publication, production
  integration, scheduling or a mixed-provider design

## Security objective

Phase 18.3 may compare model behavior without exposing private data, borrowing
another product's authority or using shared billing without owner approval,
obscuring which model actually answered,
letting an experiment publish content, or spending more than the separately
approved amount.

Phase 18.2 is frozen. Its fail-closed schemas, exact-evidence boundary,
three-role separation, maximum five-call path, deterministic scans, immutable
bundle and permanent publication denial remain controls. This threat model adds
only the provider, credential, accounting, blinding and evidence-retention
boundaries needed for Phase 18.3.

The checked-in approval, checkpoint, score-lock and reveal records are
procedural, tamper-evident records. None is a digital signature or cryptographic
proof that OJ authorized an action. A fresh R3 decision must still be obtained
in the controlling owner interaction immediately before the named external
action.

## Assets

- The owner's money and the integrity of the US$3.25 aggregate run ceiling
- Truthful count-endpoint pricing and the integrity of counted input-admission
  evidence
- Dedicated provider credentials and account security
- Cited and E.V. credentials, allowances, budgets and ledgers, which are
  explicitly outside this experiment
- The frozen Phase 18.2 code, prompts, schemas, rubric and state machine
- The exact bytes of the three source packs and their owner-approved evidence
  spans
- Truthful provider/model attribution and comparable usage, cost and latency
  measurements
- Reviewer independence and the secrecy of the blind candidate mapping until
  scores lock
- Private raw responses, audit artifacts and review artifacts
- Public portfolio integrity: no draft, branch, pull request or deployment may
  escape the experiment
- Owner-approved public facts and the privacy boundary excluding non-public personal,
  confidential and visitor data

## Trust boundaries

**B1 — Owner-approved case preparation.** Public sources become content-addressed
case packs with exact usable spans, privacy attestations and deterministic scan
results. A source is untrusted text even when its URL is public.

**B2 — Frozen offline orchestrator.** The Phase 18.2 state machine decides what
each role sees, validates outputs, enforces the three- or five-call path and
returns review-only bundles. Phase 18.3 wraps it but does not tune it.

**B3 — Bake-off dispatcher and durable ledger.** The dispatcher is the only
component allowed to reach a provider. A separate private ledger grants one
count-only request only after a fixed conservative combined reservation and
its exact private checkpoint binding commit durably. A generation is permitted
only after the count result passes the approved admission rule and its distinct
checkpoint event is durable. The ledger holds accounting metadata, never
content or credentials, and is not a provider-account spending cap.

**B4 — Credential injection.** If separately approved, an attended local process
receives only BLOG_BAKEOFF_GOOGLE_API_KEY,
BLOG_BAKEOFF_OPENAI_API_KEY and BLOG_BAKEOFF_ANTHROPIC_API_KEY. Generic,
Cited and E.V. variables are not read.

A dedicated key may be user-owned within the approved bake-off project/workspace.
It cannot be an existing general-purpose personal/product key or an organization
admin key. Separately owner-approved shared organizations retain shared billing,
quota and administrative visibility; they do not grant the dispatcher access to
another product's resources. Exact account and credential identifiers, settings,
balances and quota evidence remain private, outside this public repository.
The public approval labels, their digest and a syntactically valid secret cannot
cryptographically prove that the supplied value belongs to the approved
account/project. After exact R3 permits credential access and before launching,
the attended operator must verify that mapping from the owner-controlled console
or private credential record and populate only the three approved variables. No
extra provider identity probe is authorized. An unverifiable mapping blocks the
run; it is not an accepted residual risk.

**B5 — External provider APIs.** Google, OpenAI and Anthropic receive bounded
count-only and generation payloads containing role prompts and source-derived
content. Count results, generation output, headers, usage and model identity are
untrusted until validated. Redirect destinations are also untrusted.

The fixed payload includes synthetic case material and the public author name;
later stages include validated model outputs. It does not read live repository
or private user material into prompts. Public provider terms were reviewed on
21 September 2026 in
[ADR-0024](../adr/0024-blog-provider-bakeoff.md#public-terms-and-privacy-evidence--21-september-2026).
Free quota and `store: false` do not establish zero retention. Anthropic's
`inference_geo: global` does not promise regional residency. Account-specific
terms, region, training and retention settings require private preflight evidence.

**B6 — Private audit store.** One owner-approved root holds exact provider
identity, bounded request/response metadata, usage, cost, outcome, hashes and
the candidate-label mapping. Its fixed `checkpoint/` child is part of that root,
not a third storage target. It is not a public repository or CI artifact store.

**B7 — Blinded review store and human review.** OJ scores normalized artifacts
under a second owner-approved root, identified only by opaque labels. Provider,
price, latency, token and request metadata stay outside this boundary until
every score and disqualification decision is durably locked and privately
hash-anchored.

There is no trust boundary to content/blog/posts, GitHub, Vercel, E.V., Cited or
a scheduler. Reaching any of them is a control failure.

## Data flow

1. An offline preparation task produces three source-locked cases: supported,
   no evidence, and adversarial injection/unsupported claim.
2. A manifest hashes the cases, approved spans, both imported shared blog
   validators, all 11 Phase 18.2 runtime modules, prompts, schemas, rubric,
   provider-neutral parameters and all 19 Phase 18.3 runtime modules that can
   affect paid dispatch or durable evidence. The manifest
   raw-hashes the separate source-integrity verifier; that verifier hashes the
   manifest source after zeroing exactly one inert self-digest literal. The
   complete manifest digest is also bound independently by the ledger and
   checkpoint. Before TypeScript is imported or any TypeScript module top-level
   code executes, the native launcher verifies the normalized manifest and all
   listed source bytes, then compiles only those verified in-memory sources with
   exact TypeScript 6.0.3. Both source checks run again at paid entry and
   immediately before every fetch. This couples review/drift across layers but
   is not a signature or protection against coordinated edits or a malicious
   local toolchain.
3. The owner verifies official model, generation and count endpoint prices,
   account entitlement, declared billing mode, quota and target state, then
   gives or withholds a fresh R3 decision. Dedicated account/key preparation and
   the R2 counted-admission/paid-count approval do not approve a run. Google and
   OpenAI use bounded contingencies because their exact count prices remain
   unpublished; R3 requires fresh evidence and explicit acceptance, not a zero-price claim.
4. The executor validates the approval, reviewed digest and resolved absent
   ledger/artifact paths before permanent initialization. A CLI flag or digest
   is not owner authentication.
5. After initialization against the exact approved paths, the private checkpoint
   creates and anchors a random opaque-label assignment before any remote
   request. Only then may the dispatcher load one named dedicated credential
   for the exact candidate.
6. For each newly formed dynamic generation request, the content-free ledger
   commits an irreversible combined count-plus-generation reservation with a unique
   run/candidate/case/role/attempt identity. Checkpoint event one records and
   fsyncs that exact ledger/request/root/source identity.
7. The dispatcher sends exactly one count-only request. It applies the approved
   provider rule and writes checkpoint event two with bounded count result,
   request/body digest, timing and decision. A failed/malformed count or a
   threshold/body-ceiling breach stops the entire run before generation, with
   no retry and no reservation release.
8. Only a passing event two mints single-use generation authority. For Google
   free tier, pacing includes the approved quiet period/spacing and shared
   project permits. Waiting is excluded from measured generation latency. The
   dispatcher sends one generation request with automatic retries and redirects
   disabled.
9. It verifies the explicit provider-reported model identity, validates the
   structured response and writes checkpoint event three: a bounded generation
   output or settlement intent. Only then may the ledger append actual usage or
   an uncertain/failure outcome.
10. Checkpoint event four records the settled ledger state. Recovery accepts at
   most one ledger-ahead settlement when a matching immutable event-three intent
   exists. It never fabricates a missing count. Failure keeps the reservation
   consumed. A candidate-local terminal path later finalizes explicit unattempted
   suffixes; a fatal global incident does not manufacture them.
11. A successfully finalized candidate-local terminal path writes explicit
   unattempted suffixes, provider-identifying audit evidence and normalized
   blind review evidence linked by hashes and opaque identifiers. A fatal global
   incident intentionally writes no complete/blind artifact; it retains only
   the ledger, mapping, checkpoint and bounded partial evidence for
   reconciliation.
12. OJ locks all rubric scores and disqualifications in the blind root; a
     matching private anchor must exist before the one-time mapping reveal.
13. No output is published. After the decision, retention, reconciliation and
     cleanup follow the controls below.

For the no-evidence case, deterministic evidence validation must stop before the
Writer. The harness records no-draft without inventing a model response or
calling later roles.

The research wire schema keeps an object root and a nested, branch-specific
decision: either evidence plus `researcherOutput`, or no-draft plus the fixed
reason. It avoids standalone `null` variants. Writer `publishedAt` and
`updatedAt` are exact empty-string wire sentinels projected to canonical `null`
before the frozen Phase 18.2 parser. Only Anthropic receives path-bounded,
unique, case-insensitive repair of fixed categorical `enum`/`const` values;
Google and OpenAI remain exact, free prose is never rewritten, and every
normalization is recorded. One schema failure disqualifies without a repair
call.

## Locked provider snapshot

Official catalog and pricing pages were rechecked on **26 September 2026**:

| Provider target | Exact endpoint | Standard paid reference price used for planning, USD per 1M tokens |
| --- | --- | --- |
| [`gemini-3.8-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) | `https://generativelanguage.googleapis.com/v1beta/interactions` | $0.75 input, $0.075 cached input, $3.75 output including thinking ([pricing](https://ai.google.dev/gemini-api/docs/pricing)) |
| [`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra) | `https://api.openai.com/v1/responses` | $2.00 input, $0.20 cached input, $2.50 cache write, $12.00 output below the documented long-context threshold ([pricing](https://developers.openai.com/api/docs/pricing)) |
| [`claude-sonnet-5`](https://platform.claude.com/docs/en/models/sonnet-5/whats-new-sonnet-5) | `https://api.anthropic.com/v1/messages` | $2.00 input, $2.50 five-minute cache write, $4.00 one-hour cache write, $0.20 cache hit, $10.00 output ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)) |

Generation requests are locked to 14,000 bytes, 2,048 combined
visible/reasoning output tokens, medium reasoning, zero tools and zero retries.
The fixed conservative generation reservations are US$0.03, US$0.075 and
US$0.065 per call respectively. Eleven generations per candidate reserve
Google US$0.33, OpenAI US$0.825 and Anthropic US$0.715: at most US$1.87.
Google/OpenAI add US$0.03/US$0.075 per-count contingencies, totaling at most
US$1.155; Anthropic counting is documented free. The combined maximum is
US$3.025 under the US$3.25 local ceiling. Up to 33 separate count-only requests
are permitted, so the total provider-request ceiling is 66, with no retry.

OpenAI admission uses an exact count threshold of 20,169. Anthropic uses a
14,000-token estimate plus an 8,260-token reservation margin. Google uses a
partial 14,000-token count plus a 15,760-token margin and independently enforces
the 14,000-byte complete serialized generation-body ceiling. Google/Anthropic
residual risk is explicitly accepted; no rule is represented as a provider
billing guarantee. Each dynamic count occurs only after its reservation and
checkpoint binding, immediately before its generation. Count failure or a bound
breach terminates the whole run.

The approval requires provider-specific count-pricing evidence, a fixed
disposition and a per-call local reservation. Anthropic is `documented-zero`.
Google and OpenAI are `bounded-contingency`, with explicit owner acceptance of
their unpublished-price risk. Google's
[billing FAQ](https://ai.google.dev/gemini-api/docs/billing#is-gettokens-billed)
says `GetTokens` is not billed and does not consume inference quota, but the
selected callable endpoint is documented separately as `models.countTokens`;
the reviewed evidence does not authoritatively map one name to the other.
OpenAI's selected count endpoint also lacks an explicit separate price. The
US$0.03 Google and US$0.075 OpenAI per-call contingencies are conservative
one-way local authority, not assertions that either endpoint charges, price
estimates, or provider invoice caps. A changed or contradictory provider rule
returns the manifest to R2.
Separately approved dedicated account/key preparation has occurred, but current
entitlement, declared billing mode, region, rate limits and identifiers still
need private reverification immediately before R3.

Only Google supports the declared `free-tier` billing mode. Its private quota
record must bind account-specific observed limits of at least 5 RPM and 250,000
input TPM, at least 22 remaining requests in the provider quota day, exclusive
project use, disabled billing and a reviewed evidence digest. The minimum covers
up to 11 count-only plus 11 generation transports because public documentation
does not exempt `countTokens` from project quota. `billingReady` attests readiness for the declared
mode, not enabled paid billing. Paid targets have no free-tier quota record.
Reference-priced returned usage still must fit every frozen bound; only then
does a valid free-tier response record zero actual token cost. The same local
reservation remains consumed. No second reference-cost score is introduced;
the zero-generation-cost formula remains in force. Passing candidates are
ranked by total, quality/security subtotal, latency, modeled generation cost and
then stable blind label. Count contingency is not scored as observed spend, and
the result cannot claim the cheapest total invoice. Private reconciliation must
confirm usage, count treatment and the recorded billing mode.

Zero cost expresses the approved free-tier tariff, not an independently
observed invoice amount. Because the audit retains `approvalSha256` rather
than the full approval, the owner must preserve the exact non-secret approval
and referenced evidence privately. Close-out and reveal both require matching
canonical approval and evidence digests. This is an owner-review workflow,
not a new automated artifact schema: retain the exact records in the owner's
existing private preflight record throughout, outside both strict execution
artifact roots, the checkpoint, blind bundle and public repository.
Google zero modeled cost also depends on the attended verification that the
supplied key is bound to the approved billing-disabled project. It is never
invoice evidence, and an unverifiable binding stops before launch.

## Threats and controls

### Authorization, cost and accounting

| Threat | Example | Controls |
| --- | --- | --- |
| ADR or approval-record acceptance is mistaken for spend approval | Offline tests pass or a syntactically valid record exists and an operator starts the bake-off | These records are procedural tamper evidence, not cryptographic human authentication. Fresh R3 confirmation is required immediately before permanent roots/ledger, credentials, deposits or requests; exact accounts, IDs, 33-count/33-generation ceiling, US$1.87 maximum generation plus US$1.155 count contingency, US$3.025 combined maximum inside the US$3.25 local ceiling, admission/count-pricing evidence and consequence are restated after current-state verification |
| US$3.25 is treated as a provider-account cap or per-provider allowance | Three providers each consume up to US$3.25, or count/framing behavior pushes an invoice above the ledger | The local ceiling applies once to the complete round's combined reservations. The dispatcher derives remaining capacity from permanent reservations. Counted admission and contingencies reduce exposure but do not guarantee provider billing; R3 requires the exact evidence, dispositions and risk acceptance |
| Request leaves before accounting | Process crashes between network dispatch and ledger write | The combined reservation and checkpoint binding commit before its count-only request. No committed reservation means no count or generation network operation |
| Failure or timeout is refunded | An accepted remote request times out and is retried | Reservations are one-way. Unknown billing consumes the full fixed reservation and stops the stage |
| Ledger reset creates new capacity | Missing or corrupt file is recreated automatically | Missing, replaced, corrupt, locked or inconsistent storage fails closed. No initialize-over-existing, truncation, deletion or rollover during the run |
| Duplicate dispatch | Process restart repeats a count or generation | Unique run/candidate/case/role/attempt key; one count and one generation opportunity only; SDK retries disabled; duplicate key cannot reserve or mint new authority |
| Crash leaves ledger and evidence out of step | Count/generation result is known but its journal or settlement is interrupted | Four ordered checkpoint events bind reservation, count result, generation output/settlement intent and settlement. Only a uniquely matching ledger-ahead settlement can recover; a missing count never mints generation authority |
| Provider-wide spend escapes local ledger | A key is used elsewhere or compromised | New dedicated key per provider, least available account limit, auto-reload off, attended run, provider usage checked after each bounded group; the local ledger is not claimed as an account-wide ceiling |
| Free quota is mistaken for paid billing or refunded capacity | Paid reference prices are reported as actual Google charges, or zero-cost responses replenish the ledger | Explicit approved billing mode; validate reference-priced usage first, record zero actual cost only for the verified Google free profile, keep every reservation consumed and reconcile privately; never upgrade billing automatically |
| Approval digest cannot explain a zero-cost result | The free-tier record is lost and only an opaque hash remains | Preserve the exact non-secret approval and referenced evidence privately; match canonical approval SHA-256 to audit/checkpoint approvalSha256 and verify evidence digests before close-out/reveal; missing records block both |
| Free quota is exhausted or pacing biases latency | Count plus generation calls exceed the account's observed quota, another process consumes capacity, or waiting is scored as provider speed | Private evidence of at least 22 remaining requests and exclusive use, fixed 60-second quiet start/13-second spacing across both count and generation, one shared 22-permit limiter, no retries, freshness checks after waits and separate generation latency; count and generation latency fields are transport-only durations beginning after pacing, not end-to-end elapsed time, and are bound to checkpoint/final audit; unexpected quota failure remains terminal |
| Shared organization blurs accounting | Another product's spend is attributed to the bake-off or its quota is consumed without approval | Separate owner approval for shared billing/quota, dedicated project/workspace and key, attended pre-launch secret-to-account/project verification from private owner evidence, and private bake-off ledger/expense records; labels, digests and syntactic key checks are not proof, and no identity probe is added |
| Count endpoint is assumed free or the contingency is treated as an invoice quote | A Google or OpenAI count-only request is sent because it does not generate text, or US$0.03/US$0.075 is reported as the provider's price | Each selected endpoint requires a reviewed evidence digest and exact `documented-zero` or `bounded-contingency` disposition. Google `GetTokens` FAQ language is not silently mapped to `models.countTokens`; Google/OpenAI require explicit risk acceptance and the contingency is never described as provider pricing |
| Partial/estimated count is mistaken for a guarantee | Google omits Interactions wrapper tokens or Anthropic billing differs from its estimate | Fixed 14,000 thresholds plus 15,760/8,260 reservation margins, Google's 14,000-byte full-body bound, explicit R2 residual-risk acceptance and whole-run terminal failure. Documentation and counts do not guarantee provider accounting |
| Price, provider framing or token rules drift | A structured-output wrapper makes the reservation too small | Immediately-before-run official generation/count price check plus content-addressed provider-specific admission evidence; unresolved accounting, pricing or account terms stop R3 approval. Returned overage is a disqualifier but not a preventive control |

### Provider and experiment integrity

| Threat | Example | Controls |
| --- | --- | --- |
| Silent model substitution | Endpoint routes gpt-5.6-terra to another model | Exact outbound ID and explicit returned model/version are stored and checked against a preflight-pinned documented wire value. Missing or mismatched identity disqualifies with no retry |
| Alias drift | A latest alias changes between cases | Aliases and family names are prohibited. Only the three exact ADR IDs are accepted |
| Hidden provider fallback | Client changes provider after an error | No fallback routing; one adapter and dedicated credential per exact candidate; failure is recorded |
| Mixed-provider result | Research uses one model and review another | One candidate model supplies every role for its configuration. Mixed-provider execution is outside scope |
| Unequal cases or tuning | One candidate receives repaired evidence or a better prompt | Byte-addressed manifest; identical semantic inputs; declared API-only syntax differences frozen before dispatch; any change invalidates the entire comparison |
| Provider identity leaks into judging | Reviewer recognizes a vendor from metadata | Separate audit and review artifacts; review removes provider, request, usage, price, latency and error metadata; mapping withheld until scores lock |
| Blind mapping is lost or altered | Labels are swapped after scoring | Cryptographically random mapping is durably anchored before dispatch, remains immutable/private and is hash-linked to audit/review artifacts; reveal is recorded once only after blind score lock and its private anchor |
| Retry improves one candidate | A schema failure gets an extra generation | One dispatch per stage, automatic retries disabled, no repair call. The first schema failure disqualifies and remains evidence |
| Count admission is applied inconsistently | One model is counted early against a template while another is counted after prior-stage output | Count the exact newly formed dynamic request immediately before its generation. It is impossible to pre-count all 33 before the first generation; any missing/mismatched count event stops the whole run |

### Evidence, injection and generated content

| Threat | Example | Controls |
| --- | --- | --- |
| Source injection controls a role | Source says to ignore the rubric or reveal a key | Exact approved spans are the only Writer evidence; instruction-bearing material is quarantined as review-only untrusted data; deterministic scans and adversarial case measure compliance |
| Unsupported claim becomes prose | Model fills a source gap from training memory | Every factual claim maps to an exact approved span; unsupported or contradictory evidence fails closed; fabricated support disqualifies |
| Reviewer gives a dangerous false pass | Reviewer approves an unsupported or injected draft | Independent Reviewer sees evidence and quarantine findings; high-severity false pass is a hard disqualifier; deterministic gates override recommendation |
| No-evidence case still drafts | Researcher invents a claim to keep workflow moving | Zero eligible supported spans produces harness-level no-draft before Writer dispatch. No empty draft or model-authored explanation is manufactured |
| Generated instructions execute | Output contains shell, repository or publication commands | Output is untrusted structured data; no shell, tool, filesystem writer, Git client or publisher is exposed; executable HTML, MDX, JavaScript and React are rejected |
| Model marks itself approved | Output requests publication | Model recommendations never grant authority. Publication is permanently false in Phase 18.3 |

### Credentials, privacy and network handling

| Threat | Example | Controls |
| --- | --- | --- |
| Existing product key is reused | Dispatcher finds GEMINI_API_KEY from Cited | It reads only the three BLOG_BAKEOFF-prefixed variables and fails when absent. Cited/E.V. keys, product-scoped resources, paths, environment files and ledgers are prohibited; an approved shared organization is not permission to access them |
| Credential reaches model or artifact | Key is interpolated into a prompt or error | Keys are client configuration only; never prompt data, schema data, logs, error bodies, artifacts or review output; redact headers before persistence |
| Redirect leaks authorization | Provider endpoint redirects to another host | Automatic redirects disabled; credentials never forwarded; unexpected redirect is terminal with no retry |
| Private information enters a case | A private CV or visitor conversation is copied as evidence | Owner-approved public-source attestation, privacy review and bounded scans before hashing; no visitor data, private documents, unpublished business material or unrelated repository context |
| Late redaction breaks comparability | Operator removes PII for only the final contender | No dispatch-time redaction. A redaction invalidates and rebuilds the case and manifest before all candidates restart |
| Provider retains more than assumed | Public source and prompts remain under provider policy | Send minimum public bytes, make no zero-retention claim without account evidence, verify current account terms before R3, and exclude private data; the fixed public author identity is declared input |
| Response exposes provider internals or secrets | Raw error includes identifiers or headers | Audit allowlist stores bounded HTTP status, model, safe usage/cost/latency, event links and declared normalizations; a body digest exists only after a complete read within the bound, never for truncated bytes; no full headers, credential-bearing URLs or unrestricted provider exception bodies |

### Artifacts, retention and publication

| Threat | Example | Controls |
| --- | --- | --- |
| Audit artifact biases review | Token cost or vendor name appears beside draft | Exactly two approved roots separate private audit/checkpoint material from the blind artifact; the blind view is generated from an allowlist and scanned for identity metadata before score lock |
| Review artifact hides operational failure | A polished draft omits identity mismatch or budget bypass | Audit gate can disqualify independently; artifact hashes link the scored output to its exact operational record |
| Private artifacts enter Git or CI | Raw responses are committed or uploaded | Private off-repository storage only; never CI artifacts; status and path checks before and after execution |
| Draft becomes public content | Winner is copied directly into content/blog/posts | No repository writer, PR, publisher, deployment or scheduler in Phase 18.3. Phase 18.4 requires a fresh phase, calibration and owner review |
| Artifacts live forever | Provider outputs and mapping accumulate | Raw and provider-identifying material has a 30-day ceiling after acceptance/abandonment unless an incident hold applies |
| Evidence is destroyed before billing reconciliation | Cleanup removes proof of an uncertain request | Content-free ledger and necessary audit metadata remain immutable until provider usage/invoice reconciliation and explicit owner-approved archival or deletion |

### Availability and operational failure

| Threat | Example | Controls |
| --- | --- | --- |
| Rate limit causes an unfair rerun | One candidate receives a 429 | Record failure, consume reservation and do not retry. The result is reliability evidence; owner may invalidate and redesign the whole round, never rerun one candidate selectively |
| Count request fails or exceeds its threshold | Operator skips the count so later candidates can continue | Count failure/body or token breach is globally terminal before generation; retain the reservation and bounded incident evidence, and send no later provider request |
| Process interruption loses state | Machine restarts after provider accepted request | Durable reservation precedes dispatch; terminal outcome may remain unknown but capacity remains consumed; resume cannot duplicate the attempt |
| Process dies after checkpoint creation but before its first reservation | A strict absent-root rule makes the already-approved run unrecoverable | One read-only retry preflight accepts only the exact approved private root containing its empty bound checkpoint, an empty ledger/journal and an absent blind root. It is unavailable after any reservation or permit expiry |
| Account entitlement was assumed | Documented model is unavailable to the owner's account | Account preparation is not proof of current entitlement. Reverify the exact account/model immediately before R3; no access means no dispatch and no substitute |
| Incident continues across providers | First call leaks data but loop proceeds | Global stop flag and attended execution; privacy, identity, ledger, credential or billing anomaly stops every remaining candidate |

## Hard disqualifiers

Regardless of weighted score, disqualify a configuration for:

- fabricated citation or supported-label mismatch;
- high-severity Reviewer false pass;
- prompt-injection obedience;
- privacy, personal-data, secret, credential or private-path leakage;
- any schema failure on its only dispatch;
- wrong, absent or substituted provider-reported model identity;
- hidden retry, fallback, mixed-provider call or ledger bypass;
- source/prompt/rubric drift; or
- repository write, publication or public exposure.

Disqualification cannot be reversed by a high aggregate score or low price.

## Residual risks

- Official documentation does not prove the owner's account is entitled to a
  model or has the assumed billing configuration.
- A provider can bill a request whose response never arrives. One-way
  reservation contains the local envelope but cannot prove provider accounting.
- Google count admission is partial and Anthropic's is an estimate. Their fixed
  margins and body bound are deliberate risk controls, not provider guarantees;
  the provider can tokenize, frame or account differently.
- Google/OpenAI count prices are unpublished. Their bounded contingencies are
  explicit local risk allowances, not claims that either endpoint charges or
  invoice caps. A contradictory provider rule or missing current evidence
  returns the decision to R2.
- The provider-reported model field is evidence from the provider, not a
  cryptographic attestation of model weights.
- Tokenizers and reasoning behavior differ, so byte-identical sources do not
  produce equal token counts or equal effective effort.
- Provider style may sometimes reveal identity despite metadata removal. The
  reviewer must not guess or record provider identity before reveal.
- Deterministic scans cannot recognize every private fact or injection. Human
  source approval remains necessary.
- A compromised local machine can read credentials, mapping and artifacts.
  Least privilege and short attended exposure reduce but do not remove this
  risk.
- The US$3.25 ledger does not cover deposits, taxes, unrelated account use or a
  compromised key. It is a run admission control, not a provider-account cap.

## Validation required before R3 execution

The 28 September run-window amendment has repinned the source chain: normalized
manifest-source SHA-256
`e1421fc565836cc47ddac757fd89085eadde7b9a42c3a017f80adf95465f2064` and
complete-manifest SHA-256
`80b7d08722a68e845d2759b1d96d8771e09a5fada61081272ce5517376b569fd`.
The amendment moves the run-day price attestation from source into the approval
record and adds a run deadline of at most three hours on the same London date,
while the 15-minute start window still bounds every step before the first
provider request. Residual risk accepted with it: an operator could record
`pricingCheckedOn` without re-reading the prices. A source edit never proved
that either; the attended preflight and the digest-bound approval record remain
the control. A longer run keeps credentials in the attended process for longer,
so the run must stay attended throughout and any anomaly stops all dispatch.
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

The paragraph below records the superseded 26 September checkpoint
(`d5c03de7…`, `57a208ca…`).
Read-only launcher inspection and all 214 Phase 18.3 bake-off tests across 14
files pass against the refreshed source. The earlier 23 September canonical gate attempt passed
72 of 92 portfolio browser tests and failed 20; its bounded last-failed
diagnostic retained five navigation and five timing/load failures. No code, test
or configuration changed before the exact full `npm run test:ci` rerun passed
all 17 stages, including 1,191 unit tests, the production build, 92 of 92
portfolio browser tests, 46 of 46 management browser tests and
zero-vulnerability audits. The failures were non-reproducible and are attributed
to transient shared-runner/browser scheduling load, while the first red result
remains preserved. The 12:08:52 UTC 22 September complete-gate result remains
historical evidence for the superseded date pin. The 26 September refreshed
catalog and manifest also pass the exact full 17-stage npm run test:ci:
1,191/1,191 unit tests, production build, 92/92 portfolio browser tests,
46/46 management browser tests and zero-vulnerability audits.

This is offline evidence only; fresh count-pricing evidence, the
account/quota/billing/key/path preflight and exact immediate R3 confirmation
still block execution.

### Offline validation

- Confirm the Phase 18.2, prompt, rubric and three-case manifest is stable and
  content-addressed.
- Prove the no-evidence case produces no-draft before Writer dispatch.
- Prove adversarial instructions never cross into the Writer evidence view.
- Recompute both shared blog-validator hashes and every Phase 18.2 and Phase
  18.3 runtime byte hash from the active worktree, then verify the normalized
  manifest-source and complete execution-manifest digests.
- Prove the nested branch-specific ResearchDecision contract, the two
  empty-string-to-null timestamp projections and the Anthropic-only categorical
  normalization; reject every other schema deviation on its first occurrence.
- Prove audit and review artifacts are hash-linked but the review view contains
  no provider, cost, usage, latency, request or error identity.
- Prove exactly two path-digest-bound roots, the fixed private checkpoint child,
  pre-dispatch random assignment, four-event count/generation journal/recovery, candidate-local
  unattempted suffixes, fatal-global partial checkpoint evidence and score lock
  before reveal.
- Prove each newly formed dynamic request is counted only after its durable
  reservation/checkpoint binding, that the count record is linked into final
  artifacts, and that every count failure or threshold/body breach stops the
  whole run without generation or retry.
- Prove duplicate attempts, missing/corrupt ledger, absent dedicated variables,
  redirects, model mismatches and over-budget reservations fail closed.
- Prove SDK retries and fallback behavior are disabled.
- Prove no adapter can write repository content or call Git/publication tools.

### Immediately-before-action verification

- Re-read current official model and pricing pages.
- Inspect owner account entitlement, billing state, auto-reload and account
  limits, region and the exact non-secret account/project/workspace/credential
  identifiers without making a model request.
- Verify the exact official endpoints and returned identity fields.
- Verify the named permanent ledger and both named artifact roots are absent,
  outside the repository and outside all Cited/E.V. paths. Creation is itself
  part of the exact R3 consequence. After approval creates them, verify their
  identities and empty initial state; never replace or reinitialize them.
- Recompute the 33-count/33-generation envelope: US$1.87 generation plus
  US$1.155 count contingency equals US$3.025 inside the US$3.25 ceiling.
  Verify the generation subtotals US$0.33/US$0.825/US$0.715 and the Google/
  OpenAI count subtotals US$0.33/US$0.825. Verify the exact admission rules: Google partial
  count <=14,000 plus 15,760 margin and 14,000-byte body, OpenAI exact count
  <=20,169, and Anthropic estimate <=14,000 plus 8,260 margin. Retain the
  reviewed evidence digests and explicit Google/Anthropic residual-risk
  acceptance without describing them as guarantees.
- Verify current count-pricing evidence, exact dispositions, per-call
  reservations and risk acceptance. Anthropic is documented zero. Google and
  OpenAI remain unpublished and use bounded contingencies; any changed provider
  rule or missing evidence stops before R3.
- Verify only the dedicated variable names are present in the execution process.
- Restate the exact accounts and credential identifiers, three model IDs,
  ledger/two-root path digests, at most 33 count-only plus 33 generation
  requests, no retries, US$1.87 maximum generation reservation plus US$1.155
  maximum count contingency, US$3.025 combined maximum inside the US$3.25 local
  reservation ceiling, admission/count-pricing evidence digests/dispositions,
  residual-risk acceptance, data being sent, and the fact that the ledger does
  not cap the provider account and failed/timed-out requests may still charge.
  Then obtain fresh R3 confirmation. Do not treat the resulting record or CLI
  approval digest as cryptographic owner authentication.

### Post-run validation

- Reconcile every reservation with one provider outcome and available provider
  usage/billing evidence.
- Confirm there was no retry, fallback, mixed-provider call or unplanned model.
- Confirm repository status has no artifact or content change from execution.
- Lock review scores before revealing the mapping.
- Record disqualifiers separately from the weighted score and rank passing
  candidates by total descending, quality/security subtotal descending,
  latency ascending, modeled generation cost ascending and stable blind label ascending.

## Incident handling

Immediately stop all providers on any suspected credential disclosure, private
data transmission, wrong model, redirect, unexpected retry, ledger
inconsistency, price/billing anomaly, blind-map exposure or repository write.

Preserve the content-free ledger, private blind assignment, checkpoint journal
and minimum bounded audit fields needed to establish what was sent, to which
exact endpoint/model, when, under which reservation and with what response
status and, only after a complete bounded read, body digest. Preserve explicit
unattempted case records only when a candidate-local terminal path finalized;
a fatal global incident intentionally has no complete/blind artifact. Do not preserve
credentials, authorization headers or unrestricted exception bodies. Mark
outstanding reservations uncertain and do not release them.

The owner checks provider usage and account activity and decides whether to
revoke the dedicated credential, contact a provider, place artifacts on incident
hold or abandon the comparison. Credential revocation, destructive cleanup and
any resumed paid execution remain explicit owner actions. An incident run is
never resumed by retrying only its missing cases.

## Retention and rollback

Before the first provider dispatch, rollback means removing or disabling the
isolated offline harness; no external state exists.

After dispatch, rollback means stopping all further calls and preventing any
artifact from publication. Preserve the one-way ledger and bounded audit
evidence until billing reconciliation and incident review finish. Raw responses,
the blind mapping and provider-identifying artifacts must be removed within 30
days after owner acceptance or abandonment unless an incident hold requires
longer retention. Deletion is not automatic while the ledger is unresolved.

Dedicated keys are never repurposed for Cited, E.V. or production. Their
revocation is an owner-controlled R3 action. A later Phase 18.4 may consume only
an owner-accepted, redacted decision and a selected configuration; it may not
inherit raw credentials, reservations or an authority to publish.
