# Portfolio redesign — 7 September 2026

OJ Florendo accepted the design and explicitly approved publishing it. Release
uses the existing GitHub pull-request, CI and Vercel production workflow. The
release pull request records the exact commit, deployment and post-deploy checks.

## Changes

- Warm ivory, charcoal, cobalt and yellow presentation, larger typography,
  genuine project imagery and varied section layouts.
- Original profile photo in the navigation and contact circles; hero statement
  layout preserved. Both primary and secondary actions remain independently usable.
- Finite entrance, project, portrait, click and control feedback; reduced motion
  and no-JavaScript content supported. Decorative WebGL scenes are unmounted.
- Existing substantive portfolio content, contact boundary, credentials,
  case studies and assistant functionality retained.

## Evidence and limits

The unchanged application candidate passed dependency audits with zero
vulnerabilities, lint, both typechecks, corpus integrity, 330 unit tests,
production build and 60 Chromium browser tests. Six additional checks covered
six viewport sizes, hover, bounded click effects, viewport edges and CPU probes.
Required remote CI and deployment checks must pass before production merge.

Physical phones, WebKit, Firefox and Lighthouse were not tested for this change.
Local 4x CPU emulation retained occasional long tasks; the final scroll sample
had a p95 scheduling gap about 33ms and one 155ms task. No universal performance
claim is made. Configured live delivery is checked safely; the local form tests
use the existing honest no-delivery mode and assistant tests use controlled responses.

No dependency, lockfile, secret, DNS, API handler or security-control change.
See [ADR-0010](../adr/0010-warm-portfolio-and-finite-motion.md),
[design notes](../portfolio-redesign-preview.md) and
[rollback runbook](../runbooks/rollback.md).
