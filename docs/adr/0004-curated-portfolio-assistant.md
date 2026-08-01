# ADR-0004: Curated no-inference portfolio assistant

- **Status:** Accepted
- **Date:** 2026-07-30 (revised 2026-07-31 for the approved avatar integration)
- **Owner:** OJ Florendo
- **Risk class:** R2
- **Governing policy:** Project Zero Engineering Handbook **v1.1.0**

> Implementation began under v1.0.0, which the owner confirmed as governing on
> 31 July 2026 while an authority conflict was unresolved. That conflict was
> settled on 1 August 2026: **v1.1.0 was ratified as the single governing
> version** and v1.0.0 was superseded (see `docs/adr/0000-handbook-adoption.md`).
>
> The change does not alter this decision. v1.1.0 is strictly additive on the
> security, privacy, accessibility and risk requirements this ADR relies on, and
> it governs this feature explicitly: **Track C** covers the instructor-required
> AI assistant beta, and **§49.5** covers avatars and related assets. Under
> v1.0.0 the assistant fell under a blanket expansion prohibition, so v1.1.0 is
> the version that actually authorises it.

## Context

The portfolio needs an optional guide that helps visitors find reviewed public information about OJ's projects, skills, experience, education, services, availability, working approach, and contact options. The owner requires no AI inference charge and does not want visitor prompts, private data, hidden project material, or provider credentials exposed or retained.

A hosted language-model assistant would introduce a provider trust boundary, variable output, usage cost, secrets, rate limiting, operational monitoring, and data-processing questions. The current public knowledge set is small enough to answer reliably without those risks.

## Decision

Implement **OJ Assistant - Curated Beta** as a deterministic client-side guide:

1. Store owner-approved public answers in a typed repository-managed knowledge manifest.
2. Select an answer through bounded, deterministic keyword and phrase matching.
3. Make no model, server API, third-party widget, web-search, analytics, or telemetry call.
4. Add no dependency, secret, environment variable, cookie, local-storage entry, transcript store, account, database, embedding, or vector service.
5. Limit input to 280 characters and keep only the current input and answer in ephemeral component state.
6. Detect common prompt-injection, hidden-instruction, secret, private-document, and private-contact requests before topic matching and return a fixed refusal.
7. Detect likely personal or credential data and return a fixed privacy warning rather than treating it as a portfolio query.
8. Render only controlled text and allowlisted internal links. Never render visitor text as HTML or Markdown.
9. State clearly that the assistant is curated, deterministic, limited, and not OJ.
10. Provide direct links to portfolio sections and the contact route, and keep the main site fully useful when JavaScript or the assistant is unavailable.
11. Keep the feature removable by reverting the assistant commit or removing its root-layout entry point.
12. Give the assistant a visual identity using two owner-supplied artistic portraits of OJ: a 2D avatar on the entry control and a static 3D portrait in the opened panel.

### Cost, rate limiting and provider posture

- **Provider cost is zero because no provider is used.** There is no account, key, quota or bill to manage.
- **Network rate limiting is not applicable**: no assistant request crosses a network boundary, so there is nothing to rate limit.
- Client-side work is instead bounded by the 280-character input limit and by deterministic local matching over a small frozen manifest.

### Avatar decision

- Both portraits are **owner-supplied artistic digital representations**, not photographs, and are disclosed as such in the assistant identity area.
- The compact 2D avatar is the assistant's primary identity on the entry control. It is a 128px WebP derivative (4.5 KB) rendered at 28px.
- The static 3D portrait is the secondary representation inside the opened panel. It is a 192px WebP derivative (7.6 KB) rendered at 40px and is **requested only after the assistant is opened**, so it costs a non-interacting visitor nothing.
- Delivery is progressive and performance-sensitive: the panel, matcher, knowledge manifest and 3D portrait all load on first open.
- **No interactive 3D avatar is included.** No WebGL, model, canvas renderer, animation, voice, lip-sync or 360 viewer.
- The turnaround sheet remains a **source and reference asset only**. It is not committed to the repository and is not a production dependency.
- The assistant remains fully functional without avatar imagery, and the website remains fully functional without the assistant.
- Derivatives are generated locally with the already-declared `sharp` dependency. **No dependency was added.**

#### Why the avatars are plain `<img>` and not `next/image`

`next/image` renders an inline `style` attribute on the element it produces. This
site enforces `style-src 'self' 'nonce-...'` with no `'unsafe-inline'`, so that
attribute is blocked and the browser reports a Content Security Policy violation
on every page carrying the assistant.

This had never surfaced before because `Avatar.tsx` only renders `next/image`
when `site.profileImage` is set, and it is `null` — the avatars are the first
images the site has actually rendered through the optimiser.

Weakening the CSP to accommodate the optimiser was rejected: the policy is a
deliberate security control and must not be relaxed for a presentational
convenience. The optimiser would also add nothing here, because both assets are
already pre-sized WebP derivatives generated at build-preparation time and shown
far below their intrinsic size.

Plain `<img>` elements with explicit `width` and `height` therefore satisfy the
same requirements — optimized delivery, no layout shift, no external origin —
with no policy change and less client JavaScript.

## Alternatives considered

### Hosted language-model API

Rejected for this release because it creates inference cost, secrets, provider processing, nondeterministic claims, availability concerns, and a materially larger abuse surface.

### Browser-hosted local language model

Rejected because model downloads, memory and CPU requirements, mobile compatibility, browser variance, accessibility, and supply-chain weight are disproportionate to the small approved knowledge set.

### Third-party chat widget

Rejected because it weakens control over CSP, privacy, branding, data handling, accessibility, and failure behaviour.

### Static FAQ section

Viable and lower risk, but less discoverable and less interactive. The selected implementation keeps FAQ-like determinism while providing a compact guided interface.

## Security and privacy impact

- No new network or server trust boundary is introduced.
- No private source is present in the client bundle.
- The knowledge manifest is intentionally public and must contain only approved portfolio facts.
- Visitor text is not transmitted, logged, retained, profiled, or used for training.
- Prompt injection cannot grant capabilities because there is no model, tool, evaluator, or dynamic instruction execution.
- Controlled React text rendering prevents visitor input from becoming executable markup.

## Operational and performance impact

- There is no inference bill, provider quota, provider outage, secret rotation, or assistant API to operate.
- The feature adds a small client component and static text manifest. Bundle impact must remain modest and is reviewed through the normal build and browser tests.
- No animation is required for use; global reduced-motion rules remain effective.
- Knowledge updates require owner review because the manifest is a public claims source.

## Consequences and trade-offs

### Positive

- Deterministic and reviewable answers.
- No inference charge or provider dependency.
- No transcript or personal-data store.
- Consistent behaviour across modern browsers and devices.
- Fast rollback and a narrow attack surface.

### Negative

- It cannot understand arbitrary language as broadly as a generative model.
- Keyword matching can select an imperfect topic or return an unknown result.
- Every supported answer must be curated and maintained as public content changes.
- It must not be marketed as a general-purpose AI agent.

## Rollback or migration

- Remove `<PortfolioAssistant />` from `src/app/layout.tsx` to disable the entry point.
- Revert the assistant release commit or pull request.
- The avatar assets are isolated under `public/images/profile/` and are referenced only by the assistant, so removing the assistant removes their only consumer.
- Keep the rest of the portfolio unchanged.
- A future generative provider requires a new R2 decision, provider/cost review, threat-model update, privacy review, secrets plan, limits, and explicit owner approval.

## Related records

- `docs/threat-models/curated-portfolio-assistant.md`
- `docs/test-plans/curated-portfolio-assistant.md`
- `SECURITY.md`
