# ADR-0000: Adopt Project Zero Engineering Handbook (v1.1.0, then v1.2.0)

- Status: Accepted — adopted 2026-07-28, amended 2026-08-01, v1.2.0 ratified
  2026-08-29, v1.2.1 ratified 2026-09-08, current bytes re-ratified 2026-09-17
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

**Current — the value to verify against.** Handbook v1.2.1 with §30 extended to
list `docs:check-handbook-checksum`, made under the 17 September 2026 approval
recorded below:

```text
060e0387af18dd5efab28a5558b2106964292bd7abca90635721c0c63de8c2ee
```

**This value is now enforced mechanically.** `npm run docs:check-handbook-checksum`
runs as a stage of the required gate, recomputes the handbook's SHA-256 over
LF-normalised bytes, and fails when it disagrees with the value above. A handbook
edit that does not update this line fails CI in the commit that makes it.

Verifying by hand is unchanged. The checksum must be recomputed from the committed `docs/ENGINEERING_HANDBOOK.md`
— LF line endings, as `git show <ref>:docs/ENGINEERING_HANDBOOK.md | sha256sum`
produces — and compared against the **current** value above. Any mismatch blocks
adoption until explained and approved.

Superseded values, retained for audit history only. Each was verified on
17 September 2026 to be the SHA-256 of the committed bytes at the commit named,
and none is authoritative now:

| Version | Ratified | Commit | Committed bytes (LF) |
| --- | --- | --- | --- |
| 1.2.1 | re-ratified 2026-09-17 | `3e9880c` | `ae68ad30…b5b021` |
| 1.2.1 | 2026-09-08 | `2969c19` | `9bdf6a7c…d8f366` |
| 1.2.0 | 2026-08-29 | `1319554` | `fa3e88c6…086128` |
| 1.1.0 | 2026-08-01 | `9003e05` | `fe7c954f…b963c34` |
| 1.1.0 | 2026-07-28 | `dc7803c` | `f2c7b002…e6d7f59` — the uncorrected bytes, before the 1 August amendment |

**This section named `fe7c954f…` as "Current" until 17 September 2026.** That was
correct on 1 August 2026 and was never revised through the two ratifications that
followed, which recorded their values in the sections below instead. The result
was two places in one document each claiming to hold the authoritative checksum,
disagreeing by three versions: anyone following this section's own instruction
would have compared the committed file against a v1.1.0 hash and found a mismatch
that meant nothing. The values are consolidated here so there is one place to
read and one place to update.

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
- The ratified byte sequence has changed several times, each time deliberately
  and on the record. Every value it has held is listed under **Ratified
  document SHA-256**; only the current one is authoritative, and that section
  is the single place to read or update it.
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

### Ratification, 8 September 2026 — v1.2.1 supersedes v1.2.0

OJ Florendo explicitly ratified **Engineering Handbook v1.2.1** on 8 September
2026. It is now the governing policy and is committed at
`docs/ENGINEERING_HANDBOOK.md`.

- **Effective date:** 8 September 2026
- **Effective checksum (SHA-256 of the committed file, LF line endings):**
  `9bdf6a7c8319ba616091c68c158bb882f9ae1cdc2d3b665bb9281df127d8f366`

**What it changes.** One sentence of §6.4. A `Co-authored-by` trailer still
requires explicit owner instruction and the default is still no trailer; the
instruction may now be **standing** for a defined body of work rather than
repeated per commit, provided its scope is recorded. Under §46 this is a
clarification with no material policy change, which the versioning section
defines as a patch. No other section is touched.

### Correction, 8 September 2026 — the recorded checksums were CRLF renderings

The v1.2.0 checksum recorded above,
`370cdb24f867c66514544f38aae0c816114c70c8062e04bc3195af3a94e73dfb`, **does not
match the committed file.** The committed bytes hash to
`fa3e88c6a36a86b0689c0b20f2db8069316c87576a57555c27e0ea1191086128`.

The handbook was not altered after ratification — it has exactly one commit,
`1319554`. The recorded value is the hash of the same content rendered with
**CRLF** line endings, as it appears in a Windows working copy. The repository
stores LF: `.gitattributes` sets `* text=auto eol=lf` and `*.md text eol=lf`.

This mattered. The checksum exists so that, in this ADR's own words, "no
unratified bytes are ever treated as authoritative". A value that only verifies
on Windows fails that job in both directions: it reports tampering on Linux and
in CI where none occurred, and it would fail to detect a real substitution by
anyone verifying on a platform where it happens to match. A verification control
whose result depends on the checker's operating system is not a verification
control.

**Convention, from this correction onward:** the effective checksum is the
SHA-256 of the **committed** bytes — LF line endings, as `git show
<ref>:docs/ENGINEERING_HANDBOOK.md | sha256sum` produces. That is what
"recomputed from the committed file" above always meant, and it is now stated
explicitly so the ambiguity cannot recur.

