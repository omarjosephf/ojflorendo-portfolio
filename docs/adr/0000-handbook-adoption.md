# ADR-0000: Adopt Project Zero Engineering Handbook (v1.1.0, then v1.2.0)

- Status: Accepted — adopted 2026-07-28, amended 2026-08-01, v1.2.0 ratified 2026-08-29
- Date: 2026-07-28 (amended 2026-08-01)
- Owner: OJ Florendo

## Context

Project Zero previously operated under the owner-ratified Handbook v1.0.0. The
owner ratified the exact supplied v1.1.0 release-candidate document unchanged as
**Project Zero Engineering Handbook v1.1.0** on 28 July 2026.

The original adoption deliberately preserved the document's `1.1.0-rc1` and
"awaiting final owner ratification" wording, because ratification promoted the
exact bytes unchanged and rewriting them would have produced an unratified byte
sequence.

### Amendment, 1 August 2026 — the retained wording caused real harm

That preservation was well-intentioned but proved actively harmful. The retained
"release candidate" wording repeatedly caused sessions and handoff documents to
conclude that v1.1.0 was **not** governing, and to operate — or claim to operate
— under v1.0.0 instead. It produced a standing authority conflict that consumed
review time on more than one occasion.

Investigation on 1 August 2026 established the decisive fact: **the v1.0.0
document carries the identical `1.0.0-rc1` / "awaiting final owner ratification"
header.** The wording is a template artefact present in every version, so it was
never evidence of adoption status for either document, and preserving it
communicated the opposite of the truth.

A comparison of the two versions also confirmed that v1.1.0 is strictly
additive on every safety dimension — security, privacy, accessibility and risk
requirements are all equal or expanded — while replacing v1.0.0's blanket
"Version 1 non-goals" prohibition with governed product-expansion policies. The
project had in practice already been operating under v1.1.0-only rules,
including §6.4 authorship and AI-disclosure.

The owner therefore ratified the corrected document on **1 August 2026**, and
this ADR is amended rather than superseded.

## Decision

1. Store the exact ratified bytes at `docs/ENGINEERING_HANDBOOK.md`.
2. Treat those bytes as **Project Zero Engineering Handbook v1.1.0**.
3. Record 28 July 2026 as the owner-ratification date.
4. Make the repository copy the durable source of truth when this ADR and the
   exact handbook bytes are merged into canonical `main` through the approved
   release workflow.
5. Keep v1.0.0 in Git history as the superseded governing version.
6. Use root `AGENTS.md` and `CLAUDE.md` only as privacy-safe pointers to the
   handbook and ADRs.

7. **(Amended 2026-08-01)** Correct the document header to `Version: 1.1.0`,
   `Status: Ratified and governing — the single authoritative version`, and add a
   changelog entry recording the promotion. This creates a new byte sequence,
   which the owner ratified explicitly on 1 August 2026.
8. **(Amended 2026-08-01)** v1.1.0 is the **single** governing version. v1.0.0 is
   superseded, retained only as history, and must not be cited as governing.

### Ratified document SHA-256

**Current — ratified 2026-08-01, the version to verify against:**

```text
fe7c954f1e1ed6a3e12a7df7ff7cc37aa55862fa0ceb82b480d279b76b963c34
```

Superseded — the 2026-07-28 ratification of the uncorrected bytes, retained for
audit history only:

```text
f2c7b0029e36b6ffd70d36a909af7cce13ae5813d5f62b5c362cc0971e6d7f59
```

The checksum must be recomputed from the committed `docs/ENGINEERING_HANDBOOK.md`
and compared against the **current** value above. Any mismatch blocks adoption
until explained and approved.

## Alternatives considered

### Rewrite the handbook header and changelog

Originally rejected, because the owner had ratified the exact candidate unchanged
and rewriting the body would create an unratified byte sequence.

