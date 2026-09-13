# ADR-0020: Use the Gemini paid tier for visitor input

- Status: Accepted — owner decision 12 September 2026; console-confirmed 13 September 2026
- Date: 2026-09-12
- Owner: OJ Florendo
- Risk: R2 for the decision and this record; confirming or changing the Google
  project's billing tier is an R3 account action reserved to the owner
- Related: [ADR-0015](0015-durable-budget-and-provider-order.md) (Gemini-primary
  routing and the durable reservation ledger),
  [ADR-0006](0006-retrieval-grounded-portfolio-assistant.md),
  [ADR-0014](0014-luna-gemini-fallback.md) (superseded provider order)

## Context

E.V sends visitor questions to Google's Gemini API. Google's published pricing
distinguishes a Free Tier from a paid tier on one axis that is not about money:
the pricing table marks free-tier traffic **"used to improve our products: Yes"**
against **"No"** for paid. Free-tier input is therefore retained and used by the
provider for its own model development; paid-tier input is not.

E.V accepts arbitrary free-text questions from anonymous visitors. The browser
guard stops obvious personal, financial and credential data before transmission,
but a guard is a filter, not a boundary: a visitor can type anything into a box
on a public website, and some of it will be about them.

This was left open when E.V was deployed on 12 September. It was recorded in
`docs/state/CURRENT.md` as "a threat-model decision, not only a billing one" and
marked as needing a decision before activation. Nothing in either repository
records which tier the project is on, and no field exists that could carry it —
`gemini_account_verified` in `settings.py` is explicitly an operator assertion
about spending caps and headroom, not about billing enrolment or terms.

Handbook §27 requires that an AI assistant must not collect or retain visitor
personal data by default, and that any transcript storage, analytics or
human-review workflow needs separate R2 approval and clear disclosure. Routing
visitor input into a provider's training corpus is the same exposure in a
different place: the data leaves the visitor's control, is retained, and is used
for a purpose they did not ask for. The site makes no disclosure to that effect
and should not have to.

## Decision

**Use the Gemini paid tier for all E.V traffic.** Do not enable or fall back to
the Free Tier for any visitor-facing path, including testing against production
content.

The cost argument does not compete with the privacy one. Measured on
12 September, an answered question costs **$0.0024** against a **$0.04**
per-attempt reservation. At roughly 150 answers per month that is about
**$0.36/month**, and the application's own caps bound the worst case at $0.40 per
UTC day and $2.00 per UTC month regardless. The Free Tier would save a sum too
small to weigh against visitor questions becoming third-party training data.

The owner's reasoning, recorded here because it is the deciding argument rather
than a footnote: the assistant is going to be paid for in production anyway, so
it should be exercised on the tier it will actually run on. Discovering a
paid-tier behaviour difference after launch — in rate limits, quota behaviour or
model routing — would be a failure in front of the people this is meant to
impress. Testing on the tier you will ship on is the cheaper mistake.

## Alternatives considered

**Free Tier.** Rejected. It costs nothing and gives away the one thing that is
not ours to give. It would also create a disclosure obligation: telling visitors
their questions are used to improve a third party's products. The honest version
of that notice would deter exactly the enquiries the assistant exists to serve.

**Stay undeclared.** Rejected — this is the current state, and it is why nothing
records the tier. An unrecorded dependency on a billing setting is a setting that
gets changed by accident, or discovered during an incident.

**Fold it into ADR-0015.** Rejected. ADR-0015 is about provider order, routing
and the reservation ledger. A decision about where visitor data goes and on what
terms is a privacy boundary and belongs in its own record, findable by that
question rather than by knowing which routing ADR happens to mention it.

## Security and privacy impact

This is the point of the decision. Paid-tier terms mean visitor questions are not
retained for provider model training. Combined with the existing controls — no
transcript storage, no question text in the reservation ledger (ADR-0015), no
analytics, and the browser guard — the assistant's data exposure to third parties
is bounded to what is needed to answer the question in front of it.

The residual exposure is honest and should be stated: questions still transit to
Google and are processed under Google's paid API terms and retention policy. Paid
tier means "not used to improve their products", not "never stored". No new
secret, credential or personal datum is introduced by this record.

## Operational and performance impact

None to the runtime. Provider order, timeouts, the 1024-token output cap, the
$0.04 reservation and the 40/200 attempt and $0.40/$2.00 money caps are unchanged
and remain owned by ADR-0015. If the existing `GEMINI_API_KEY` already belongs to
a paid project, no deployment is required at all.

## Consequences and trade-offs

- E.V now has a running cost that is real but negligible against its caps.
- **The tier is not verifiable from the repository.** No code path, schema field
  or health endpoint reports it, and this ADR deliberately does not invent one —
  a field asserting a billing state the application cannot observe would be a
  claim, not a check. Verification is by console inspection, recorded below.
- A key rotated from a different Google project silently changes the applicable
  terms. Tier must therefore be re-confirmed whenever `GEMINI_API_KEY` or
  `GEMINI_PROJECT_ID` changes, not only at first activation.

## Verification

Owner action, R3, in the Google console: confirm the project behind the deployed
`GEMINI_API_KEY` has billing enabled and is on the paid tier, then record the
date below.

- Confirmed on: _pending_
- Project id checked: _pending_

If a new paid-project key is issued, set it with `fly secrets import` for
`GEMINI_API_KEY` and `GEMINI_PROJECT_ID`. Each secret change restarts the
machine; the durable ledger on `/data` survives restarts, so no allowance is lost
and no ledger may be re-initialised to recover one.

## Rollback or migration

There is nothing to roll back in code. Reverting the decision would mean moving
to the Free Tier, which is a privacy regression and would require a new ADR
superseding this one, a visitor-facing disclosure, and explicit owner approval.
Disabling answering entirely — by unsetting `ASSISTANT_SERVICE_URL`, per the
corpus runbook — remains the fast path if the provider relationship must be cut,
and leaves the portfolio fully usable.

## Console confirmation, 13 September 2026

Confirmed by the owner in Google AI Studio against project `EVSmartAssistant`,
which resolves the "confirmation pending" status this ADR carried:

- The project is on **Tier 1**, a paid tier. The decisive evidence is not the
  badge but the billed usage — **£0.02 across 17 August to 13 September 2026**.
  Free-tier traffic is not billed at all, so a non-zero invoice is positive proof
  the traffic is not on the tier whose data is used to improve Google's products.
- A **monthly spend cap of £5.00** is set, £0.02 consumed, resetting on the first
  of each month (PST).

Two things about that cap, so it is not credited with more than it does. Google
marks it **Experimental** and warns that *"overages may occur during ~10 minute
latency"*, so it is a backstop, not a hard bound — the controls that actually
bound spend remain the reservation ledger in
[ADR-0015](0015-durable-budget-and-provider-order.md) and the per-attempt cap.
It also covers Gemini API usage only, not other Google Cloud products in the same
project.

**The console reports GBP; the ledger counts USD micro-dollars.** The US$0.40
daily and US$2.00 monthly service limits, and the US$0.04 reservation, are not
denominated in the currency the invoice arrives in. At present the £5.00 cap sits
comfortably above the service's own US$2.00 monthly ceiling plus the one-off
qualification capture, so nothing is at risk — but the two figures must not be
compared directly, and a rate move changes the headroom without changing either
number.
