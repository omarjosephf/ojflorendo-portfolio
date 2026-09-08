# E.V runtime contract v3

Status: local implementation, unverified. Extends the resource, privacy and
lifecycle boundaries in [runtime v2](assistant-runtime-v2.md); supersedes its
single-provider and wire-v2 requirements for this candidate.

## Provider routing

Primary is `gpt-5.6-luna` through OpenAI Responses, with `store: false`, no
tools and reasoning effort fixed to `none` for this candidate. Backup is
`gemini-3.5-flash-lite` through Google GenerateContent with its default
thinking configuration. These settings are engineering choices, not measured
latency or quality findings.

One retrieval snapshot and the same current question and last four bounded
questions/source-label sets are used for both. Previous generated prose and
primary responses/errors never enter the backup request. Each adapter requests
structured answers and references; application code verifies every supplied
quote/source and applies the same whole-answer policy and suppression rules.
A citation match alone does not establish semantic entailment.

There are at most two serial attempts, with zero retries and no hedging.
The provider phase ends at the earlier of six seconds after provider work starts
and the backend deadline minus 0.5 seconds. Primary receives at most three
seconds; backup receives only the remaining provider-phase time. The existing
eight-second backend, nine-second proxy and ten-second browser budgets remain.
Cancellation suppresses late display; it does not prove remote work stopped.

Fallback requires an explicitly classified primary availability failure:
transient connection interruption/provider timeout, HTTP 408/500/502/503/504, or
a bounded 429 error code identifying temporary rate/capacity exhaustion.
Unclassified 429, quota/billing problems, missing/invalid credentials,
configuration/TLS errors, other HTTP errors, local admission/budget exhaustion,
cancellation and overall deadline expiry do not qualify. Neither do safety
refusal, malformed or oversized responses, truncation, failed citations or
failed policy. A missing primary key must not silently enable Gemini-only use.
Runtime remains inactive until explicit configuration enables the complete pair.

Each dispatch reserves one unit of the same daily attempt budget. Unknown
primary usage remains unknown even when backup succeeds. Metrics separate
primary and backup attempts by configured role/model and expose known subtotals
with unknown counts. Gemini output usage is treated as complete only when its
candidate and thinking-token counts are explicitly available; otherwise the
usage pair remains unknown. The budget is per process and resets on restart; it is not
an account-wide dollar cap. One executor slot stays occupied until both serial
work and cleanup have actually returned.

## Portfolio transport

Only wire version 3 is accepted. Answered results contain exactly `version`,
`state`, `answer`, `citations` and `model_route`. Citation fields remain
`source_id`, `evidence_id` and `quote`. `model_route` is `primary` or
`fallback`, assigned by application code after handling that provider.

Not-covered results contain exactly `version`, `state`, `policy` and
`model_route`. Their route is null when no provider was used; otherwise it
retains the provider route through fixed-policy replacement or suppression.
The portfolio maps policy IDs to application-owned text. It retains valid
fallback metadata when rejecting an unsafe answered payload into fixed copy.
Unknown routes and incompatible envelopes fail closed.

Unavailable contains only `version: 3` and `state: "unavailable"`. No exception,
key/configuration state, provider payload or retry reason crosses this boundary.
Source labels and links still come from the exact corpus allowlist.

The browser receives optional camelCase `modelRoute` on answered/not-covered
results and shows a small "Backup model used" label for fallback. Screen readers
receive the same disclosure. The label survives bounded session storage;
older records keep absent metadata and are never retrospectively attributed
to the new primary. Generated answer text is still excluded from provider
history. The intro and accepted palette/fonts/layout are unchanged.

## Delivery status and remaining qualification

The owner explicitly stopped further testing and model comparisons. No new
tests, builds, lint/typechecks, benchmarks, captures or provider probes accompany
this implementation. Existing tests and captures describe earlier candidates
and have not been rewritten as evidence for v3. Source inspection does not
establish runtime correctness. Provider-adapter behavior, timing, accessibility
of the new label and answer quality remain unverified.

The corpus and fixed model/privacy copy change with this candidate. Regenerating
the corpus fingerprint is source generation only, not qualification. A later
authorized release workflow must produce compatible exported corpus/vectors and
bind the actual dirty-file fingerprints or revisions, effective prompt/policy,
provider configuration and dependencies. Old vectors and old evaluation results
cannot qualify changed corpus bytes.

When verification is authorized again, the pending scope includes both provider
adapters, classification, two-attempt budget/unknown usage, deadline/cancellation,
policy/citation suppression, wire-v3 parsing, restored fallback disclosure,
and the existing integrated quality/release gates. No paid account, provider
credential, billing, production service or deployment was changed in this task.

Rollback is paired across Cited and the portfolio, including prompt, policy,
corpus, vectors and provider configuration. Version mismatch remains unavailable.
Retain the owner's release approval and the outstanding evidence separately.

## Verification authorization update — 7 September 2026

The owner subsequently authorized local tests, builds and type checks, and the
specific npm dependency security audit. That supersedes the earlier local-test
pause recorded above. All live AI calls and model comparisons remain paused.
Passing offline checks can qualify their covered contracts; they do not supply
new live-answer evidence or establish provider account and spending controls.

## Offline verification result — 7 September 2026

The resumed local verification passed portfolio lint, application/test typing,
production build, corpus checks, 419 unit tests and 73 browser tests. Production
and full npm advisory audits reported zero vulnerabilities. The paired backend
passed 660 tests excluding the separately verified CLI/manifest suite (41 tests),
Ruff lint/format and strict mypy over source/tests. Seven backend checks requiring
recorded paid-run/corpus artifacts were skipped and remain unverified.

Fresh offline retrieval hit all 43 answerable portfolio cases in the top four
(including all 13 critical cases) and all 10 answerable demo cases. These findings
cover retrieval only. Mocked provider tests do not measure live model quality,
latency, account suitability or costs. Current routed live captures and human
reviews, Linux image validation and source/image provenance remain outstanding.
All live AI calls and model comparisons remain paused; no activation or release
was performed as part of this verification.
