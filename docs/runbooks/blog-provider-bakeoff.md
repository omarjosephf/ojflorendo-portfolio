# Phase 18.3 blog provider bake-off

Use this runbook only for the attended, blinded comparison governed by
[ADR-0024](../adr/0024-blog-provider-bakeoff.md) and the
[threat model](../threat-models/blog-provider-bakeoff.md). It does not authorize
spend, credential access, publication, a provider selection or Phase 18.4.

## Cancelled — 29 September 2026

**Do not execute this runbook.** The owner cancelled the comparison before any
run, and [ADR-0026](../adr/0026-gemini-first-blog-agent-models.md) supersedes
ADR-0024. No permanent ledger or artifact root, credential access, provider
request or spend occurred. The rest of this runbook is historical.

## Current stop state — 28 September 2026

The owner-approved 28 September R2 amendment moves the run-day price-check date
from source into the approval record and splits the approval window into a
15-minute start window and a run deadline of at most three hours. See
[ADR-0024](../adr/0024-blog-provider-bakeoff.md#run-day-price-date-and-run-window--28-september-2026).
A run day no longer needs a source edit. The rest of this section is unchanged
from 26 September.

Safe implementation preparation exists and may be tested without provider
traffic or credentials. The owner separately approved dedicated account/key
preparation, the 21 September offline update and the 22 September counted-input
admission/ranking R2 amendment in an isolated checkout, followed by the
owner-authorized 23 September pricing/date-pin refresh. Private evidence
holds the account-specific results. No provider request has run, no permanent
bake-off ledger or artifact root has been created, no winner exists and nothing
has been published. The earlier source checkpoint remains preserved.

Stop before execution until all three providers' non-secret account/project/workspace
and credential identifiers and their current entitlement, declared billing mode,
regional access, auto-reload/limit settings and any deposit or checkout consequence
have been privately reverified. The owner must also choose one new permanent ledger
path and exactly two new private artifact roots outside this repository and all
Cited/E.V. paths. Google and OpenAI do not publish an exact price for the
selected count methods. The owner-approved 22 September paid-count amendment
therefore uses bounded one-way contingencies instead of asserting that they are
free. Anthropic explicitly documents its selected token-counting operation as
free. R3 still requires a fresh account, quota, key-binding, path and billing
preflight.

The attended command boundary is safe-by-default:

- `node src/lib/blog/pipeline/bakeoff/run.mjs --inspect [config.json]` performs
  read-only inspection and is the default mode;
- `node src/lib/blog/pipeline/bakeoff/run.mjs --execute <config.json> --approval-sha256 <reviewed-digest>`
  selects the explicit execution path.

This isolated launcher requires **Node 24 or later** for native `registerHooks`
and the reviewed installed TypeScript **6.0.3** compiler; these are Phase 18.3
operator prerequisites, not a change to the portfolio application's general
Node engine. A version mismatch must stop before config, credentials, permanent
state or provider traffic. Before TypeScript is imported or any TypeScript
module top-level code executes, the native launcher verifies the normalized
manifest source and every pinned shared/Phase 18.2/Phase 18.3 source byte, then
compiles only those verified in-memory sources with exact TypeScript 6.0.3. The
launcher/version source is manifest-bound, but this is ordinary local toolchain
trust, not proof against malicious Node or `node_modules`.

The config is exactly `{ approval, ledgerPath, privateArtifactDirectory,
blindReviewDirectory }`. The executor validates the approval and resolved absent
targets before it initializes permanent state, and the supplied digest must
match the reviewed approval. These checks are procedural: neither a command-line
flag nor a digest authenticates OJ or substitutes for the immediate R3 decision.

## Fixed experiment

| Provider | Exact model and endpoint | Paid reference price checked 26 September 2026, USD per 1M tokens | Generation reserve | Count disposition / reserve |
| --- | --- | --- | ---: | ---: |
| Google | [`gemini-3.8-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), `https://generativelanguage.googleapis.com/v1beta/interactions` | $0.75 input, $0.075 cached input, $3.75 output including thinking ([official pricing](https://ai.google.dev/gemini-api/docs/pricing)) | $0.030/call | Unpublished bounded contingency, $0.030/call |
| OpenAI | [`gpt-5.6-terra`](https://developers.openai.com/api/docs/models/gpt-5.6-terra), `https://api.openai.com/v1/responses` | $2.00 input, $0.20 cached input, $2.50 cache write, $12.00 output below the long-context threshold ([official pricing](https://developers.openai.com/api/docs/pricing)) | $0.075/call | Unpublished bounded contingency, $0.075/call |
| Anthropic | [`claude-sonnet-5`](https://platform.claude.com/docs/en/models/sonnet-5/whats-new-sonnet-5), `https://api.anthropic.com/v1/messages` | $2.00 input, $2.50 five-minute cache write, $4.00 one-hour cache write, $0.20 cache hit, $10.00 output ([official pricing](https://platform.claude.com/docs/en/about-claude/pricing)) | $0.065/call | [Documented free](https://platform.claude.com/docs/en/build-with-claude/token-counting), $0/call |

Each generation request is at most 14,000 UTF-8 bytes and 2,048 combined
visible/reasoning output tokens, uses medium reasoning, exposes no tools and
permits no retry. Each candidate can make at most 11 count-only requests and 11
generations; the round can make at most 33 of each, 66 provider requests total.
The fixed generation reservations are Google US$0.33, OpenAI US$0.825 and
Anthropic US$0.715, totaling US$1.87. Google and OpenAI add US$0.33 and
US$0.825 count contingencies respectively; Anthropic adds zero because its
selected count operation is explicitly documented free. The combined maximum
is US$3.025 inside one US$3.25 local reservation ceiling. Failed, malformed,
refused, timed-out or outcome-unknown count or generation requests keep the
complete combined reservation consumed. This ledger is not a provider-account
spending cap and the two contingencies are not provider-published prices.

The three locked case inputs retain their Phase 18.2
`runCostCeilingMicroUsd: 2_000_000` inner workflow safeguard. That value is
case-local pipeline metadata, does not authorize external spend and does not
replace or reduce the Phase 18.3 durable US$3.25 combined ledger ceiling.

After maximum output charges, the fixed reservations admit no more than 29,760
Google, 20,169 OpenAI and 22,260 Anthropic billed input tokens per generation.
Admission is narrower than those arithmetic ceilings:

| Provider | Count-only threshold | Margin/additional bound | Accuracy |
| --- | ---: | ---: | --- |
| Google | 14,000 tokens | 15,760 tokens, plus a 14,000-byte full serialized generation-body ceiling | Partial count; explicit owner-accepted residual risk, not a provider guarantee |
| OpenAI | 20,169 tokens | 0 | Exact Responses input count; external billing still is not locally guaranteed |
| Anthropic | 14,000 tokens | 8,260 tokens | Estimate; explicit owner-accepted residual risk, not a provider guarantee |

Every newly formed dynamic request is counted immediately before its generation,
after its reservation and checkpoint binding are durable. Later requests depend
on earlier validated output, so it is impossible to count all 33 before the
first generation. A count error, malformed response, threshold/body-ceiling
breach or admission mismatch terminates the whole run before generation, with
no retry and no reservation release. Count-only requests themselves require R3,
credential access and a durable evidence event; they are not an offline
preflight.

The only credential variable names are:

- `BLOG_BAKEOFF_GOOGLE_API_KEY`
- `BLOG_BAKEOFF_OPENAI_API_KEY`
- `BLOG_BAKEOFF_ANTHROPIC_API_KEY`

Never use a generic, personal, Cited or E.V. key or ledger.

Here, "personal" excludes reuse of an existing general-purpose personal key or
ledger. A new dedicated user-owned project/workspace key is permitted when
separately approved for the bake-off. A shared provider organization is allowed
only under its own explicit owner approval, with dedicated project/workspace,
key, private ledger and expense attribution. Shared organization credits/quota
are not independent billing. Never access or change another product's resources,
keys, environment files, allowances, budgets or ledgers. Use the least available
key permissions and never an organization-admin key. Do not put account IDs,
emails, balances, credential identifiers or secret values in this public repo.

### Google free-tier execution profile

The approved target must explicitly declare `billingMode: free-tier`; paid
targets use `billingMode: paid` and `freeTierQuota: null`. `billingReady: true`
means ready for the declared mode, not that paid billing is enabled. The only
supported free-tier target is the exact Google model/project, with private
evidence binding all of the following:

- account-specific observed limits of at least 5 requests/minute and 250,000
  input tokens/minute, with at least 22 requests remaining in the current
  provider quota day;
- `exclusiveProjectUseVerified: true` and `billingDisabled: true`;
- a reviewed evidence SHA-256, not a bare digest or public account screenshot.

These values describe the supported bounded profile, not universal account
entitlements. Reverify actual project quotas before R3. Google's
[rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
defines project-scoped limits and a midnight-Pacific daily reset. Do not enable
billing, purchase credit, substitute a model or retry to recover exhausted quota.

The runner observes an initial 60-second quiet period and at least 13 seconds
between **every count-only and generation transport**, using one shared
in-process account/project limiter with at most 22 permits. This requires
exclusive project use; it does not police other processes. Waiting is attended,
does not count as scored generation latency, and must be followed by fresh
permit checks. An expired permit stops the run, not the clock. Public Google
documentation does not establish that `countTokens` is exempt from project
quota, so 11 remaining requests is insufficient for the 11-count/11-generation
worst case.

Google input/output is free under the verified profile. Paid reference prices
remain in the catalog/approval, and reference-priced usage must fit the same
input/output and reservation bounds before a valid response records zero
actual token cost. There is no separate scored reference-cost metric. The
zero records the approved free-tier tariff, not an independently observed
invoice amount and not the paid reference valuation.
The five-point cost formula remains based on modeled generation tariff cost,
including its zero-cost rule for the verified Google free profile. Count
contingencies are authorization allowances, not observed invoice costs, and are
excluded from scoring. Ranking is total score, then quality/security subtotal,
latency, modeled generation cost and stable blind label; there is no
cheapest-first five-point band. Unknown requests still consume their full
reservation and zero modeled generation cost never restores capacity. Reconcile
the recorded mode, count treatment and available billing evidence privately at
close-out; the result cannot claim the cheapest total provider invoice.

### Public terms and data boundary

The 21 September public review is recorded in
[ADR-0024](../adr/0024-blog-provider-bakeoff.md#public-terms-and-privacy-evidence--21-september-2026).
Check those terms and actual account settings again before R3. This private
attended experiment is not a rollout of an API client to users. Region-dependent
free-tier terms must not be inferred from the pricing table alone.

Only fixed synthetic case material, fixed public author identity and validated
prior-stage output enter prompts. No live repository files, private documents,
visitor records or unrelated environment values are included. Keys appear only
in authentication headers; tools and publication remain disabled. `store: false`
is not a zero-retention guarantee, and Anthropic's global inference setting is
not a regional-residency promise. Provider policies and shared-organization
administrative access still apply.

## 1. Read-only preflight

Perform this immediately before the owner decision. Do not load credentials,
create the ledger/roots, purchase credit or make a model request.

1. Confirm the active worktree and inspect its status. Preserve unrelated and
   inherited changes; execution must not write to the repository.
2. Run the Phase 18.3 unit/type/lint checks. Verify both shared blog-validator
   bytes, every listed Phase 18.2/18.3 runtime byte, the manifest-side raw hash
   of `source-integrity.ts`, the verifier-side normalized hash of
   `execution-manifest.ts` and the canonical manifest digest bound by the
   intended ledger/checkpoint identity. The pinned normalized source digest is
   `e1421fc565836cc47ddac757fd89085eadde7b9a42c3a017f80adf95465f2064` and
   the pinned complete-manifest digest is
   `80b7d08722a68e845d2759b1d96d8771e09a5fada61081272ce5517376b569fd`.
   Both independent checks must pass again at paid entry and immediately before
   every fetch. They detect review drift and one-file bypasses; they are not a
   signature or protection against coordinated source edits. Drift stops the
   run and returns it to R2 review.
3. Re-read all six official model/pricing links in the table. Confirm the exact
   IDs, endpoints, structured-output support, medium reasoning, prices and
   terms. Record the check in the approval record's `pricingCheckedOn`. It must
   equal the current `Europe/London` calendar date and fall between the
   catalog's `catalogReviewedOn` (2026-09-26) and `catalogValidThrough`
   (2026-12-31). A price, term or model that differs from the source catalog
   stops the run and returns it to R2; it is not fixed by editing the date.
4. In each owner-controlled account, verify without a model request:
   entitlement to the exact model, declared billing mode/readiness, region,
   auto-reload, limits, key scope/expiry and shared-organization approval. For
   every selected billing mode, verify the current account/project quota record,
   remaining capacity for the full 22-request candidate envelope and exclusive
   use during the attended run.
   Record the exact non-secret account ID, project/workspace ID and dedicated
   credential ID only in private evidence. Do not record the secret.
5. Resolve the exact permanent ledger path, ledger UUID, private audit-root
   path and blind review-root path. Verify all three targets are absent, private,
   outside the repository and outside every Cited/E.V. directory. Compute the
   three path digests. The private root's fixed `checkpoint/` child is not a
   third approved root.
6. For each provider, create and independently review a content-addressed input
   admission evidence record. It must bind the current date, exact model, count
   and generation endpoints, request-contract digest, generation-body/output
   caps, threshold, reserved margin, accuracy classification and residual-risk
   decision. Relevant official counting references are
   [Google token counting](https://ai.google.dev/gemini-api/docs/tokens),
   [OpenAI input-token counting](https://developers.openai.com/api/reference/typescript/resources/responses/subresources/input_tokens)
   and
   [Anthropic message token counting](https://platform.claude.com/docs/en/api/messages/count_tokens).
   Record its SHA-256 in the provider target. Set
   `inputAdmissionResidualRiskAccepted: true` only for Google's partial rule and
   Anthropic's estimate; it is false for OpenAI's exact rule. This is explicit
   acceptance of bounded residual risk, not proof or a provider guarantee.
7. Independently retain a current count-pricing evidence record/digest for each
   provider. Bind the exact count method, official references, disposition and
   per-call reservation. Anthropic is `documented-zero`. Google and OpenAI are
   `bounded-contingency`, with explicit owner risk acceptance and US$0.030 and
   US$0.075 per-call local reserves. Google's
   [billing FAQ](https://ai.google.dev/gemini-api/docs/billing#is-gettokens-billed)
   describes `GetTokens` as unbilled but does not authoritatively equate that
   name with the selected
   [`models.countTokens`](https://ai.google.dev/api/tokens) method. OpenAI's
   [input-token endpoint](https://developers.openai.com/api/reference/typescript/resources/responses/subresources/input_tokens)
   has no separate published price. Never present either contingency as an
   invoice estimate or provider guarantee. If a provider publishes a different
   rule, the manifest returns to R2.
8. Recompute the fixed 33-count/33-generation envelope: US$1.87 maximum
   generation authority plus US$1.155 maximum count contingency equals
   US$3.025 inside the US$3.25 ceiling. Confirm no deposit, tax, account minimum,
   provider framing or purchase is being hidden by the local ledger.
9. Record the preflight time. It may be no more than five minutes before the
   owner's approval time. Any changed fact repeats this preflight.

If any fact is unknown, ambiguous, unavailable or substituted, stop. There is
no fallback model, endpoint, account, credential or reduced comparison.

## 2. Immediate R3 owner gate

Restate the exact run ID, ledger UUID/path digest, both artifact-root path
digests, the start-window end and run deadline, three account/project/workspace/credential IDs, three exact models,
count and generation endpoints, current prices, three input-admission and three
count-pricing evidence digests, residual-risk decisions, data being sent and
this consequence verbatim:

> Owner authorizes creation of the named private ledger and artifact roots,
> access to the three named dedicated credentials, and at most 66 provider
> requests: 33 count-only requests and 33 potentially billable generation
> requests, with no retries. Each count follows its durable reservation and must
> pass the approved admission rule before generation. Owner accepts the
> documented residual input-framing risk for Google and Anthropic. Generation
> reserves at most US$1.87 and the unresolved Google/OpenAI count paths reserve
> an additional US$1.155 contingency, for at most US$3.025 inside a US$3.25
> local reservation ceiling; Anthropic counting is documented as free. The
> Google/OpenAI contingencies are conservative local accounting assumptions,
> not provider-published count prices or provider-account spending caps, and
> failed, timed-out, or provider-accounted requests may still charge more than
> the local contingency.

Ask OJ for fresh confirmation in the controlling chat or equivalent trusted
owner channel immediately before the action. Approval of code, tests, this ADR
or this runbook is not that confirmation. The structured approval record and
its SHA-256 digest are procedural tamper evidence, not a signature or
cryptographic authentication of OJ.

Retain the exact non-secret approval object and every referenced private
account/quota, input-admission and count-pricing evidence record in the owner's existing private
preflight record before dispatch. A digest alone is insufficient: the complete
record is needed to interpret billing mode and zero cost later. Retain the
owner's separate approval evidence too; the object itself does not authenticate
that decision. Never include credential values, public screenshots, the public
repository or the blinded review bundle in this retention path. Do not add
files to the absent execution roots or to their checkpoint-only recovery state.

The record carries two limits. `expiresAt`, no more than 15 minutes after
approval, is the **start window**: approval and ledger validation, both
artifact-root checks and checkpoint creation must finish inside it.
`runDeadlineAt`, later than `expiresAt` and no more than three hours after
approval, is the **run deadline**: no reservation, count, generation or pacing
wait may start after it. The run deadline must fall on the same `Europe/London`
date as the approval, so approve no later than 21:00 London time, and stay
attended until the run finishes (up to three hours in the worst case). Restate
both times in the owner gate. If either limit passes, the date changes, a
price/account fact changes, or the source/execution manifest changes, stop and
repeat the read-only preflight and owner decision. If a target
path ceases to be absent, stop except for the single empty-checkpoint recovery
described below. Never edit a record to extend it.

## 3. Approved attended execution

Only after the exact R3 confirmation:

1. In the owner-controlled provider console or private credential record, verify
   that each secret is the exact newly dedicated key for the approved
   account/project/workspace and credential identifier. Only after R3 has
   explicitly permitted credential access, populate the three exact
   `BLOG_BAKEOFF_*_API_KEY` variables in the attended process. Approval labels,
   the approval digest and the adapters' syntactic key checks do **not** prove
   this secret-to-account mapping. Do not make an identity probe or extra
   provider request to infer it. If the mapping cannot be verified without such
   a request, stop before invoking the launcher.
2. Invoke the explicit executor only with the reviewed config and approval
   digest:
   `node src/lib/blog/pipeline/bakeoff/run.mjs --execute <config.json> --approval-sha256 <reviewed-digest>`.
   Before creating permanent paths or reading dedicated credential values, it
   validates the
   approval, source/launcher manifest, config's exact four fields, resolved
   parents, path digests, and absence/outside-Git constraints for all targets.
   A failure leaves the run uninitialized and is terminal.
3. Initialize the named content-free ledger once with the approved run,
   manifest, ledger UUID, path digest, US$3.25 ceiling and zero reservations. Never
   initialize over, reset, truncate, copy, replace or recreate it.
4. Revalidate the approval record against that exact empty ledger and the two
   absent artifact-root digests. The runner checks all Phase 18.3 runtime bytes,
   the admission/count-pricing evidence digests, dispositions, contingencies
   and limits, ledger identity,
   approval freshness and artifact targets before credential access. This
   syntactic/runtime binding does not replace the human evidence review in
   preflight steps 6–7.
5. Let the runner create the approved private audit root first. It creates a
   fixed private `checkpoint/` child and durably anchors a cryptographically
   random provider-to-label assignment before any dispatch. The approved blind
   review root remains absent during provider execution and is created only
   when a successful complete run is finalized.
6. The adapters construct only after approval, ledger and checkpoint checks.
   They may consume only the three process-local dedicated values verified in
   step 1. Do not print, log, paste or persist those values.
7. For every newly formed generation request, require this ordered evidence
   chain: committed generation reservation; fsynced authenticated checkpoint
   reservation binding; both source-integrity checks; one count-only request;
   validated threshold/body bound; fsynced count-preflight event with the
   request/body digest, result, decision and timing; one generation dispatch;
   bounded provider-output/settlement-intent event; ledger settlement; and
   checkpoint settlement event. Recheck the approval date, exact dynamic bytes
   and source/launcher manifest immediately before each transport. A count or
   checkpoint failure mints no generation authority. Record count and generation
   transport timing separately after pacing. These fields measure transport
   duration, not end-to-end elapsed time; pacing waits are excluded from scored
   generation latency.
8. Treat provider data as untrusted. Verify HTTP/status envelope, exact returned
   model, usage and exact provider completion shape. Google rejects nonempty
   response errors, tool steps and any present non-standard body/header tier;
   its tier fields are optional. OpenAI requires a completed response with null
   error/incomplete state. Anthropic requires an assistant message, standard
   tier/global inference and zero cache read/write/breakdown because caching is
   disabled. Retain a body digest only when the complete body was read within
   one megabyte; never hash truncated bytes. Store no response headers or
   unrestricted error body. Google/OpenAI schema categories remain
   case-sensitive. Only Anthropic may normalize a unique case-only match for a
   fixed categorical enum/const, and the path is recorded. The two writer
   timestamp sentinels may project from exact empty strings to `null`; no other
   repair is allowed.
9. Stop a candidate on its first generation schema failure or other
   candidate-local terminal path. A count failure, admission threshold/body
   breach or count-pricing-disposition mismatch stops **every provider**, as does a global
   privacy, credential, ledger, identity, billing, redirect or repository
   anomaly. Preserve failed and explicitly unattempted case records where the
   finalized artifact rules permit them.

Do not retry, selectively rerun, switch providers, repair an output, lower a
threshold or release a reservation. Do not run unattended. Missing or
unverifiable secret-to-account/project binding is a final pre-launch stop
condition, not an accepted residual risk.

## 4. Abort and recovery

On interruption, do not invoke the provider again. Preserve the ledger, private
blind assignment, checkpoint journal and bounded partial evidence.

One restart is allowed before any dispatch: if the already-approved process
created the private root/checkpoint and then crashed before its first
reservation, the read-only retry validator may accept that exact bound private
root only while it contains no artifact except the fixed checkpoint child, the
ledger and journal have zero reservations/events, the blind root is still
absent and the same permit remains fresh. Any other existing-root state stops;
this exception is never available after a reservation.

The final blind root is created exclusively. If it already exists, finalization
stops rather than replacing it. A crash or fsync failure after partial final
artifact creation is a manual incident/reconciliation state; it is never
automatically reopened or finalized a second time.

The checkpoint contains four immutable events per completed generation
opportunity: reservation, count-preflight result, generation
output/settlement intent, and settlement. Recovery may accept one ledger
settlement that is ahead of the journal only when it exactly matches the
immutable generation intent already recorded. It never invents a missing count
or authorizes generation from a partial count event. Every other mismatch fails
closed. An uncertain count or generation request keeps its full reservation
consumed.

For suspected credential disclosure, private-data transmission, wrong model,
redirect, duplicate dispatch, ledger inconsistency, price/billing anomaly,
premature unblinding or repository write, stop all candidates and follow the
[security incident runbook](security-incident.md). Credential revocation,
provider contact and destructive cleanup are separate owner actions.

## 5. Reconcile, blind-score and reveal

1. Reconcile every reservation against exactly one checkpoint path and all
   available provider usage/billing evidence. A candidate-local terminal result
   may finalize with explicit unattempted suffixes; a fatal global incident has
   no complete/blind artifact and is reconciled from ledger/checkpoint evidence.
   Confirm repository status did not change because of execution.
   Verify `canonicalSha256(exactApprovalRecord)` equals the run's
   `approvalSha256` in the audit/checkpoint evidence, and verify each retained
   evidence record against its referenced digest using its declared hash format.
   Check the approved account/project, billing mode and free-quota record when
   interpreting zero cost; it means approved free pricing, not paid-reference
   cost. Missing or mismatched retained records block close-out and reveal.
   Read those records from the owner's existing private preflight record
   throughout; never copy them into either strict execution artifact root,
   `checkpoint/`, the blind bundle or the public repository. This creates no
   additional execution artifact root or automated artifact schema.
2. Give OJ only the identity-free blind artifact. Do not expose provider/model,
   request IDs, cost, usage, latency, error fingerprints or mapping.
3. OJ records every rubric score and disqualification. Lock the complete score
   record once in the blind root; the system writes its matching private anchor.
4. Reveal the provider mapping once only after both score-lock artifacts verify.
   Recheck the retained approval/evidence digests above. A reveal record binds
   the score lock, private anchor and identity map. This historical digest check
   never renews an expired execution permit or authorizes another request.
5. Apply hard disqualifiers independently of total score. Rank passing
   candidates by total points descending, then the 90-point quality/security
   subtotal descending, measured generation latency ascending, modeled generation
   cost ascending and stable blind label ascending. There is no cheapest-first
   five-point band and ranking does not itself authorize provider selection.

A result is still private experiment evidence. Owner acceptance of a result is
not authorization to publish it or begin Phase 18.4 in this chat.

## 6. Retention and close-out

Keep the immutable content-free ledger and the minimum bounded audit evidence
until provider billing/usage is reconciled and any incident is closed. Raw or
provider-identifying material, the blind mapping and private review evidence
have a 30-day ceiling after owner acceptance or abandonment unless an incident
hold applies.

The exact non-secret approval and its referenced evidence are part of that
private reconciliation record. Apply the same provider-identifying retention
ceiling after reconciliation; keep unresolved records under the incident hold.

Do not delete or archive unresolved evidence. Any credential revocation,
destructive cleanup or deletion requires the applicable owner authorization.
Never repurpose the dedicated credentials, ledger or artifact roots for Cited,
E.V., production or Phase 18.4.

The 21 September and 22 September test/manifest records are historical. The
earlier 23 September checkpoint passed read-only launcher inspection, all 214
Phase 18.3 bake-off tests across 14 files and the exact unchanged 17-stage
`npm run test:ci`: 1,191 unit tests, production build, 92 of 92 portfolio
browser tests, 46 of 46 management browser tests and zero-vulnerability audits.
The immediately preceding canonical attempt failed 20 portfolio browser tests
and its bounded last-failed diagnostic left five navigation plus five
timing/load failures. Because no code, test or configuration changed before the
complete pass, those failures were non-reproducible transient
shared-runner/browser scheduling load; the first failed attempt remains recorded.

The 26 September catalog and manifest refresh passes read-only launcher
inspection, all 214 Phase 18.3 tests across 14 files, and the exact full
17-stage npm run test:ci: 1,191/1,191 unit tests, production build, 92/92
portfolio browser tests, 46/46 management browser tests and zero-vulnerability
audits. This is an offline result.

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

This verification authorizes no live action. Fresh count-pricing evidence, the
account/quota/billing/key/path preflight and exact immediate R3 confirmation
remain blocking; no credential value, provider request, charge or permanent
ledger/artifact state was used.

At Phase 18.3 completion, stop and open a **new chat** before Phase 18.4. The
handoff should point first to this runbook, ADR-0024, the threat model, the
locked source/execution manifests, the reconciled private audit and blind score
lock/reveal records. It must state plainly that publication remains unapproved.
