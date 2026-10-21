# ADR-0032: Services — the owner builds, and every project is quoted

- Status: Accepted — owner decisions of 21 October 2026 (the direction, the
  headline, the games label and the founding offer) and his review of the
  rendered home page the same day ("Approved. The new top section and
  services look good.").
- Date: 2026-10-21
- Owner: OJ Florendo
- Risk: R1. Owner-approved public content on the home page, its share card
  and its search descriptions. No API, provider, secret, data boundary,
  runtime origin or CSP change.
- Amends: [ADR-0031](0031-build-check-services-and-prices.md) D1, D2 and D4
  (the hero), and the home share-card line in D5. D3's personal-data rule
  stands; D4's contact section is rewritten in its own step.

## Context

ADR-0031 led with an "AI build check" and paid fixes: reviewing and repairing
apps that other people built with AI tools, at fixed prices.

On 21 October 2026 the owner withdrew that lead. He wants to be known as a
builder of AI automations, workflows, agents and games, all built in public,
with websites and care plans on the side. Checking and fixing other people's
apps is security and debugging work outside what he has built and tested, and
it carries refund and liability risk he does not want. He also chose not to
publish fixed prices: projects differ, and a published price caps what a
client who values the work more would pay.

## Decision

**D1 — The offer.** Four services, in this order:

1. **AI automations and workflows** — the lead offer. **Available now.**
2. **AI agents** — agents that ask before they act. **Available now.**
3. **Games** — Roblox games built with Roblox Studio and Claude Code.
   **Future roadmap.**
4. **Websites and care plans** — websites, and a monthly care plan only for
   what the owner has built, with no reply-time promise. **Available now.**

The AI build check, the AI answer test, fixes before launch and the
launch-ready bundle are retired.

**D2 — Games label.** Games stay **Future roadmap** under handbook §6.2 until
the owner's first game is released, and then move to **Available now** by a
reviewed change.

**D3 — No fixed prices.** No amount appears on the page. Every project starts
with a free call of about 30 minutes, then a written quote with the scope,
timing and total price before any work starts. The quote is the total: the
owner is not VAT-registered, so no VAT is added, and the client's hosting and
AI costs stay in the client's accounts. The founding offer stays: the first
five clients get 20% off their first project in return for permission to
publish an honest case study; care plans are not discounted.

**D4 — Hero and example panel.** The hero carries the owner's chosen line
word for word: "I design and build AI agents and automations for businesses
and creators, and I make games, all built in public." Its main action is
"Start a project". The example panel shows an illustrative automation that
handles one enquiry, labelled as not a client's system. "How it works" runs
from the task, to a free call and a written quote, to the build and handover.

**D5 — Share card and search.** The home share card carries "I design and
build AI agents and automations, all in public." The search and structured
data descriptions follow the hero line.

**D6 — Building in public.** The scope note tells clients that the owner
builds in public but never shares their data or details without permission.

## Alternatives considered

- **Keep the build check as a side offer.** Not chosen: it is the work the
  owner wants to stop leading with, and it carries the most liability.
- **Show "from" prices.** Not chosen: the owner does not want any published
  amount to cap a project's price. A budget question in the enquiry form,
  planned for the contact step, does the filtering a floor price would.
- **Label games Available now.** Not chosen: no game is released yet.

## Consequences

- The unit tests now block any currency amount in the home page's copy, and
  any return of the build check or fixes offers.
- The pricing paper of 20 October 2026 is kept for the owner's own quoting,
  not published.
- The contact section, its enquiry types and a call-booking step change next,
  in their own step. Until then its copy still mentions the build check.
- E.V's documents still describe the ADR-0029 services until the corpus update
  after phase 15a (ADR-0029 D5).

## Verification

On 21 October 2026: the unit tests (1,079 passed), type check and lint
passed, the home page had no horizontal scroll at 390 px, and the owner
approved the rendered top section and services. Still to run before merge:
the home browser tests on a production build.

## Rollback

Revert the commit through a reviewed pull request; do not rewrite history.
