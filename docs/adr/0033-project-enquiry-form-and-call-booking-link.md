# ADR-0033: Project enquiry form and call-booking link

- Status: Accepted — the owner made the decisions below and approved the
  written plan on 21 October 2026 ("Approved as written. Build the contact
  section in this worktree."), then approved the rendered section the same
  day ("Approved. Mark ADR-0033 accepted and commit it on this branch.").
- Date: 2026-10-21
- Owner: OJ Florendo
- Risk: R2. It changes the contact route's validation and allowlisted values
  and the email the owner receives. No new provider, secret, database,
  environment variable, runtime origin or CSP change.
- Amends: [ADR-0032](0032-builder-services-quoted-per-project.md) D3, for the
  form's budget choices only. Updates the field list behind
  [ADR-0001](0001-contact-form-email-boundary.md) item 3; the boundary itself
  is unchanged.

## Context

ADR-0032 rebuilt the services around building AI automations, agents,
websites and, later, games, with every project quoted after a free call. The
contact section still asked "What did you build?", offered a build check, and
listed enquiry types the owner no longer wants: job opportunity,
collaboration, sponsorship or partnership, and speaking. It had no way to book
the free call that the home page's "How it works" describes.

The owner asked for a fuller project enquiry form, taking ideas from agency
enquiry forms without copying their wording or layout (handbook §6.3), and for
a way to book the call.

## Decision

**D1 — Fields.** The form has three groups:

- **About you:** name and email (required), role (optional).
- **Your business:** company name, company website and company size (all
  optional).
- **Your project:** what you need (required), areas to improve (optional tick
  boxes), budget (optional) and "How can I help?" (required).

The consent tick stays required. The subject field is removed; the email
subject is built from the need and the company, or the name when no company is
given. Yearly revenue is deliberately not asked.

**D2 — Allowed values.** Every choice is allowlisted on the server:

- **What you need:** AI automation or workflow, AI agent, website or care plan,
  something else. The old values are no longer accepted.
- **Company size:** just me, 2–10, 11–50, 51–200, more than 200.
- **Areas to improve:** leads and sales, customer enquiries, admin and
  paperwork, content and social media, reports and data, something else.
- **Budget:** under £1,000, £1,000–£2,500, £2,500–£5,000, £5,000–£10,000,
  £10,000 or more, not sure yet.

An empty optional choice means "not answered". Any other unlisted value, or an
areas value that is not a list of listed areas, is refused with a field error.

**D3 — Budget amounts.** ADR-0032 D3 says no amount appears on the page. The
budget bands are the one exception: they are choices for the enquirer, not
prices, and they replace the filtering a published floor price would do.
No other amount may appear.

**D4 — Website field.** The company website is `companyUrl`, because the
hidden honeypot field is already named `website`. It must look like a web
address, with or without `http://` or `https://`; no other scheme is
accepted. It reaches the email as plain text and is not counted by the link
screening, which reads only the message.

**D5 — Single-line fields.** Name, role and company collapse any line breaks
or runs of whitespace to one space, because the name or company now reaches
the email subject.

**D6 — Booking link.** A "Book a free 30-minute call" button sits beside the
form and in the thank-you message. It is a plain link to the owner's Cal.com
page, opened in a new tab, so nothing from Cal.com loads into this site and
the CSP is unchanged. The link lives in `site.bookingUrl`; while it is null
every booking button is hidden.

**D7 — Copy.** The section reads "Tell me what you want to build", promises
a reply by email and a free 30-minute call before a written quote, and makes
no reply-time promise. The thank-you message says "Thanks. I'll read it and
reply by email." Every build-check mention is removed.

## Alternatives considered

- **Embed the Cal.com calendar in the page.** Not chosen: it loads a third
  party's code and needs CSP origins added.
- **Build a custom booking tool.** Not now: the Cal.com free plan has no
  charge, and a booker needs calendar access, time zones, emails to strangers,
  stored personal data and spam defence. The owner may revisit it as its own
  project after launch.
- **Ask for yearly revenue.** Not chosen: it is not needed to reply or quote
  (handbook §27).
- **Keep the subject field, or add an "extra notes" box.** Not chosen: "How
  can I help?" covers both, and shorter forms lose fewer people.
- **Budget in US dollars.** Not chosen: the owner quotes in pounds.

## Security and privacy impact

- The trust boundary is unchanged: same route, body cap, honeypot, limiter,
  Turnstile, screening and plain-text email. More fields cross it, each
  bounded and allowlisted (handbook §24).
- Handbook §27 ("collect only what is necessary"): every new field is
  optional and helps scope a quote. Nothing new is stored; enquiries are still
  only emailed.
- Cal.com holds bookers' details in the United States under the EU–US Data
  Privacy Framework. The privacy page planned for launch should say so.

## Accessibility and performance impact

Each group is a fieldset with a legend; the need and the areas are native
radio buttons and tick boxes in their own fieldsets. Errors are linked to their
fields, and the first error receives focus. No new dependency; the booking
link adds no script.

## Operational impact

A visitor with the old page still open who sends it is told to choose what
they need, and can resend. The owner must create the Cal.com account and add
its link to `site.bookingUrl` before the booking buttons appear.

## Consequences and trade-offs

- The enquiry triage plan gains a ready category (what you need) and urgency
  hints (budget and areas). Its decision record takes the next free number.
- The unit tests allow currency amounts only in the budget choices.

## Rollback or migration

Revert the commit through a reviewed pull request; do not rewrite history.
No data migration: nothing is stored.

## Verification

On 21 October 2026 every stage of `npm run test:ci` after the dependency
audit passed: lint, both type checks, 1,099 unit tests, the production build,
119 browser tests on that build (including the contact form's accessibility
check) and 50 management preview tests. The section showed no horizontal
scroll at 1440 and 390 px.

The dependency audit stage failed for a reason outside this change: the
production audit flags `sharp` 0.35.4 and `source-map-js` 1.2.1, the same
versions as on `main`, with fix pull requests already open. It must pass
before release (handbook §25).

The owner approved the rendered section on 21 October 2026.

## Related decisions

[ADR-0001](0001-contact-form-email-boundary.md),
[ADR-0005](0005-contact-abuse-protection.md),
[ADR-0032](0032-builder-services-quoted-per-project.md).
