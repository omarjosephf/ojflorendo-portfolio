# ADR-0010: Warm portfolio presentation with finite motion

- Status: Accepted
- Date: 2026-09-07
- Owner: OJ Florendo
- Supersedes: the mounted decorative-scene decisions in ADR-0002, ADR-0003 and ADR-0009

## Context and decision

OJ reviewed the completed local redesign, accepted it as good enough for now,
and explicitly authorized publication on 7 September 2026. The portfolio now
uses warm typography, genuine project screenshots, the existing profile photo
in navigation/contact circles, and finite interaction feedback. Substantive
content and the existing contact, navigation and assistant behavior remain.

The Digital Core and particle-wave renderers are unmounted. Their source and
unit coverage remain available for rollback; no dependency is added or removed.
The prior scene ADRs remain historical implementation records. This decision
replaces their requirement to mount decorative scenes, including on phones.

## Alternatives and trade-offs

Keeping the earlier dark scene-based presentation was rejected during owner
design review. A static-only redesign would reduce motion further, but the
accepted version keeps finite, event-driven feedback with reduced-motion support.
Supplemental section entrances run only at widths of 1024px and above after
local measurements showed additional scroll work on smaller screens.

## Security, privacy and accessibility

No API, secret, CSP, provider, data boundary or runtime origin changes. Original
public images are reused. Content remains available without JavaScript. Forms,
selection and assistant interactions do not trigger the click accent. Keyboard
and touch activation preserve normal actions; reduced motion cancels effects.
Text entrances remain fully opaque to preserve contrast while moving.

## Performance and operations

The final local gate passed 330 unit tests and 60 Chromium browser tests.
Additional checks covered six widths and bounded interactions. The final local
4x CPU sample retained occasional long tasks: scroll p95 scheduling gap about
33ms and one 155ms task; a repeated-click sample contained one 54ms task.
These disclosed limits do not establish real-phone or universal smoothness.
No continuous decorative canvas or infinite CSS animation is mounted.

## Rollback and related records

Use the previous production deployment or a reviewed revert; do not rewrite
history. See [rollback](../runbooks/rollback.md),
[design notes](../portfolio-redesign-preview.md) and
[release notes](../releases/2026-09-07-portfolio-redesign.md).
