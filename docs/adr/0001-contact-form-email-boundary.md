# ADR-0001: Contact-form email boundary

- Status: Accepted
- Date: 2026-07-28
- Amended: 2026-08-01 — delivery timeout, non-throwing transport failures,
  partial-configuration warning, and the `send.ojfr.me` sending identity
  (decision points 12–15). The boundary itself is unchanged; these record
  operating limits ahead of enabling real delivery.
  **Amendment ratified 2026-08-02 by OJ Florendo.**
- Owner: OJ Florendo

## Context

Project Zero needs a contact journey without adding accounts, a database, a CMS,
or persistent application storage. Contact data is untrusted personal input and
must cross a narrow server-side boundary before any delivery attempt.

The existing implementation uses `POST /api/contact`, shared validation rules, a
server-only email transport abstraction, and an honest no-delivery mock mode.
This ADR documents that current boundary and its operating limits.

## Decision

The contact boundary is:

1. `src/app/api/contact/route.ts` is the only public contact submission endpoint.
2. The route enforces a 32 KiB raw-body cap before JSON parsing.
3. `src/lib/contact/schema.ts` performs authoritative server-side validation,
   trimming and normalisation, allowlisted enquiry types, explicit consent, and
   bounded fields.
4. A hidden `website` honeypot absorbs obvious automated submissions without
   delivery.
5. A best-effort in-memory limiter allows five attempts per 60 seconds per server
   instance. It is not a distributed or durable abuse-control system.
6. `src/lib/email/index.ts` is server-only and selects one of two transports:
   - **Resend:** enabled only when `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and
     `CONTACT_FROM_EMAIL` are all configured server-side.
   - **Mock:** used when any variable is absent; validates the flow, performs no
     delivery, and returns `delivered: false`.
7. Outbound email is plain text. Submitted HTML is never rendered.
8. Message bodies, provider response bodies, secrets, and thrown error details are
   not logged.
9. Fixed generic errors are returned for transport failures; responses are marked
   `Cache-Control: no-store`.
10. The UI must distinguish `delivered: true` from `delivered: false` and must not
    claim that mock-mode submissions were sent.
11. The application does not persist contact messages in a project database,
    browser storage, or local storage.
12. A single delivery attempt is bounded by a 10-second timeout
    (`AbortSignal.timeout`). An unresponsive provider must not hold a serverless
    function open to its platform limit while a visitor waits.
13. `send()` never throws. Timeouts and network failures resolve as
    `{ ok: false, delivered: false }`, so the route returns its accurate
    "couldn't be sent" 502 rather than a generic 500. The route's own `catch`
    remains a backstop. The thrown error is never inspected, so it cannot reach a
    log.
14. A **partially** configured environment (some but not all three variables)
    logs a fixed warning naming only the **missing variable names**, then falls
    back to mock. Variable names are already public in `.env.example`; values are
    secrets and are never logged. All three absent is the expected local default
    and is not warned about.
15. The verified sending identity is the **`send.ojfr.me` subdomain**, not the
    apex. `CONTACT_FROM_EMAIL` must be an address on that verified domain.

## Alternatives considered

### Mailto-only contact

Lower operational risk, but less usable and insufficient for the approved v1.1
contact experience.

### Client-side email provider or browser-exposed key

Rejected because it would expose credentials and trust client-side validation.

### Database-backed message storage

Rejected because persistent personal data, access control, retention, deletion,
backup, and incident obligations are unnecessary for the current product.

### Distributed rate-limit service

Deferred. It adds a third-party dependency, cost, data-flow review, and operational
work not justified by current traffic. Reconsider if abuse, scale, or paid/authenticated
functionality changes the threat model.

### Sending from the apex domain instead of a subdomain

Rejected. Sending from `ojfr.me` directly would give a slightly tidier From
address, but it places Resend's MX and SPF records on the root domain, where they
constrain any future mail on `ojfr.me` and expose the apex's sending reputation to
the contact form. Resend itself recommends a sending subdomain. `ojfr.me` carries
no MX or TXT records today, so the subdomain was adopted while the choice was
still free. The From address is not visitor-facing: replies are routed by
`reply_to` to the enquirer.

### Unbounded delivery attempt

Rejected once real delivery became imminent. Without a timeout an unresponsive
provider holds the function open to the platform limit, and the visitor sees only
a spinner. A bounded attempt fails fast into the existing honest error path.

## Security and privacy impact

- Untrusted input is bounded and validated at the server boundary.
- Secrets remain server-only and must never use a `NEXT_PUBLIC_` prefix.
- No message body or provider body may enter logs.
- No application database retains contact content.
- The in-memory limiter is only best effort; multiple instances can enforce
  inconsistent limits.
- Production secret configuration remains a separate R3 owner action.

## Accessibility and performance impact

The form must retain labels, keyboard operation, error association, status
announcements, and an accessible direct-email fallback. The implementation adds no
email SDK to the browser bundle; Resend is called from server code through `fetch`.

## Operational impact

Mock mode can operate in production when variables are missing. This is safe from
false-success claims but does not deliver email. Before relying on the form in
production, the owner must either configure all three variables privately or
explicitly accept the visible mock-mode limitation.

Failure diagnostics are limited to fixed categories. Operational review must not
request or expose submitted messages or secret values.

Enabling delivery is an owner-only task and cannot be automated: DNS for
`ojfr.me` is held at **Hostinger**, not Vercel, and the API key and inbox address
are production secrets. The procedure is recorded in
`docs/runbooks/contact-email-delivery.md`. A misconfigured or unverified sending
domain surfaces as a Resend 403, which reaches visitors as the generic
"couldn't be sent" message — so delivery must be confirmed with a real
submission after configuration, not assumed from a green build.

## Consequences and trade-offs

- The current design minimises stored personal data and dependencies.
- Real delivery depends on Resend and correct server-only configuration.
- The per-instance limiter is not sufficient for sustained or distributed abuse.
- Honest mock mode supports local and preview verification without pretending to
  send mail.

## Rollback or migration

The safe product rollback is to remove or disable the form and preserve the direct
email, LinkedIn, and GitHub actions. Revert through reviewed Git history; do not
silently weaken validation, logging, or delivery honesty.

Migration to another provider requires R2 review of credentials, API contract,
privacy, CSP/network impact, failure behaviour, tests, documentation, and rollback.

## Related decisions

- `src/app/api/contact/route.ts`
- `src/lib/contact/schema.ts`
- `src/lib/email/index.ts`
- `src/components/sections/ContactForm.tsx`
- `docs/runbooks/contact-email-delivery.md`
- `.env.example`
- `SECURITY.md`
- `docs/ENGINEERING_HANDBOOK.md`, Sections 22, 24, 27, 30, and 52
