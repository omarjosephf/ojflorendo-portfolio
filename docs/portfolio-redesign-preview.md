# Portfolio redesign preview

- Status: Design accepted and publication approved by OJ Florendo on 7 September 2026.
- Date: 7 September 2026
- Risk: R1 presentation and interaction change; no new trust boundary.

The approved direction is a warm, typography-led personal portfolio for client
work and solo entrepreneurship across software, websites, applications, AI
agents and business systems. Existing substantive content, project claims,
service maturity labels, experience, credentials, contact flow and case studies
are retained. RAG assistants are examples, not a positioning limit.

## Presentation

Ivory, charcoal, cobalt and muted yellow replace the dark glass treatment.
Self-hosted Barlow Condensed headings pair with Inter body text. Project-created
OJ lettering, real existing screenshots, offset frames, numbered sections,
service rows and a distinct process section provide variety.

The order is hero, projects, services, approach, about, mission, current focus,
capabilities, experience, credentials and contact. The primary action is exactly
**Discuss a project**, using the existing contact section. **Explore my work**
is independently available and goes directly to projects. Viewing work never
requires contacting OJ, opening the assistant or booking a call.

The genuine photograph replaces the circular navigation and contact initials.
The original 256px asset is reused unchanged and clipped into circles with CSS.
The hero statement retains its original layout. The contact portrait links to
the enquiry form; the navigation portrait retains its home link. The footer mark
is unchanged. The existing assistant has its original
palette and font scoped around it so the portfolio theme does not inadvertently
redesign it. Assistant renaming, receptionist features, booking integrations
and the separate assistant service are outside this work.

The added heading font is Barlow Condensed by The Barlow Project Authors,
served through the existing Next.js font pipeline. Its source and SIL Open Font
License 1.1 are recorded in [Google Fonts](https://github.com/google/fonts/blob/main/ofl/barlowcondensed/OFL.txt).
The project screenshots are existing repository assets; the OJ mark is project-created.

## Motion contract

- The heading enters once at full opacity so its contrast stays readable;
  screenshot frames settle at small opposing angles.
- Project frames lift on hover and keyboard focus. The accent label slides a
  few pixels. Direct project actions remain visible on touch devices.
- The two portrait circles briefly wiggle on hover, keyboard focus or activation.
- A small four-dot cobalt accent responds to clicks and keyboard activation.
  The dots share one animated element and finish within 360ms.
  It never blocks input or navigation, skips forms, text selection and the
  assistant, and leaves no idle animation. Primary controls have a small press
  response; text-link arrows shift slightly on hover/focus/press.
- Supplemental section entrances are quiet and finite on desktop (1024px and
  wider). Smaller screens keep section content static to avoid reveal-layer
  painting during scroll; the three signature interactions remain available.
  Content is visible before hydration; no information depends on IntersectionObserver.
- Reduced motion disables animation and transitions and straightens previews.
  It also cancels running click effects. Scrolling uses normal browser behavior.

Direct reference interaction on 7 September 2026 observed short black ticks
radiating from clicks on [Eduard Bodak's site](https://www.eduardbodak.com/).
A navigation click also showed a brief page wash before the new page appeared.
The preview uses an original, smaller four-dot accent; navigation remains immediate.

The preview does not mount the Digital Core or either particle-wave renderer.
Their implementations and unit coverage remain for review and rollback.
ADR-0002, ADR-0003 and ADR-0009 describe the earlier production design;
ADR-0010 records the owner-approved replacement of those scene decisions.
No new animation dependency, canvas,
WebGL context, timer loop or runtime origin is introduced. The existing timeline
and menu behavior is preserved.

## Verification plan

Run `npm run test:ci`. Replace the obsolete wave-presence assertions with checks
of the approved behavior: no decorative canvas or oversized scene chunk, a
visibly changing finite entrance and a complete static reduced-motion mode.
Keep existing security, contact, navigation, metadata and credential checks.

Inspect desktop and mobile pages, project routes, contact form, menu and keyboard
focus. Capture screenshots after fonts and finite entrances settle, and inspect
all delivered images. Check small phone, tablet and desktop widths, 200% zoom
reflow equivalence and content without JavaScript. Browser emulation and local
timing measurements do not establish performance on real phones.

The local preview uses the existing honest no-delivery contact mode. Live email
and assistant-provider operation require their existing configuration, which is
not changed or supplied by this task.

## Review and rollback

The approved release follows the pull-request and CI workflow. Dependencies,
lockfile, API handlers, security controls, secrets, DNS and deployment settings
are unchanged. The source diff and ignored local screenshots are the review
surface. The previous production commit is recorded in the rollback runbook.
The owner explicitly authorized publishing this design on 7 September 2026.
That approval does not authorize unrelated releases, DNS or secret changes.
