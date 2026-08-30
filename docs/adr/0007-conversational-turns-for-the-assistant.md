# ADR-0007: Conversational turns for the portfolio assistant

- **Status:** Proposed — awaiting owner acceptance
- **Date:** 2026-08-30
- **Owner:** OJ Florendo
- **Risk class:** R2 (implementation), with the extraction consequence in E5
  requiring separate owner approval before release
- **Governing policy:** Project Zero Engineering Handbook **v1.2.0**
- **Supersedes:** ADR-0006 **D7** (Stateless. No memory, no session, no
  transcript)
- **Amends:** ADR-0006 **D9** (scale to zero, 512 MB) and **D11** (operating-cost
  statement), on measurements taken during the first deployment

> ADR-0006 D7 is categorical: *"No conversation history, no session identifier,
> no cookie, no storage entry, no transcript."* This record does not reinterpret
> that sentence — it replaces it, and says why the replacement is narrower than
> it sounds.

## Context

### What forced the decision

The assistant shipped as a question box that answers one question at a time.
Each new question replaces the previous answer. Visitors read it as a search
field, not as an assistant, and the owner's own first reaction on seeing the
deployed preview was that it did not feel like talking to anything.

That is a product defect rather than a preference. A visitor who asks *"what
did he build with Python?"* and then *"how long did that take?"* is asking one
question in two parts. Today the second part is answered as though the first was
never asked, which reads as the assistant not listening.

### What D7 was protecting

D7 was not arbitrary. It bought four things:

1. **§49.1 compliance** — *"collect no personal data by default and retain no
   conversations without separate approval"*.
2. **A true privacy notice.** The panel tells visitors their question *"is not
   stored, logged, or used for training"*, and that sentence had to stay true.
3. **A working budget counter.** `DailyCallBudget` is process-local; anything
   requiring cross-request state complicates it.
4. **A small extraction surface.** The anti-extraction guard counts reproduced
   passages **per request**, which is only a meaningful bound if requests are
   independent.

The decision below keeps (1), (2) and (3) intact. It narrows (4), which is why
E5 needs separate approval rather than riding along with this ADR.

### What §49.1 actually permits

§49.1 prohibits **retaining** conversations without separate approval. It does
not prohibit a conversation existing. The distinction is the whole design: a
transcript that lives in one browser tab and is destroyed when that tab closes
is not retained by anyone, and the service that answers from it stores nothing.

## Decision

### E1 — The conversation lives in the browser; the service stays stateless

The transcript is React state in the visitor's tab. There is **no session
identifier, no cookie, no `localStorage`, no database, and no server-side
session**. Closing the panel or reloading the page destroys it, and nothing
anywhere else has a copy.

The service continues to store nothing and log nothing beyond the aggregate
counters already permitted by D8. `DailyCallBudget` is unaffected: it still
counts calls in one process lifetime and knows nothing about who asked what.

**This preserves the privacy notice verbatim.** No wording change is required,
because no new retention is introduced.

### E2 — History carries prior questions and source labels, never prior answers

Each request may include up to four earlier turns. A turn is:

```
{ question: string, sources: string[] }
```

where `sources` are the citation **labels** already shown to the visitor
(for example `Experience`, `Skills and capabilities`).

**Prior answer text is never sent back.** The obvious implementation — replaying
the transcript — would push model-generated passage text across the trust
boundary a second time on every turn, widening precisely the extraction surface
that E5 already has to account for. The earlier question plus the documents it
reached is sufficient to resolve a follow-up, costs a handful of tokens, and
moves that risk almost not at all.

### E3 — Retrieval query is composed, not condensed by a second model call

The retrieval query for a follow-up is built from the previous question and the
current one. There is **no separate condensation call**.

A condensation call — rewriting *"how long did that take?"* into a standalone
question before retrieving — is the textbook approach and is better on awkward
phrasings. It also adds a provider call per turn: more latency on a request path
where latency is already the known weakness, and roughly double the per-turn
cost.

Following D10's rule that evidence moves parameters rather than preference, the
composed query is the baseline and the condensation call is a **benchmark
candidate**, adopted only if the extended evaluation set shows follow-ups
failing in a way composition cannot fix.

### E4 — Four turns, bounded on the server

At most four prior turns travel with a request. The cap is enforced **in the
route handler and again in the service**, not in the component: the browser is
not a trust boundary, and a hand-written request must not be able to submit
forty turns. Each question in the history is bounded by the existing
`ASSISTANT_INPUT_LIMIT`; unexpected fields are ignored rather than echoed, as
they already are for the single-question shape.

An absent or malformed `history` is treated as no history, and the request is
answered as a first turn. This keeps the field optional in both directions: an
older client works against the new service, and the new client works against a
service that has not been updated.

### E5 — The extraction consequence, stated plainly

**This narrows a security property, and needs the owner's explicit approval
before release rather than his approval of this ADR.**

