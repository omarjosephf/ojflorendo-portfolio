# OJ Assistant — what it costs to run, and what it could be sold for

- **Date:** 2026-08-28
- **Status:** Internal working note. **Not published, and not a public price
  list.** No figure here appears on the website or in the assistant's corpus,
  and the assistant is instructed to refuse pricing questions and hand off.

This exists because a service you cannot cost is a service you cannot sell. The
numbers below are traceable to committed configuration and published vendor
pricing rather than estimated.

## What one answered question costs

Measured against the committed defaults, not guessed:

| Input | Value | Source |
| --- | --- | --- |
| Model | `claude-haiku-4-5` | `settings.py` |
| Retrieved passages | 4 | `settings.py` (`retrieval_top_k`) |
| Answer ceiling | 1024 tokens | `settings.py` (`answer_max_tokens`) |
| Haiku 4.5 pricing | $1.00 / 1M in, $5.00 / 1M out | Anthropic |

A question sends roughly **2,500 input tokens** (4 passages of up to ~512 tokens,
plus the system prompt and the question) and produces roughly **400 output
tokens** for a cited answer.

- Input: 2,500 ÷ 1M × $1.00 = **$0.0025**
- Output: 400 ÷ 1M × $5.00 = **$0.0020**
- **≈ $0.0045 per answered question** — under half a cent.

Refusals cost less: they generate far fewer output tokens. Input carrying the
visitor's own personal, financial or credential data costs nothing, because the
browser guard stops it before transmission and it never reaches the provider.

**Prompt-injection and policy probes now cost a full answer.** The browser no
longer answers them locally — product policy has a single authority, the
assistant service — so each probe consumes a rate-limit slot and a paid call.
That was the accepted cost of putting policy in one place, and spend is bounded
by the route throttle, the daily allowance and the provider-side cap rather than
by a pattern list in the browser.

## What the whole thing costs per month

**Include compute.** Inference is the smaller half, and a cost statement that
omits the machine is not a cost statement.

| Line item | Monthly |
| --- | ---: |
| `cited-demo` Fly app (pre-existing, always-on) | $3.32 |
| `oj-assistant` Fly app (scale-to-zero) | ~$0.00 |
| Inference at ~150 answers/month | $0.20–0.68 |
| **Total** | **≈ $3.52–4.00** |

Scale-to-zero is what makes this realistic rather than nominal: two always-on
machines would cost $6.64 before a single token was spent.

**Two ceilings, and only one is real.** The service's daily answer allowance
(40) is an operational bound within one process lifetime — it lives in process
memory and resets whenever the machine starts, which under scale-to-zero is
routine. It is **not** a monetary guarantee. The Anthropic account spend cap is
the only hard financial ceiling and is set by hand in the console.

## What this could be sold as

An honest framing for a client conversation, with the reasoning visible.

**Setup: £400–800.** Corpus preparation from the client's documents, writing
their system prompt (role, tone, scope, guardrails, handoff), building a client
evaluation set, deployment, and integration into their site. The evaluation set
is the part most competitors do not offer and the part that makes quality a
measurement rather than a claim.

**Retainer: £25–50/month.** Hosting, provider spend, monitoring, corpus updates,
and a monthly report. Direct cost is under £5, so the margin is real, but the
retainer is genuinely for maintenance rather than for compute: corpora go stale,
and a stale assistant is worse than none.

**Per-conversation cost to quote honestly:** under half a penny. Useful to state
plainly, because it reframes the conversation from "what does AI cost" to "what
does it cost you when a customer cannot find an answer".

## The monthly report a retainer should produce

The service's `/metrics` endpoint supplies exactly this, and nothing beyond it:
questions answered, questions the corpus did not cover, times unavailable,
refusal rate, p50 and p95 latency, rejected-citation count, and allowance
consumed.

**The refusal rate is the commercially useful number.** A rising one means the
corpus has a gap — which is a specific, actionable finding and the natural
prompt for the next piece of work.

No question text, no transcripts, and no per-question analytics are collected,
so the report is privacy-safe by construction rather than by redaction.

## The honest limitation to state before selling this

The assistant is a **first-party React component**. That is correct for a
Next.js site and matches how the reference implementation this was benchmarked
against is built. A client on WordPress, Wix, or Squarespace would need an
embeddable script, which does not exist yet.

That is the boundary between "works on my site" and "sellable to any site". It
should be said before taking money, not after — and it is a well-defined
follow-on project rather than a defect.
