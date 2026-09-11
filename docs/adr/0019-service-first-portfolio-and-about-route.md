# ADR-0019: Service-first portfolio, a separate About route, and an available document-assistant offer

- Status: Accepted — owner-approved, merged to protected `main` as `ea1100a` on
  2026-09-10 and released the same day; see the
  [release record](../releases/2026-09-10-service-first-portfolio.md). The
  status line was left at "Proposed" through the release and is corrected here.
  Any later corpus revision is its own R3 publication decision.
- Date: 2026-09-10
- Owner: OJ Florendo
- Risk: R1 content, copy and presentation. No trust boundary, runtime, provider
  or privacy behaviour changed.
- Amends in part: [ADR-0010](0010-warm-portfolio-and-finite-motion.md)

## Context

ADR-0010 recorded a presentation the owner accepted on 7 September 2026. It was
competent and it was honest, and it had one defect that a redesign cannot fix by
looking better: a visitor could read the whole landing page without learning what
they could hire OJ to do. The page led with a name and a general capability
statement, listed four undifferentiated services, and placed the enquiry route
below a long run of background sections.

Three further facts had accumulated since ADR-0010 and were not reflected on the
site:

1. The primary audience is now small service businesses — websites first, AI
   document assistants second — rather than employers and recruiters.
2. The 3D hero described in ADR-0002/0003/0009 is retired, but the copy still
   described it in the present tense.
3. Two retrieval-grounded document assistants have been built and deployed —
   Cited, measured against a committed evaluation set, and E.V on this site.
   The site still labelled that work "experimental".

## Decision

**D1 — The landing page leads with the offer.** The page-level `h1` states what
the visitor gets ("Make your services clear. Make the next step easy."), and the
page title, meta description, Open Graph card and `Person` structured data all
lead with the service rather than the name. The name is present as a display
wordmark carrying the visual weight, marked `aria-hidden` because it is already
the navigation mark and the About heading; making it the `h1` would put identity
where the offer needs to be.

**D2 — Background moves to `/about`.** The landing page is Hero, Services,
Selected work, How I work, Contact. About, Now, Skills, Experience and Education
move to a dedicated `/about` route with its own `h1`, metadata and sitemap entry.
Nothing is deleted: every credential, role, date and skill is retained in full.
"How I work" stays on the landing page because it informs the decision a
prospective client makes before enquiring, rather than being background.

**D3 — Three services, each carrying its own honest maturity label.** The
document-assistant offer moves from "Experimental / available for collaboration"
to **"Available now"**, on the evidence in D4. The four previous undifferentiated
service lines collapse to three, with training and digital/e-commerce work
retained as a stated related-background line rather than deleted.

**D4 — The document-assistant claim is bounded by what was actually shipped.**
The offer names its evidence: Cited and E.V. It does **not** claim client
deployments, commercial outcomes or performance on documents the system has not
seen. Cited's evaluation figures stay attached to Cited. The management interface
is described as built and working rather than as a shipped product, because its
durable storage is staging rather than production, and a scope note states that
each engagement is bound to an agreed document set with its own privacy review.

**D5 — The management preview stays private.** `/manage` remains gated on
`NODE_ENV === "development"`, an explicit preview flag, absence of Vercel, and a
localhost host. It is not part of this or any public release. Exposing it
publicly would require its own ADR, threat model and authentication design.

**D6 — The corpus states the offer, not a client base.** `about-oj.md` described
OJ as working "with clients and organisations elsewhere in the UK and
internationally". That is the implication D1 removed from the hero, and leaving
it in the corpus would have had E.V contradict the page it sits on. It now reads
"He works remotely, so his location does not limit where he can take on work in
the UK or internationally" — the same fact about remote availability, without
the implied roster. The wording was inherited rather than introduced by this
change, and correcting it moved the corpus checksum, which is why it was settled
before the corpus release rather than after.

**D7 — The assistant panel keeps its greeting-only opening.** Five suggested
opening questions were defined in `src/data/assistant-navigation.ts` and
rendered nowhere; the panel that renders them was removed upstream. Rather than
add an unreviewed control to E.V's layout during a copy and presentation
release, the unused export was deleted. E.V opens exactly as it does today. If
starting points are wanted later they are a scoped change to the panel with its
own review, not a side effect of this one.