For the record, the corrected historical value:

| Version | Recorded (CRLF, wrong) | Committed bytes (LF, authoritative) |
| --- | --- | --- |
| 1.2.0 | `370cdb24…e73dfb` | `fa3e88c6…086128` |

v1.2.0 is superseded and neither value is now authoritative; the row exists so
the discrepancy is explained rather than left to be rediscovered.

### Re-ratification, 17 September 2026 — the recorded checksum had fallen behind the file

The value recorded for v1.2.1, `9bdf6a7c…`, is the hash of the bytes ratified on
8 September at `2969c19`. It is still true of those bytes. It stopped being true
of the committed file three days later, and nothing noticed for six.

`docs/ENGINEERING_HANDBOOK.md` changed four times after its ratification:

| Commit | Date | What it changed in the handbook |
| --- | --- | --- |
| `472f907` | 11 Sep | §7 and §8.1 corrected to describe the Fly/FastAPI retrieval backend, Supabase, and the two real visitor-facing input boundaries; §30 rewritten to list the gate's actual stages; Appendix A's duplicate stage list removed |
| `72bfe46` | 11 Sep | `docs:check-migration-manifest` added to §30; the written-out stage count removed |
| `06affe5` | 11 Sep | §30's parity note extended to cover `.github/workflows/ci.yml` |
| `3e9880c` | 13 Sep | `docs:check-budget-envelope` added to §30 |

**None of them changed policy.** Each corrected a description that had drifted
from what the repository actually does, which §39 requires rather than merely
permits. The authority model, risk classification, and every security, privacy,
accessibility, testing and release obligation are unchanged from the ratified
version.

**Three of the four were compelled by the handbook's own gate.**
`docs:check-handbook-gate` fails CI unless §30's stage list matches
`package.json` and `.github/workflows/ci.yml`, so adding a gate stage *forces* an
edit to §30. Two controls were therefore pulling against each other: this ADR's
checksum says the governing bytes are frozen at ratification, and §30 says those
bytes must change whenever the gate does. A checksum pinned to a ratification
event cannot survive a section that is mechanically required to change. This was
not an oversight that better discipline would have prevented; it was two correct
controls with incompatible assumptions, and the weaker one lost silently.

**It went unnoticed because nothing recomputes it.** The repository mechanically
checks the gate list, documentation anchors, the migration manifest and the
budget envelope. It has no check for this. The one control in this ADR meant to
detect substituted bytes was, in practice, a sentence asking someone to remember
— and on the evidence above, six days of ordinary work is enough to forget.

**Decision: OJ Florendo re-ratified the current committed bytes on 17 September
2026,** after reviewing the four commits above and confirming that none alters
policy.

- **Effective date:** 17 September 2026
- **Effective checksum (SHA-256 of the committed file, LF line endings, at
  `3e9880c`):**
  `ae68ad305f292d7dc0c2708f6e1c73544eb884a68995a09515624874c6b5b021`

**The version is deliberately unchanged.** Re-ratification settles *which bytes*
carry the owner's approval; it is not a new handbook version, because no policy
moved. The Versioning rule requires a changelog entry for a ratified version, and
this is not one — recording a changelog entry here would assert a policy change
that did not happen.

**The gap is now closed mechanically.** The owner approved the R2 plan on
17 September 2026 and `docs:check-handbook-checksum` was built the same day. It
recomputes the handbook's SHA-256 and compares it to the value recorded above,
and it runs as stage 4 of the required gate — in `package.json`, in §30, and as
its own step in `.github/workflows/ci.yml`, the three copies
`docs:check-handbook-gate` holds in agreement.

It normalises CRLF to LF before hashing, and this repository is why that is not a
formality: `.gitattributes` stores the handbook as LF while a Windows working
copy of it is CRLF on disk, so hashing the raw bytes passes in CI and fails
locally on the identical, untampered file. That is the 8 September defect above,
still live in the working tree. The normalisation was verified byte-exact against
git's own clean filter rather than assumed.

**This entry is the first change to go through the new rule.** Adding the stage
edited §30, which changed the handbook's bytes from `ae68ad30…` to the value
recorded above, which the same commit had to record here — the ordering the
approved plan predicted, and the mechanism working rather than a defect in it.

What the check proves is bounded: that the handbook and this ADR agree. It cannot
prove the owner ratified anything, and updating the recorded value to clear a red
gate, rather than because the change was approved, defeats the control entirely.

## Rollback or migration

Before publication, remove the candidate files. After publication, revert the
adoption commit through a reviewed pull request; do not rewrite history.

## Related decisions

- `docs/ENGINEERING_HANDBOOK.md`
- `docs/adr/0001-contact-form-email-boundary.md`
- Project Zero Strategic Handoff, 28 July 2026