**Reversed on 1 August 2026.** Preserving the wording cost more than it protected:
it caused repeated misreadings of which version governs. The objection was valid
in principle and is answered by re-ratifying explicitly and pinning the new
checksum above, so no unratified bytes are ever treated as authoritative.

### Supersede this ADR with a new one

Rejected. The adoption decision itself did not change — only the presentation of
the ratified document and the correction of a defect in this ADR's own reasoning.
Amending keeps the full history in one place, which is easier to audit than a
chain of superseding records.

### Leave ratification only in chat history

Rejected because future contributors must be able to determine authority without
hidden conversation context.

### Keep private AI instruction files as repository guidance

Rejected because private briefs and machine-local instructions do not belong in
the public canonical repository.

## Security and privacy impact

This decision adds no secret, production credential, personal address, private
phone number, private CV, or machine-local path. Pointer files deliberately contain
only public governance instructions.

## Accessibility and performance impact

None. This is governance and repository-hygiene documentation only.

## Operational impact

R2 work must follow the handbook's approval, verification, PR, and release rules.
Commit, push, merge, deployment, DNS, secret, and destructive actions remain
separately controlled.

## Consequences and trade-offs

- The handbook now states its own status correctly, so the authority question can
  be answered by reading the document rather than by reading this ADR first.
- The ratified byte sequence changed once, deliberately and on the record. Two
  checksums exist; only the current one is authoritative.
- v1.0.0 remains available in Git history but is no longer citable as governing.
- Repository adoption is incomplete until the corrected file and this amended ADR
  are committed and published through the approved workflow.

### Ratification, 29 August 2026 — v1.2.0 supersedes v1.1.0

OJ Florendo explicitly ratified **Engineering Handbook v1.2.0** on 29 August
2026. It is now the governing policy and is committed at
`docs/ENGINEERING_HANDBOOK.md`.

- **Effective date:** 29 August 2026
- **Effective checksum (SHA-256 of the governing file):**
  `370cdb24f867c66514544f38aae0c816114c70c8062e04bc3195af3a94e73dfb`

**Why the amendment was required rather than an exception.** v1.1.0 §49.1
authorised the portfolio assistant *"only as a narrow, optional beta"*. Read
strictly, as §3 requires, "beta" was a condition of the authorisation rather
than a UI string, and §46 forecloses using an exception to make a permanent
policy change. Removing that permanent condition therefore needed a version.

**What v1.2.0 changes**, all confined to assistant maturity and lifecycle
policy: §49.1 replaces the permanent "beta" condition with a narrow, optional
feature that may graduate to a label-free stable release on recorded evidence;
§49.6 turns maturity labels into a stage with a graduation mechanism; §48
Track C describes the assistant as a product rather than as coursework; §10's
ADR trigger no longer assumes a beta; and §52 adds an adoption checklist. The
authority model, risk classification, security, privacy, accessibility,
performance, cost-control, evaluation, testing, release, rollback,
production-control and truthful-representation requirements of v1.1.0 are
preserved unchanged.

**Obligations added, not only removed.** Dropping the label is conditioned on a
permanent truthful capability disclosure, ADR-recorded graduation criteria, a
green gate, and explicit owner approval.

**Adoption steps.** All five supersession conditions in the handbook's Document
control section are complete: ratified, committed at the canonical path,
guidance files verified (`CLAUDE.md` and `AGENTS.md` reference the handbook by
path, not by version, so neither needed editing), this ADR records the effective
date and checksum, and conflicting documentation is reconciled in ADR-0006 D12.

**v1.1.0 remains in Git history** and is no longer citable as governing.

## Rollback or migration

Before publication, remove the candidate files. After publication, revert the
adoption commit through a reviewed pull request; do not rewrite history.

## Related decisions

- `docs/ENGINEERING_HANDBOOK.md`
- `docs/adr/0001-contact-form-email-boundary.md`
- Project Zero Strategic Handoff, 28 July 2026
