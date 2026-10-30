# ADR-0035: Cookieless page-view analytics

- Status: Proposed — drafted on 21 October 2026. The owner approved adding
  Vercel Web Analytics on 20 October 2026, but handbook §7 and §27 forbid
  analytics "in the current version", so nothing is built until the owner
  ratifies the handbook amendment below and accepts this record.
- Date: 2026-10-21
- Owner: OJ Florendo
- Risk: R2. A new third-party runtime script, a dependency and a privacy
  change. The handbook amendment changes the ratified checksum
  ([ADR-0000](0000-handbook-adoption.md)).
- Number: ADR-0034 is held for the enquiry triage automation.

## Context

The redesign launches to find clients inbound (roadmap row 8). Without any
measure of visits, the owner cannot tell which pages or posts bring people in,
or whether search step 2 (row 12) worked. On 20 October 2026 the owner
approved Vercel Web Analytics; the team is already on Vercel Pro.

Handbook §7 lists "no behavioural analytics, advertising trackers,
fingerprinting, or unnecessary cookies" in the baseline, and §27 says "No
analytics, fingerprinting, ad tracking, or unnecessary cookies in the current
version. Any future analytics require R2 approval, a privacy review,
data-minimisation analysis, consent analysis where applicable, CSP review, and
documentation." This record is that review.

## Decision

1. **Vercel Web Analytics for page views only.** No custom events, no Speed
   Insights, no other provider.
2. **Public pages only.** The component mounts in `src/app/(portfolio)/layout.tsx`,
   never under `/manage`. A `beforeSend` filter drops any URL outside the
   public routes and strips every query string.
3. **No consent banner.** It sets no cookie and stores nothing on the device
   (see the privacy review below), so the UK's storage-and-access consent rule
   should not apply to it; the owner checks the ICO's current guidance
   before accepting. The privacy notice says it is used.
4. **Handbook amendment, for owner ratification.** §7's baseline item becomes
   "no behavioural or cross-site analytics, advertising trackers,
   fingerprinting, or unnecessary cookies; cookieless page-view counts under
   ADR-0035 only", and §27's analytics line becomes "Analytics only as
   ADR-0035 allows: cookieless, aggregated page views on public pages. Any
   other analytics require R2 approval, a privacy review, data-minimisation
   analysis, consent analysis where applicable, CSP review, and
   documentation." Then ADR-0000's checksum is re-ratified.

## Alternatives considered

- **No analytics.** Keeps the handbook as it is, but the launch would run
  blind.
- **Search Console only.** Already set up (row 12, step 1). It shows searches,
  not visits from LinkedIn or direct links, so it complements this rather than
  replaces it.
- **Plausible or another hosted tool.** Similar privacy, but a new account,
  provider review and CSP origin, against a feature already on the paid plan.
- **Google Analytics.** Cookies and cross-site profiles; needs a consent
  banner. Rejected.

## Security and privacy impact

From Vercel's "Privacy and Compliance" page (last updated 26 June 2026):
- No third-party cookies; visitors are told apart by a hash of the request.
- The visitor session "is automatically discarded after 24 hours".
- Each data point holds: time, URL, route, referrer, filtered query
  parameters, country and city, operating system, browser and device type.
- Data is aggregated and does not identify people across sites.

Data minimisation: query strings are dropped in `beforeSend`, and no event
carries form or chat content. **CSP:** version 2 of `@vercel/analytics` loads
its script from this site's own origin through a build-time path, so
`script-src` and `connect-src` stay `'self'`. The nonce and `strict-dynamic`
policy must still pass `e2e/headers.spec.ts` with zero violations; if they
don't, the build stops rather than widening the CSP.

## Operational and performance impact

One small script, loaded after the page. Lighthouse mobile must stay 90 or
above on the home page and About (ADR-0030). It is included in the Pro plan
up to its event quota (cost unverified; check the billing page before
enabling).

## Consequences and trade-offs

The site gains visit counts and loses the simple "no analytics" line. The
privacy notice's "no analytics" sentence and its unit test change in the same
commit as the script.

## Rollback or migration

Remove the component and the package through a reviewed pull request, then
switch analytics off in the Vercel project. Nothing is stored on visitors'
devices, so nothing needs clearing.

## Verification

To be filled when built: the headers test with zero CSP violations, an axe
pass, Lighthouse mobile, a visit seen in the Vercel dashboard, and no request
from `/manage`.

## Related decisions

[ADR-0000](0000-handbook-adoption.md) (checksum),
[ADR-0029](0029-public-identity-joseph-florendo.md),
[ADR-0030](0030-night-palette-and-star-sky.md) (performance),
[ADR-0033](0033-project-enquiry-form-and-call-booking-link.md).
