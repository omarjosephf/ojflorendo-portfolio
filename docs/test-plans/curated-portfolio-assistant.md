# Curated portfolio assistant test plan

- **Status:** Accepted for implementation
- **Date:** 2026-07-30
- **Risk class:** R2

## Unit and contract checks

- Every knowledge entry has a stable ID, title, reviewed answer, allowlisted links, review date, and `ownerApproved: true`.
- Known project, skills, experience, education, services, availability, approach, contact, identity, and assistant questions map to reviewed answers.
- Empty and unsupported questions return the honest unknown fallback.
- Input is trimmed and bounded to 280 characters.
- Direct prompt-disclosure, override, secret, environment-variable, private-CV, private-contact, unpublished-work, and internal-report requests return the fixed refusal.
- Email-, phone-, password-, and account-like input returns the fixed privacy response.
- No result includes visitor input as rendered output.

## Component checks

- The toggle opens the panel and the close control and Escape key close it.
- Focus moves to the question field on open and returns to the toggle on close.
- Suggested questions produce the corresponding reviewed answer and internal links.
- Typed questions use the same deterministic matcher.
- Submit is disabled for blank input and the browser `maxLength` is present.
- No `fetch`, local-storage write, cookie, or transcript-history behaviour occurs.
- The curated-beta identity, limitations, privacy warning, and contact fallback are visible.

## Browser, accessibility, and security checks

- Desktop and mobile interactions complete without console errors or CSP violations.
- No `/api/assistant` request occurs.
- Prompt injection returns the fixed refusal.
- Keyboard-only open, input, submit, suggestion, link, close, and focus-return behaviour works.
- Screen-reader labels and live answer announcements are present.
- Axe reports no violations for the open panel.
- Reduced-motion mode remains usable.
- The panel has no horizontal overflow at a representative phone viewport and remains scrollable at high zoom.
- The main portfolio remains navigable when the assistant is closed or JavaScript is unavailable.

## Documentation and privacy review

- Scan the manifest, ADR, threat model, tests, and screenshots for private phone numbers, street addresses, secrets, machine paths, internal reports, and unpublished claims.
- Confirm the manifest contains public facts only.
- Confirm `SECURITY.md` states that the assistant is local, deterministic, non-persistent, and not a server boundary.
- Confirm there is no new dependency, environment variable, CSP origin, runtime service, telemetry, or storage mechanism.

## Release gate

1. Review the final diff and changed-file allowlist.
2. Run focused assistant unit/component tests.
3. Run focused assistant Playwright tests.
4. Run the repository complete quality gate once on the unchanged candidate.
5. Inspect the local interface at desktop and mobile widths.
6. Record exact branch and commit SHA.
7. Obtain separate approval before push/PR if it can trigger a preview deployment.
8. Obtain separate merge and production-deployment approval.
