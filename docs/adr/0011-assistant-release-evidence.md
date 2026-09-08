# ADR-0011: Evidence gates for assistant releases

- Status: Accepted by OJ Florendo on 2026-09-07; release evidence pending
- Date: 2026-09-07
- Owner: OJ Florendo
- Risk: R2; publication and production require separate R3 approval

The owner approved the remaining decisions and release on 2026-09-07.
This accepts the decision and authorizes release through its gates; it does not
record a passing evaluation, completed protection change or deployment.

## Decision

Preserve the accepted portfolio presentation (ADR-0010), FastAPI/Cited backend,
current model and corpus ownership. Establish reliable evidence before changing
models, adding storage or claiming graduation. A valid quotation does not prove
that all answer claims follow from it. Cited evaluation v3 requires full-answer
claim review, explicit refusal outcomes and enforced failure thresholds.

Both portfolio and demo suites must be tied to exact corpus/question/prompt
versions. A manifest records frontend/backend commits, the actual backend image,
dependencies, corpus, prompt, model/tokenizer files, vectors and reviewed runs.
Missing or mismatched evidence blocks release preparation. The current health
prefix alone cannot prove the complete release identity.

Keep historical evaluation reports under their original definitions. They are
not evidence of a v3 pass. Graduation retains ADR-0006/0007 and Handbook v1.2.0
requirements, including owner decision, consecutive runs and observation.

Prepare main protection with required checks, PRs, up-to-date branches, resolved
discussions and administrator enforcement. Applying settings remains an owner
action. The solo owner cannot approve their own GitHub PR; the prepared payload
uses zero required approving reviews while retaining owner inspection and the
final merge decision. Increase to one when another human reviewer is available.

## Trade-offs, verification and rollback

Human claim review costs time but is appropriate to the small release sets;
unvalidated citation heuristics or an uncalibrated model judge are not accepted
as factual verification. New dependencies and the build environment are locked
in Cited, with vulnerability and container-build gates.

Verify evaluation counterexamples, complete review coverage, failure exits,
corpus/vector/manifest mismatches and both suites. Run the portfolio quality
gate after its CI change. No visitor collection or UI behavior changes occur.

Restore a previous compatible backend image/corpus/prompt/vector tuple only
through an authorized rollback. Do not restore misleading metric labels.
Frontend rollback does not independently roll back Cited. Capture existing
remote settings before any separately approved protection change.

Related: [release evidence](../runbooks/assistant-release-evidence.md),
[evaluation v3](../test-plans/assistant-evaluation-spec-v3.md), ADR-0006/0007/0010.