## Alternatives considered

**Keep the name as the `h1` and put the offer beneath it.** Rejected: it spends
the strongest semantic signal on the page on identity, at a point where the
visitor does not yet know why the identity matters. The wordmark keeps the visual
presence without the cost.

**Keep every section on one landing page and simply reorder.** Rejected: it was
tried, and Contact sitting above About produced a page that changed subject
twice. Splitting the routes is what makes the landing page short without deleting
anything.

**Label the document assistant "Available now" with no scope note.** Rejected.
"Available now" is a truthful statement of capability; without D4's bound it
becomes an implied willingness to run any workflow a visitor proposes.

**Leave the offer "Experimental".** Rejected as no longer accurate. Two deployed
systems is not an experiment, and understating shipped work is its own kind of
inaccuracy.

## Security and privacy impact

None. No route handler, validation rule, accepted value, email path, security
header, CSP directive, cookie, dependency or provider changed. The contact form's
shared constant, server validation and delivery are untouched; only the display
order of the enquiry list changed. `/about` is a public content route with no
input surface.

## Accessibility and performance impact

One `h1` per route, heading order unbroken. The hero is bounded to the first
viewport so the portrait and both calls to action are fully visible rather than
cut off; body copy moved from 14px to 16px. axe passes on the landing page,
`/about` and both case studies at 390px and 1280px, in light and dark. No
horizontal overflow at 320, 720, 820, 1024 or 1920, on either route. Reduced
motion remains complete and static. No dependency, image weight or client
JavaScript was added; the split reduces the landing page's rendered content.

## Operational impact

**The corpus changed, and the serving deployment must be updated with it.**
The assistant corpus checksum is now
`10ccbbc912bc9ad0ddc5a46c850d71a007705be9719ae246cd4448ef8db0af95`. The service
recomputes this at startup and refuses to run on a mismatch, so publishing the
site without releasing the corpus leaves E.V either refusing to start or
answering from superseded content that contradicts the published copy. The corpus
release is a separate R3 action, documented in
[the corpus runbook](../runbooks/assistant-corpus.md).

**Amendment, 11 September 2026.** `10ccbbc9…` is what this decision shipped and
what `/health` confirmed after the release. The corpus has since been refined
again — self-describing heading renames, the bounded website and AI offers, and
the corrected description of Cited's evaluation — which moves the source
checksum to
`9eacd1593d6ab0d61469c1bf33dae903e0a5f2b74c835f7b0082a22c8167fd0b`. That
revision is not yet committed or released, so source and the running service
currently disagree by design. Treat the figure above as this decision's shipped
value, and the corpus runbook as the operational source of the current one.

## Consequences and trade-offs

- A visitor now needs one click to reach experience and credentials. That is the
  intended cost: the landing page buys clarity with a navigation step.
- Two routes must be kept coherent instead of one, and `/about` needs its own
  metadata and accessibility coverage. Both are covered by tests.
- The document-assistant offer is now a commercial commitment. If capacity or
  suitability changes, the status label must change with it.
- The case-study screenshot for this project still shows the retired 3D hero and
  the previous hero copy. It contradicts the case study's own text and should be
  recaptured after publication. **Closed, 11 September 2026:**
  `personal-portfolio-website.webp` was recaptured from a production build of
  this design at the declared 1104x320, and now shows the wordmark, the offer
  heading, both calls to action and the hero portrait.

## Rollback or migration

Revert the release commit through a reviewed pull request; do not rewrite
history. `/about` returning 404 after a revert is expected and harmless — the
sections return to the landing page and the sitemap entry disappears with them.
The preference cookie, contact boundary and assistant transport are unaffected.
If the corpus was released to the service, roll it back with the previously
recorded checksum by the same runbook.

## Related decisions

- [ADR-0010](0010-warm-portfolio-and-finite-motion.md) — the presentation this amends
- [ADR-0006](0006-retrieval-grounded-portfolio-assistant.md) — corpus boundary and checksum
- [ADR-0016](0016-ev-management-storage-and-preview.md) — management preview gating
- [ADR-0017](0017-shared-color-preference.md) — shared theme, unchanged here
- [Corpus runbook](../runbooks/assistant-corpus.md)
