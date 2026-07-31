# ADR 0003: Curated no-inference portfolio assistant

- **Status:** Accepted
- **Date:** 2026-07-30
- **Owner:** OJ Florendo
- **Risk class:** R2
- **Related policy:** Project Zero Engineering Handbook v1.0.0 and approved v1.1.0 assistant amendment candidate

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
- Keep the rest of the portfolio unchanged.
- A future generative provider requires a new R2 decision, provider/cost review, threat-model update, privacy review, secrets plan, limits, and explicit owner approval.

## Related records

- `docs/threat-models/curated-portfolio-assistant.md`
- `docs/test-plans/curated-portfolio-assistant.md`
- `SECURITY.md`
