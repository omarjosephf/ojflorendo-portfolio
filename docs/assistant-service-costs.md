# E.V — what it costs to run, and what it could be sold for

- **Date:** 2026-09-19
- **Supersedes:** the 28 August 2026 version of this file, retained at the end
- **Status:** Internal working note. **This file lives in a public repository.**
  No figure here appears on the website or in the assistant's corpus, and the
  assistant is instructed to refuse pricing questions and hand off — but anyone
  who opens the repository can read it. See *A note on where this lives*.

This exists because a service you cannot cost is a service you cannot sell. The
numbers below are traceable to committed configuration, recorded measurements
and published vendor pricing rather than estimated.

## Why this was rewritten

The 28 August version priced `claude-haiku-4-5` and assumed a scale-to-zero
machine. Neither has been true since 13 September 2026, when the Gemini/Luna
runtime was deployed. It was wrong in three ways that pulled in different
directions:

| Claim on 28 August | What is true now |
| --- | --- |
| Model `claude-haiku-4-5` at $1.00 / $5.00 per 1M tokens | `gemini-3.5-flash-lite` at $0.30 / $2.50 per 1M tokens |
| ≈ $0.0045 per question, estimated from token counts | ≈ $0.0024 per answer, **measured** |
| `oj-assistant` scales to zero, ≈ $0.00/month | A warm 1.5 GB Machine, ≈ $8.40/month |
| Total ≈ $3.52–4.00/month | Total ≈ $12/month including `cited-demo` |
| A daily allowance of 40 held in process memory | A durable SQLite reservation ledger on a mounted volume |

The inference half got **cheaper** and the compute half got **three times more
expensive**, so the headline monthly figure roughly tripled while the
per-question figure nearly halved. [ADR-0007](adr/0007-conversational-turns-for-the-assistant.md)
corrected the compute figure on the day the warm machine was accepted; this file
never picked that correction up, which is the drift being closed here.

## What one answered question costs

**Measured, not estimated.** Six real calls against `gemini-3.5-flash-lite` on
12 September 2026, using the actual system prompt and four real corpus
documents, recorded in [`docs/state/CURRENT.md`](state/CURRENT.md) under *The
price bound, measured*:

| Input | Value | Source |
| --- | --- | --- |
| Primary model | `gemini-3.5-flash-lite` | [runtime v3](runbooks/assistant-runtime-v3.md) |
| Availability backup | `gpt-5.6-luna` | [runtime v3](runbooks/assistant-runtime-v3.md) |
| Retrieved passages | 4 | `settings.py` (`retrieval_top_k`), in `cited` |
| Answer ceiling | 1024 tokens | `settings.py` (`answer_max_tokens`), in `cited` |
| Gemini paid rates | $0.30 / 1M in, $2.50 / 1M out **including thinking** | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), checked 19 September 2026 |
| Observed cost per call | **$0.0021 – $0.0027** | measurement, 12 September 2026 |
| Observed thinking tokens | **0** | measurement, 12 September 2026 |
| Observed visible output | 147–388 tokens against the 1024 cap | measurement, 12 September 2026 |

**≈ $0.0024 per answered question** — about a fifth of a penny.

Two things that make this stronger than the figure it replaces, and one that
makes it weaker.

**Stronger: it is a measurement, and thinking is included.** Gemini bills
thinking tokens at the output rate, and `maxOutputTokens` bounds thinking and
visible output together. In all six calls `totalTokenCount` equalled
`promptTokenCount + candidatesTokenCount` exactly, so the absence of a thinking
count is a real zero rather than unreported usage. A cost model that ignored
thinking would be unsound on this provider; this one does not have to.

**Stronger: the application commits money before it spends any.** Each dispatch
reserves **$0.04** in a durable SQLite ledger before any network request, and
nothing refunds it — not completion, error, timeout, cancellation or an
incomplete usage report. The measured cost is about **1/17th** of what is
reserved, so the ledger is conservative by a wide margin. A fallback attempt
carries its own reservation.

**Weaker: the sample is six calls of one question.** `CURRENT.md` says so itself
and recommends the same measurement across the critical-core questions — about
50 calls for roughly $0.12 — before publication. Until that runs, treat
$0.0024 as one well-instrumented data point, not a distribution.

Refusals cost less; they generate far fewer output tokens. Input carrying a
visitor's personal, financial or credential data costs nothing, because the
browser guard stops it before transmission and it never reaches the provider.
Prompt-injection and policy probes **do** cost a full answer: the browser no
longer answers them locally, because product policy has a single authority.
That was the accepted cost of putting policy in one place, and spend is bounded
by the controls below rather than by a pattern list in the browser.

