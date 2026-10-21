# ADR-0031: Services and prices — the AI build check leads

- Status: Accepted — owner decisions of 20 October 2026 (the niche), 21 October
  2026 (the prices, "as drafted") and 21 October 2026 (this wording, "apply
  the wording as proposed"; the share images and search descriptions, "apply
  … as proposed").
- Date: 2026-10-21
- Owner: OJ Florendo
- Risk: R1. Owner-approved public content on the home page and one enquiry
  label. No API, provider, secret, data boundary, runtime origin or CSP
  change; the accepted enquiry values are unchanged.
- Amends: [ADR-0029](0029-public-identity-joseph-florendo.md) D3 (the offer).
  D1, D2 and D4–D6 stand.

## Context

ADR-0029 D3 fixed four services in order: automation and workflow builds, AI
agents and assistants, an automation audit as the entry offer, and websites as
one line. The home page spoke to "your business" and the task it repeats.

On 20 October 2026 the owner chose a narrower position for remote, worldwide
work won through his own content: "I help founders and creators who built with
AI tools make their app or automation safe, solid and ready to launch, then
automate the busywork." Checking and fixing what AI tools produced is judgement
work, and it matches what the owner has built and tested in public (Cited's
refusal and quote checks, this site's strict security policy).

On 21 October 2026 he approved fixed prices for that offer. Until then the site
showed no prices, and a unit test blocked any.

## Decision

**D1 — The offer.** Four services, in this order, each labelled
**Available now** under handbook §6.2:

1. **AI build check** — the lead offer. About two days of review with a ranked
   fix list and a 30-minute call. £950 (US$1,275); £760 (US$1,020) for the
   first five clients, in return for a published case study. An AI answer
   test for apps with a chatbot or agent, +£450 (US$600).
2. **Fixes before launch** — £500 per day in the quote, minimum two days,
   from £1,000 (US$1,350), with £250 off within 30 days of a check. The
   launch-ready bundle is £3,150 (US$4,200).
3. **Then automate the busywork** — one automation from £1,000 (US$1,350); an
   AI agent that asks before it acts, from £2,500 (US$3,350).
4. **Care plan** — £195 (US$260) a month, only for apps the owner has checked
   or built, with no reply-time promise.

The automation audit is retired; the build check replaces it as the first
step. Websites leave the service list and are named once in the line about
related work.

**D2 — How prices are shown.** Every price is the total the client pays: the
owner is not VAT-registered, so no VAT is added. US dollar prices use the
12-month average exchange rate of US$1.34 to £1, rounded to a tidy figure. The
client's own hosting and AI costs stay in the client's accounts and are
estimated in the check, not added to the price. The founding offer buys
permission to publish an honest case study, never a review.

**D3 — Scope.** The check covers apps built with Lovable, Bolt, Cursor,
Claude Code or similar tools, usually React or Next.js with a Supabase
database, plus any AI chatbot or agent inside them. Tools the owner has not yet
worked with are not listed. Every fix or build starts with a defined task and a
written quote, and anything that handles personal data gets its own privacy
review.

**D4 — Hero and contact.** The hero carries the niche line word for word; its
main action is "Get your app checked". The hero's example panel shows an
illustrative build check, labelled as not a client's app. The contact section
asks "What did you build?". The `freelance` enquiry label becomes "Build
check, fixes or automation"; the accepted values are unchanged.

**D5 — Share images and search descriptions.** Every public page type has a
1200×630 share image drawn from one card design: the home page, About, the
blog, each blog post and each case study. Posts and case studies draw their
card from their own title, so new ones get a card without further work. The
home share card carries "I make apps built with AI tools safe, solid and
ready to launch." Search descriptions are whole sentences under 160
characters, so search results do not cut them mid-word; each case study has
its own written description instead of a cut-off overview. Blog post
descriptions are written by the blog's agents and are not changed here.

## Alternatives considered

- **Keep the ADR-0029 services and add prices.** Not chosen: the services
  spoke to a different buyer, and the owner chose one narrow lead offer.
- **Keep websites as a one-line service.** Not chosen: it dilutes a narrow
  offer. The owner still builds websites, so the line about related work
  names them.
- **Hide prices until the first clients.** Not chosen: the owner wants prices
  fair to both sides and visible, and showing the total is what consumer law
  expects of a published price.

## Consequences

- A unit test now pins every amount on the page to the approved table, so a
  typo cannot publish a wrong price.
- Browser tests check that every public page type names a share image that
  loads, and that its search description is a whole sentence under 160
  characters.
- The founding lines must come off when the five founding places are taken.
- Prices are reviewed every six months or after ten paid projects, and the US
  dollar prices are reset if the rate leaves US$1.30–1.38 to £1.
- E.V's documents still describe the ADR-0029 services until the corpus update
  after phase 15a (ADR-0029 D5).

## Verification

To be completed before merge: the unit tests, type check, lint and the home and
contact browser tests on the release candidate, and owner review of the
rendered home page.

## Rollback

Revert the commit through a reviewed pull request; do not rewrite history.
