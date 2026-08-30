# Proposed: Engineering Handbook v1.2.0

- **Status:** **DRAFT — proposed, not ratified, not governing.**
- **Date:** 2026-08-28
- **Prepared for:** OJ Florendo, for review and explicit ratification
- **Governing version today:** **v1.1.0**, unchanged at `docs/ENGINEERING_HANDBOOK.md`

## What is in this directory

| File | What it is |
| --- | --- |
| `ENGINEERING_HANDBOOK-v1.2.0-DRAFT.md` | The complete proposed handbook, ready to become the governing file if ratified |
| `handbook-v1.2.0.diff` | The exact unified diff against the governing v1.1.0 — **10 hunks, ~161 lines added, ~16 removed** |
| `README-handbook-v1.2.0.md` | This summary |

**Drafting this is not ratification.** The governing file is untouched, and
until you ratify this exact version, v1.1.0 applies in full — which means the
assistant may not be published without the maturity label v1.1.0 requires.

## Why an amendment is required rather than an exception

This is the part worth being precise about, because it is what forced a whole
version rather than a smaller instrument.

v1.1.0 §49.1 authorises the assistant *"only as a narrow, optional **beta**"*.
Read strictly — and §3 requires it be read strictly, since a stated preference
sits at authority level 7 and cannot silently amend the handbook — **"beta" is a
condition of the authorisation, not a UI string.**

§46 then closes the obvious route: exceptions must be *narrow and time-limited*,
and **"permanent policy changes require a new handbook version."** An exception
record therefore **cannot** legitimately remove the label permanently. That is a
hard finding, not a preference, and it is why this is v1.2.0.

## The five changes

### 1. §49.1 — authorisation is no longer permanently conditioned on "beta"

*"only as a narrow, optional **beta**"* becomes *"as a **narrow, optional
feature**"*, with stable public release permitted once ADR-recorded graduation
criteria are met, the gate is green, and you approve.

**Two obligations were added, not removed:**

- a **permanent truthful capability disclosure** — what it answers from, that
  answers are sourced, that it is not OJ. Explicitly *not* a maturity label, so
  it survives graduation and may never be removed;
- a prohibition on **silent degradation** — it must fail visibly and offer the
  human route, at every maturity stage.

### 2. §49.6 — labels are a stage, with an evidence-based graduation mechanism

Retitled *Feature maturity labels and graduation*. Labels are required **while
work is experimental**, not indefinitely.

Graduation requires all six of: criteria recorded in the ADR **before** launch;
criteria met and evidenced reproducibly; a green gate on the unchanged
candidate; security, privacy, accessibility, performance and cost obligations
re-verified; the capability disclosure retained; and **your explicit approval**.

The "recorded before launch" condition is the load-bearing one — it is what
distinguishes a criterion from a rationalisation written to fit the result.

A **regression clause** is added: a graduated feature that stops meeting its
criteria is fixed or relabelled. Maturity is not a ratchet.

### 3. §48 Track C — reframed as a product, not as coursework

*"Instructor-required AI assistant beta"* becomes *"Portfolio AI assistant as a
client-ready, reusable product"*. A one-off external prompt is no longer the
product's permanent governance identity.

**Nothing in Track C was weakened.** Two requirements were *added* — a committed
evaluation set with pre-agreed thresholds, and an expectation that corpus,
prompt and deployment target are per-deployment configuration so a second
instance is a deployment rather than a fork.

**One wording change to flag explicitly:** "The main website must remain
**useful** when the assistant is unavailable" became "must remain **fully**
useful". That is a strengthening, and it is called out here so it is not a
surprise in the diff.

### 4. §10 — the ADR trigger no longer assumes a beta

*"the portfolio AI assistant before public beta"* becomes *"before its first
public release and again before any change of maturity status"*. Graduation now
itself requires a decision record.

### 5. §52 — a v1.2.0 adoption checklist

Eight steps, with the v1.1.0 checklist retained as §52.1 for the record. It
states plainly that until you ratify, v1.1.0 governs and non-beta copy may not
ship.

## What is explicitly preserved

Verified mechanically against the draft, not asserted: authority and conflict
resolution (§3), R0–R3 (§11), stop conditions (§13), Git policy (§14),
accessibility (§19), performance (§20), the security model (§21), secrets (§22),
CSP and headers (§23), dependency and supply-chain security including the
high/critical release block (§25), privacy (§27), testing and the required gate
(§29–§32), release, deployment and rollback (§33–§35), observability (§36), AI
engineering (§40–§45), the exception policy (§46), and every
truthful-representation rule in §6.2 and §49.

Every §49.1 obligation on the assistant — grounded answers, no invented claims,
injection resistance, rate and cost limits, no personal data, no retained
conversations, keyboard accessibility, human handoff, never presenting as OJ —
is unchanged and now explicitly stated to apply *at every maturity stage*.

**Graduation changes what the feature may be called. It does not change what the
feature must do.**

## What this amendment does not do

- It does not authorise publishing the assistant. That still needs the
  graduation criteria met, the paid evaluation run, and your R3 approval.
- It does not relax any security, privacy, accessibility, cost, evaluation,
  rollback, or honesty requirement.
- It does not grant the assistant stable status. It creates the *route* to it.

## If you ratify

Follow §52 of the draft: ratify this exact version, move it to
`docs/ENGINEERING_HANDBOOK.md`, record the change and checksum in
`docs/adr/0000-handbook-adoption.md`, confirm ADR-0006's graduation criteria
predate launch, reconcile the documents that still describe the assistant as a
beta, and run the gate.

If you would rather amend the wording first, edit the draft and I will
regenerate the diff — it is mechanically produced from the two files, so it
cannot drift from what the draft actually says.
