# Assistant release evidence

The corpus export remains owned by this repository. Cited's
`docs/schemas/release-manifest-v2.schema.json` defines the current release tuple
and its `assistant.release_manifest` command validates the prepared artifacts.
Record exact frontend/backend commits, backend image digest, runtime dependency
lock, corpus, prompt, model/tokenizer lock, vectors, policy/evaluator versions
and both fully reviewed evaluation suites.

Do not turn an old corpus prefix, a historical quality percentage or a green
frontend build into a claim that the latest backend is deployed. Keep full
manifests, runs, reviews and observed release identity in private release storage.
Missing hashes or reviews are incomplete evidence, not fields to guess.

For a corpus change, export into a fresh staging directory before scoring it.
Pass `--suite portfolio` and this repository's question set to Cited's free
evaluation. Update `eval/portfolio-source.json` in Cited to the reviewed
portfolio commit in a companion change. The final release bundle must contain
both suites matching the intended version tuple.

The artifact checker is preparatory and does not deploy. Verify the clean
candidate, exact CI runs, privacy-reviewed artifacts, actual image provenance
and a compatible rollback target before the separate publication decision.
After an authorized release, collect observed identity independently and compare
the complete manifest. The existing short health prefix is only one check.

## Prepared main protection

`docs/operations/main-protection.json` is a proposed GitHub REST payload. It
requires the `verify` check from GitHub Actions (app 15368), current branches,
PRs and resolved discussions, with no force push/deletion or administrator
bypass. Check identity was verified on 7 September 2026.

Required approving reviews is zero for the solo-owner workflow; the owner
cannot approve their own PR. Owner inspection and final approval still apply.
Add one required human review when a second reviewer is available.

Before applying, read current protection/rulesets and permissions, privately
save the existing settings, confirm check names on the candidate, and obtain
the owner's settings approval. Verify effective rules and controlled failing-
check behavior afterward. Restore the captured settings if needed; do not
rewrite history or weaken the quality checks as a workaround.

Reference: [GitHub branch protection API](https://docs.github.com/en/rest/branches/branch-protection).
## Routed-runtime evidence

Manifest v2 binds answer contract v3, the candidate answer-runtime source hashes,
and the complete approved behavior configuration to both reviewed suites. Missing
or extra runtime source roles, changed source bytes, different provider settings
or stale answer contracts fail verification. Manifest v1 and earlier captures
remain historical evidence; they cannot qualify the Luna/Gemini candidate.

Local retrieval checks, mocked tests and regenerated vectors are permitted under
the owner's resumed verification approval. Live AI calls and model comparisons
remain paused. The legacy paid capture command is disabled until its routed
capture and per-provider cost accounting are separately approved. Do not create
placeholder live runs or human reviews to satisfy the manifest.

File hashes do not prove what is running inside a deployed image. Independently
verify image provenance and observed identity in addition to the artifact checks.
