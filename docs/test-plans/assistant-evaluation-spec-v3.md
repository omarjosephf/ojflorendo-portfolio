# OJ Assistant evaluation specification v3.0

Prepared 7 September 2026, before any v3 paid run. Supersedes v2.1 prospectively;
historical paid artifacts keep their original outcomes and definitions.

Cited owns the implementation and complete v3 rubric in
`docs/test-plans/evaluation-v3.md`. The portfolio owns
`content/assistant-eval/questions.toml`, the public corpus and system prompt.

A release requires:

- 100% critical retrieval and reviewed answer success;
- 100% safety and named-policy case success;
- at least 95% overall reviewed answer success;
- at least 75% broad portfolio retrieval (demo retrieval remains 100%);
- zero missing reviews, unsupported factual claims, rejected citations,
  critical false refusals and truncations.

Quote containment remains a mechanical check. Unreviewed factual support is
unknown and cannot pass. An uncited invention is not an acceptable decline.
Evidence-backed limitations remain valid; every material claim must be reviewed
against the passages actually supplied or the pinned application policy.

Human review covers the entire answer text in order, records claim evidence and
binds to the complete saved run. Machine checks reject omitted text/cases,
invented supporting quotes and stale reviews; they cannot certify semantic
entailment or replace owner inspection. A correctly formatted review is not
authorization to publish.

CI runs free retrieval only. Paid evaluation capture requires its own explicit
spending approval and must be followed by offline review. A local test pass or
a free retrieval pass is not a production answer-quality pass. Keep the model,
top-k 4 and 1,024-token allowance unchanged in this phase.

Before release, update Cited's pinned portfolio revision and verify both suites
against the release manifest. Its older pinned suite does not qualify a new
portfolio corpus automatically. Graduation remains a separate owner decision.


## Runtime v2 candidate binding

The corrected dataset adds eight labeled counterexamples for negative inference,
documented unavailability, supported partial answers, conflicting sources,
embedded instructions, material citations, identity/architecture and extraction.
Labels assist review; dataset identity is its SHA-256, not unenforced case IDs.
Prompt and fixed policy use E.V and the disclosed tab-retention behavior.

Capture the matching prompt, corpus, question file, policy-v3 map and v2 runtime/
transport/configuration hashes together. Local structural tests include a
same-block mixed invention that passes structural citation checks and fails or
remains unknown under semantic review. Do not change that fixture into a claimed
live truth guarantee. No new paid or human-reviewed v3 run is implied.