## What the whole thing costs per month

**Include compute.** Inference is now the small change, and a cost statement
that omits the machine is not a cost statement.

| Line item | Monthly | Basis |
| --- | ---: | --- |
| `oj-assistant` Machine, 1.5 GB, warm | $8.40 | [ADR-0007](adr/0007-conversational-turns-for-the-assistant.md) |
| `ev_budget` volume, 1 GB | $0.15 | $0.15/GB-month, [Fly pricing](https://fly.io/docs/about/pricing/) |
| Inference, at the envelope's ceiling of 50 answers | $0.12 | 50 × $0.0024 measured |
| **E.V subtotal** | **≈ $8.67** | |
| `cited-demo` Machine, pre-existing and separate | $3.32 | [ADR-0007](adr/0007-conversational-turns-for-the-assistant.md) |
| **Total across both apps** | **≈ $11.99** | |

Volume snapshots are configured with five-day retention and are charged at
$0.08/GB-month after the organisation's first 10 GB, which is shared rather
than assumed available.

**The compute figure cross-checks against published rates.** Fly lists
shared-cpu-1x at $5.70/month for 1 GB and $10.70 for 2 GB, which implies about
$5.00 per GB of RAM over a $0.70 base, so 1.5 GB lands near **$8.20**. That is
close to the $8.40 recorded in ADR-0007 and does not replace it: the published
table was read for the Amsterdam region while the Machine runs in London, and
neither figure includes tax or account-level charges. **Only the invoice is
authoritative, and no one has read it into this repository.**

**One arithmetic discrepancy, flagged rather than propagated.** ADR-0007's own
table sums to $11.92–$12.40 but states a total of "≈ $11.75", which is below its
own minimum. Its inference row also still carries the Haiku-era range of
$0.20–0.68. The component figures in that ADR are the ones used above; its total
line is not. Correcting the ADR is a separate decision for the owner.

## What actually bounds the spend

Three ceilings exist and they are not equally real. Ranked by how much they can
be relied on:

**1. The reservation ledger — the real bound.** A durable SQLite ledger on a
mounted volume (`vol_r1j28g1m15o9j3pr`, initialised 12 September 2026) commits
$0.04 per attempt before dispatch. The live service envelope is **40 attempts
per UTC day and 200 per UTC month, at $0.40 per day and $2.00 per month**,
across both providers, whichever binds first. It survives restarts, which the
old in-process counter did not. See [durable budget operations](runbooks/durable-budget.md)
and [ADR-0015](adr/0015-durable-budget-and-provider-order.md).

**2. The Google console spend cap — a backstop, not a bound.** £5.00 per month,
set by hand, £0.02 consumed between 17 August and 13 September 2026. Google
marks it *Experimental* and warns that overages may occur during roughly ten
minutes of latency, so it catches a runaway rather than preventing one. It also
covers Gemini API usage only, not other Google Cloud products in the same
project. Recorded in [ADR-0020](adr/0020-gemini-paid-tier-for-visitor-input.md).

**3. Nothing bounds hosting.** The Machine and volume bill whether or not a
single question is asked. That is the $8.55 above, and it is the floor.

**The money limit binds long before the attempt limit.** At a full $0.04
reservation, $0.40 per day admits **10 answers a day** and $2.00 per month
admits **50 a month** — not the 40 and 200 the attempt counters allow. Because
the measured cost is about 1/17th of the reservation, the service will stop
answering at roughly $0.12 of actual monthly inference. That is loss
containment working as designed, and it is also the constraint the next section
has to respect.

**The console reports GBP; the ledger counts USD micro-dollars.** The two must
not be compared directly, and a rate move changes the headroom without changing
either number.

## What this could be sold as

An honest framing for a client conversation, with the reasoning visible.

**Setup: £400–800.** Corpus preparation from the client's documents, writing
their system prompt (role, tone, scope, guardrails, handoff), building a client
evaluation set, deployment, and integration into their site. The evaluation set
is the part most competitors do not offer and the part that makes quality a
measurement rather than a claim.

**Retainer: £25–50/month.** Hosting, provider spend, monitoring, corpus updates,
and a monthly report.

**The margin claim has changed and the old one should not be repeated.** The
28 August version said direct cost was "under £5". For E.V it is now about
**$8.70/month**, and about $12.00 with `cited-demo` alongside it. The retainer
still covers a single instance, but the headroom is narrower than that line
implied, and the comparison crosses a currency boundary this file deliberately
does not convert. Quote from the dollar figure and a current rate, not from
memory.

**A per-client instance is cheaper than E.V is.** Most of the $8.40 is a 1.5 GB
machine held warm to keep a neural embedding model resident. ADR-0007 records
that searching a corpus this size does not require that model, and that removing
it would drop the machine to 512 MB and the total to roughly $6.60, with startup
falling from minutes to about a second. It is deferred because it changes
retrieval and therefore needs its own evaluation evidence. A client deployment
sized after that work would cost materially less than the figures here.

**The volume assumption has to be stated, because the current one cannot be
sold.** The 28 August version priced a retainer around ~150 answers a month.
The live envelope admits at most **50**. Selling a volume above that requires
raising the reservation envelope first, which the runbook defines as an explicit
reviewed budget decision — not a number to quietly change in a quote.

**Per-conversation cost to quote honestly:** about a fifth of a penny. Useful to
state plainly, because it reframes the conversation from "what does AI cost" to
"what does it cost you when a customer cannot find an answer".

## The monthly report a retainer should produce

The service's `/metrics` endpoint supplies exactly this, and nothing beyond it:
questions answered, questions the corpus did not cover, times unavailable,
refusal rate, p50 and p95 latency, rejected-citation count, and allowance
consumed. Metrics retain each configured role and model and distinguish known
subtotals from unknown counts.

**The refusal rate is the commercially useful number.** A rising one means the
corpus has a gap — a specific, actionable finding and the natural prompt for the
next piece of work.

No question text, no transcripts, and no per-question analytics are collected,
so the report is privacy-safe by construction rather than by redaction.

## The honest limitations to state before selling this

**It is a first-party React component.** That is correct for a Next.js site and
matches how the reference implementation this was benchmarked against is built.
A client on WordPress, Wix or Squarespace would need an embeddable script, which
does not exist yet. That is the boundary between "works on my site" and
"sellable to any site", and it should be said before taking money rather than
after. It is a well-defined follow-on project rather than a defect.

**The per-answer figure rests on six calls of one question.** Run the
critical-core measurement, about 50 calls for roughly $0.12, before quoting it
to anyone outside the project.

**No invoice has been read into this repository.** Every compute figure above is
a published rate or a recorded estimate. The Gemini side has one real billed
number, £0.02 across four weeks, which is consistent with the measurement but far
too small to validate a monthly model.

## A note on where this lives

This file sits in the public `ojflorendo-portfolio` repository. The 28 August
version described itself as "not published", which was true of the website and
the assistant's corpus — verified: no price, rate or retainer figure appears in
`src/data/assistant-corpus*` — but not of the file itself. Anyone who opens the
repository can read the setup and retainer figures above.

That may be entirely acceptable, and transparent pricing is a defensible
position. It is flagged because it should be a decision rather than an accident.
Moving *What this could be sold as* into a private note, and leaving the
operating costs here, would separate the two cleanly.

## Superseded: the 28 August 2026 figures

Retained so the change is auditable rather than silent. **None of this is
current.**

| Input | Value as recorded on 28 August 2026 |
| --- | --- |
| Model | `claude-haiku-4-5` |
| Pricing | $1.00 / 1M in, $5.00 / 1M out |
| Estimated request | ~2,500 input tokens, ~400 output tokens |
| Estimated cost | $0.0025 input + $0.0020 output = **$0.0045** per question |
| `cited-demo` Fly app | $3.32/month |
| `oj-assistant` Fly app | scale-to-zero, ~$0.00/month |
| Inference at ~150 answers/month | $0.20–0.68 |
| Stated total | **≈ $3.52–4.00/month** |
| Daily answer allowance | 40, held in process memory, reset on every machine start |

The management panel's RAG configuration section reads its cost inputs from
`src/lib/management/rag-cost.ts`, which carries a `verifiedOn` date and shows a
staleness caveat whenever those inputs predate the deployed runtime. That file
is the one place to update when any figure here changes.

## Sources

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) — checked 19 September 2026
- [Fly pricing](https://fly.io/docs/about/pricing/) — checked 19 September 2026
- [`docs/state/CURRENT.md`](state/CURRENT.md) — the 12 September measurement
- [ADR-0007](adr/0007-conversational-turns-for-the-assistant.md) — warm-machine compute correction
- [ADR-0015](adr/0015-durable-budget-and-provider-order.md) — durable budget and provider order
- [ADR-0020](adr/0020-gemini-paid-tier-for-visitor-input.md) — paid tier, console confirmation
- [durable budget operations](runbooks/durable-budget.md) — enforced limits and failure behaviour
- [runtime v3](runbooks/assistant-runtime-v3.md) — provider routing and metrics
