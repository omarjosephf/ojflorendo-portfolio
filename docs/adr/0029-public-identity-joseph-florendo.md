# ADR-0029: Public identity — Joseph Florendo, AI Automation Developer

- Status: Accepted — owner decisions of 13 and 14 October 2026. The handbook
  v1.3.0 text that carries it is ratified at pull-request review. D3 is
  amended by [ADR-0031](0031-build-check-services-and-prices.md).
- Date: 2026-10-14
- Owner: OJ Florendo
- Risk: R2. Public identity, metadata and the assistant corpus change; no trust
  boundary, provider, runtime origin or privacy behaviour changes.
- Amends: handbook §1, §6.1 and §6.4 (v1.3.0);
  [ADR-0019](0019-service-first-portfolio-and-about-route.md) D1 and D3 (the
  offer and the services); the credential name disclosure in
  `src/components/sections/Education.tsx`.

## Context

Since August 2026 the site presented its owner as **OJ Florendo Rayatchi**, a
web developer and AI product builder offering websites to small service
businesses (ADR-0019). On 13 October 2026 the owner chose a different direction
for his work and his public brand: AI automation and workflows, built in public,
with products later. On 14 October he confirmed the name and title for every
public surface, and bought a matching domain.

The handbook made the old name a rule rather than a description: §6.1 named the
display name, and §6.4 gave the credit line. A rename is therefore a governance
change, not a copy edit.

## Decision

**D1 — Name and title.** The public brand is **Joseph Florendo**, and the title
is **AI Automation Developer**. Visible copy, page titles and descriptions,
`Person` structured data, the social preview card, the web manifest, the footer
and E.V's interface use that name now; the assistant corpus follows under D5.
The credit line is "Designed and built by Joseph Florendo."

**D2 — Legal name on credentials.** Certificates keep the holder name each issuer
recorded, Omar Joseph Florendo. The credentials section says so in one short note.
Public copy uses only the brand name and, for credentials, the legal name.

**D3 — The offer.** Four services, in this order, each labelled with one of the
§6.2 labels:

1. Automation and workflow builds — Available now.
2. AI agents and assistants — Available now.
3. Automation audit, an entry offer — Available now.
4. Websites — one line, Available now.

The owner chose "Available now" for automation builds and rejected the
experimental label. Copy describes what is offered and what has been built; it
does not imply past clients, client results or commercial outcomes.

**D4 — What stays named `ojflorendo`.** The repository, the current domain
`ojfr.me`, social handles and the public email address keep their existing names
until each is changed on purpose. The new domain, `josephflorendo.com`, is
attached only at launch, with its own owner approval. Governance records written
before this date may call the owner OJ Florendo and are not rewritten.

**D5 — The assistant corpus and phase 15a.** The corpus documents in
`content/assistant/`, the evaluation questions and the assistant policy are
**not changed in this phase**. The owner first chose to rebuild the repository's
copy of the corpus on the understanding that it was self-contained. It is not:
any corpus edit also invalidates the committed retrieval evidence and the
management snapshot, which are rebuilt only with the back end's Python tooling,
and renaming a corpus heading means editing the evaluation questions that the
phase 15a captures use. E.V's interface uses the new name; its answers keep the
old one until a corpus update after 15a, decided separately by the owner. **The
redesign launches only after phase 15a is finished**, so the live site does not
change during the captures. That is the same reason phase 18.6 is placed after
15a.

**D6 — No AI co-author trailer.** The owner chose the §6.4 default for the
redesign's commits: no `Co-authored-by` line.

## Alternatives considered

- **Keep OJ Florendo Rayatchi.** Not chosen: the owner decided on a new name
  for the new direction.
- **OJ Florendo.** The short form used on social profiles until 13 October. The
  owner considered it and chose Joseph Florendo.
- **Rename the repository, domain and handles at once.** Rejected: each is
  outward-facing and hard to reverse, so each gets its own approval. Nothing is
  gained by bundling them with a copy change.

## Consequences

- The blog's existing post and run records name "OJ" in their agent-written
  text. They are left as published; the blog's redesign is a later phase.
- The public CV still shows the old name until the CV phase. The owner decides,
  at preview time, whether the "View CV" link stays or is hidden until then.
- Until the corpus update, E.V's answers name "OJ Florendo" while the page
  around them says Joseph Florendo. The update should state once that Joseph
  Florendo previously published as OJ Florendo, so questions using either name
  are answered.

## Verification

To be completed before merge: the full gate on the release candidate, the
Impeccable scan, a search showing no visible "Rayatchi" or "OJ" in the
rendered public pages and metadata outside the blog, E.V's answers and the CV
(each deferred above), and owner review of the Vercel preview.

## Rollback

Revert the merge commit through a reviewed pull request; do not rewrite history.
The handbook returns to v1.2.1 with the revert, and ADR-0000's checksum returns
with it.