The anti-extraction guard bounds how much of the corpus one *request* can
reproduce. Conversation does not change that bound, but it does make a sequence
of requests easier to conduct as one continuous act, which is the practical form
the risk takes. ADR-0006 already accepted cumulative one-passage-at-a-time
extraction as a residual risk on the grounds that the corpus is public material.
That reasoning does not change here; its exposure increases.

Mitigations: the four-turn cap (E4), the unchanged per-request passage cap, and
no prior answer text in the request (E2).

The honest summary is that this makes an accepted risk somewhat easier to
realise, against a corpus that exists to be read by strangers.

### E6 — Amends D9: one warm machine at 1.5 GB, on measurements

D9 specified `min_machines_running = 0` and `memory = "512mb"`, citing a 263 MB
peak. Both figures were wrong for this workload, and D9 anticipated the check
that found it: *"Cold-start latency must be measured before public launch and
revisited if it makes the experience feel broken."* It was measured. It was
broken.

| Measurement | Value |
| --- | --- |
| Cold start, stopped machine to healthy `/health` | **154 s** |
| Application startup in logs | **3m22s** and **4m03s** |
| Route timeout before it gives up | 20 s |
| Process peak, `VmHWM` on a running machine | **997,320 kB (974 MB)** |
| OOM kill at 512 MB | `anon-rss:406468kB` |
| OOM kill at 1 GB | `anon-rss:875272kB` |

The first visitor after idle therefore did not receive a slow answer. They
received `unavailable`, because the service was still starting when the route
timed out.

**Amended to `min_machines_running = 1` and `memory = "1536mb"`.** The memory
figure is ~50% above measured peak; 1 GB is *below* peak and has failed in
production twice. The 263 MB in D9 was a real measurement of the demo corpus —
2 markdown files against this corpus's 10 documents including a PDF.

Keeping one machine warm has a second effect worth recording: `DailyCallBudget`
no longer resets on every cold start, so the daily allowance means what it says
for the first time. The Anthropic account cap remains the only hard financial
ceiling (D11 unchanged on that point).

### E7 — Amends D11: the operating-cost statement

D11 states a normal operating target *"under £5/month total"*, which assumed
scale-to-zero. A warm machine breaks that assumption, and the figure is
corrected rather than quietly missed:

| Component | Cost |
| --- | --- |
| `cited-demo`, unchanged | $3.32/month |
| `oj-assistant`, 1.5 GB warm | ~$8.40/month |
| Inference at ~150 answers | $0.20–0.68 |
| **Total** | **≈ $11.75/month** |

This is a **target, not a guarantee**, on the same terms as D11.

The cheaper path is known and deliberately deferred: searching 64 chunks does
not require a neural embedding model resident in memory. Removing it would drop
the machine to 512 MB and the total to roughly $6.60, and would cut startup from
minutes to about a second. It is deferred because it changes retrieval, which
requires its own evaluation evidence, and because the owner declined to trim
memory further on the evidence available — correctly, given the two production
OOMs.

## Alternatives considered

**Server-side sessions (rejected).** The conventional design. It would require
a session store, make the privacy notice false, complicate the process-local
budget counter, and add the database that the whole architecture exists to
avoid. It buys nothing a client-held transcript does not, for a single-visitor
conversation that never needs to outlive a tab.

**Full transcript replay (rejected).** Simpler to write, and it sends
model-generated passage text back across the boundary on every turn. E2 exists
because the cheaper option is also the safer one.

**Condensation call now (deferred).** Better quality on awkward follow-ups, at
one extra provider call per turn. Held as a benchmark candidate under D10.

**Do nothing (rejected).** The defect is real: the assistant does not behave the
way a visitor expects an assistant to behave.

## Security and privacy impact

- **Unchanged:** nothing stored, nothing logged, no cookie, no session, no
  personal data collected by default. The privacy notice stays true as written.
- **Unchanged:** the shared secret, the rate limits, the daily allowance, the
  per-request passage cap, the citation re-verification.
- **Changed:** earlier questions from the same visitor now travel with a
  request, and reach the provider. They were already reaching the provider one
  at a time; the difference is that up to four now arrive together.
- **Changed:** cumulative extraction is easier to conduct (E5).

## Accessibility impact

A transcript is a live region problem. Announcing the whole log on every turn
would be unusable with a screen reader, so only the newest answer is announced,
the visitor's own question is not read back to them, and focus stays in the
input rather than being moved to the answer. The panel remains non-modal and
must not trap focus.

## Rollback

`history` is optional on both sides, so the two repositories can be rolled back
independently and in either order:

- Revert the portfolio branch — the service continues to accept requests without
  history and answers them as first turns.
- Revert the service — the portfolio sends a field the service ignores.

No environment variable, secret, corpus, or machine configuration changes with
this ADR except the E6 amendments, which are already deployed and are
independently revertible by restoring the two values in
`fly.oj-assistant.toml`.

## Related decisions

- ADR-0006 — Retrieval-grounded portfolio assistant (D7 superseded here; D9 and
  D11 amended here; D8, D10, D13, D14 unchanged and still governing)
- Handbook §49.1 — Portfolio AI assistant
- Handbook §49.6 — Feature maturity labels and graduation
