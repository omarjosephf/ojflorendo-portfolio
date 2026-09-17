# ADR-0021: A recorded approval is required to merge to `main`

- Status: Accepted — owner-directed 17 September 2026, applied the same day
- Date: 2026-09-17
- Owner: OJ Florendo
- Risk: R2 for the workflow and this record. The branch-protection and
  repository-settings changes it describes are R3 account actions, performed on
  explicit owner instruction on 17 September 2026
- Related: [ADR-0000](0000-handbook-adoption.md) (handbook adoption),
  [the deployment runbook](../runbooks/deployment.md) (evidence log)

## Context

`docs/ENGINEERING_HANDBOOK.md` §11 classes a merge to protected `main` as R3 and
requires explicit confirmation *immediately before* the action. §34 step 4
requires owner approval before promotion. Neither was mechanically enforced.

Branch protection on `main` required the `verify` context and
`required_approving_review_count: 0`. A green gate was therefore, by
configuration, sufficient to merge and deploy. Nothing was circumventing the
protection; the protection said a green gate is enough.

**On 17 September 2026 that produced two unapproved production deployments.**

| Pull request | `verify` success | merged | deployed | gap |
| --- | --- | --- | --- | --- |
| #96 → `3c443be` | 17:20:59Z | 17:21:06Z | 17:21:41Z | 7s |
| #97 → `2f8ba78` | 17:34:32Z | 17:34:50Z | 17:35:18Z | 18s |

Both merges are attributed to `omarjosephf`, because an automated merge lands as
the account that enabled it. The authority was real. The confirmation §11
requires immediately before the action did not happen in either case.

The mechanism was a desktop-app switch that enabled auto-merge alongside three
unrelated settings, re-arming each time it was toggled. It is worth recording
that disabling GitHub's *native* auto-merge did not stop the second merge:
`auto_merge_disabled` is on #97's timeline at 17:28:35Z, no `auto_merge_enabled`
event follows it, and the merge still landed at 17:34:50Z. Whatever performed it
did not use the auto-merge feature, so a fix scoped to that feature could not
have been sufficient.

**The gate was never the failure.** `verify` ran, passed, and proved what it
claims to prove. The approval was absent and nothing required it.

## Decision

Two changes, applied together on 17 September 2026.

1. **Auto-merge is disabled repository-wide.** `allow_auto_merge: false`. No pull
   request in this repository can use GitHub's auto-merge feature.

2. **A second required status context, `release-approval`.** Supplied by
   `.github/workflows/release-approval.yml`. It passes only when the pull
   request carries the `approved-to-deploy` label. On `synchronize` the job
   deletes the label and fails, so an approval always refers to the commits
   actually being merged rather than to an earlier state of the branch.

Protection on `main` now requires `verify` **and** `release-approval`, with
`enforce_admins: true`, so the rule binds the owner as well.

`verify` proves the change is correct. `release-approval` proves someone decided
to ship it. The two were previously conflated, and that conflation is what
deployed twice.

## Alternatives considered

**Require one approving review.** The obvious fix, and unusable here. GitHub does
not permit approving your own pull request. This is a single-maintainer
repository with `enforce_admins: true`, so every pull request is the owner's and
none could ever accumulate its one approval. The protected path would freeze
entirely. Rejected on inspection of the repository rather than in principle.

**`allow_auto_merge: false` alone.** Necessary but demonstrably insufficient —
see the #97 timeline above. Adopted as one half of the decision, not as the
whole of it.

**A paragraph in the runbook.** Rejected. The runbook already recorded the
practice, in detail, and it did not prevent either merge. The entry describing
the first instance was being written while the second was queuing. Prose that
describes a control is not a control.

**`lock_branch` or a CODEOWNERS requirement.** Both reduce to the self-approval
problem or block ordinary work. Not pursued.

## Security and privacy impact

The workflow requests `pull-requests: write`, needed to delete the label on a new
push; everything else is `contents: read`. It uses the default `GITHUB_TOKEN`,
introduces no secret, and calls no third-party action — only `gh`, preinstalled
on the runner.

It reads `github.event.pull_request.labels`, which is trusted event metadata
rather than attacker-controlled content, and passes it through the environment
rather than interpolating it into the script body.

## Accessibility and performance impact

None. No application code, dependency or response surface changes.

## Operational impact

One short job per pull-request event. Merging now requires a deliberate
labelling act, which is the intended cost. The `approved-to-deploy` label was
created at repository level on 17 September 2026.

## Consequences and trade-offs

**The approval is attributable but not timestamped against the merge.** Nothing
forces the label to be applied immediately before merging rather than at open.
Revocation on push narrows this to "the approval covers these exact commits",
which is the property §11 actually wants, but it is not a proximity check.

**The gate depends on the workflow file continuing to exist.** Deleting
`.github/workflows/release-approval.yml` while `release-approval` is still a
required context makes every pull request permanently unmergeable, with no UI
override, because `enforce_admins` is true. The rollback order below is not
optional.

**An agent can apply the label.** On 17 September 2026 Claude Code applied it to
#98 on explicit owner instruction, recorded in a comment on that pull request.
This control constrains automation only to the extent that the owner does not
delegate the labelling. That is a deliberate limit: the owner is the approval
authority and may exercise it through an agent, but the act is then attributable
to a specific instruction rather than to a background switch.

**The revocation path was untested when this was written.** #98 received its
label and merged with no subsequent push, so the `synchronize` branch of the
workflow had never executed. Its first execution will be on a required check.

## Rollback or migration

Order matters, and reversing it breaks the repository.

1. Remove `release-approval` from the required contexts — a `PUT` to
   `/branches/main/protection` carrying every other setting, since that endpoint
   replaces the whole object and silently drops anything omitted.
2. Only then delete `.github/workflows/release-approval.yml`.

Re-enabling auto-merge is a `PATCH` setting `allow_auto_merge` back to `true`.

## Verification

Read back from GitHub on 17 September 2026, after applying:

- Required contexts on `main`: `verify`, `release-approval`. `strict: true`,
  `enforce_admins: true`, `required_conversation_resolution: true`,
  `allow_force_pushes: false`, `allow_deletions: false` — each confirmed
  individually, because the `PUT` replaces the entire protection object.
- `allow_auto_merge: false`; `allow_squash_merge`, `allow_merge_commit` and
  `allow_rebase_merge` all still `true`.
- On #98 the check behaved as specified: `FAILURE` with no label, `SUCCESS`
  after the label was applied, on a rerun triggered by the `labeled` event.
- `scripts/check-handbook-gate.mjs` reads only `.github/workflows/ci.yml`, so
  the new workflow does not affect §30 stage parity; the check still agrees on
  all 17 stages.

## Related decisions

[ADR-0000](0000-handbook-adoption.md) ratifies the handbook whose §11 and §34
this enforces.

The [deployment runbook](../runbooks/deployment.md) evidence log records both
unapproved deployments and the circumstances of each merge. `3c443be` was
recorded at the time; `2f8ba78` was not, because the entry describing the first
instance was itself the change that deployed second, and a third entry written
then would have had that log chasing its own tail. It is recorded in the same
change as this ADR, together with `7bcbd71` — the deployment of the gate
itself, and the first in that log an approval preceded.
