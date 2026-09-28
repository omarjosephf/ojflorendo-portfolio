# Package 19 plan: one online owner-only admin panel

- Status: **19a executed and deployed, 28 September 2026** (`97ecb23`). Evidence:
  [ADR-0025 Verification](../adr/0025-unified-owner-admin-panel.md#verification).
  19b and 19c are not started
- Owner: OJ Florendo
- Deadline: Wednesday 30 September 2026 (instructor-set)
- Decision record: [ADR-0025](../adr/0025-unified-owner-admin-panel.md), accepted.
  Research: [what the blog section should do](../reviews/admin-panel-blog-section-research.md)
- Not a release gate for packages 13–16. Status and order live only in
  [the roadmap](../state/CURRENT.md#roadmap)

## Phases

| Phase | Delivers | Risk |
| --- | --- | --- |
| **19a** | The panel online: sign-in with MFA on a production project; the switch decoupled from visitor storage; the E.V section (live views plus read-only RAG configuration); the Blog section read-only | R2 code, R3 owner steps |
| 19b | Blog decisions recorded (brief selection, approve, revise, reject, lesson review), each tied to a bundle digest; an owner audit log; pause switch | R2 |
| 19c | Live runs shown in the Blog section, once phase 18.3 has run and a pipeline runtime exists | R2, depends on package 18 |

Only 19a is planned in detail. 19b and 19c get their own plans when 19a is done.

## 19a acceptance criteria

1. From a second device, OJ signs in at `https://<production origin>/manage`
   with password, CAPTCHA and authenticator code, and sees two sections: E.V and
   Blog.
2. Signed out, or signed in without MFA, every owner route and owner data read
   is denied.
3. With the admin switch on, `/api/conversations*` and
   `/api/conversation-session` still return 404, and the public assistant does
   not offer saved chats.
4. The E.V section shows the live inbox, operations and gaps views plus the
   read-only RAG configuration. Nothing in it publishes or changes the corpus.
5. The Blog section shows the pipeline's roles, stages, guardrails and
   configuration, and states plainly that no run has happened. It changes
   nothing.
6. The full quality gate passes, and the ADR's Verification block is filled.

## 19a work, in order

**Owner decisions (28 September 2026):**

- D1. Production database: **option A, a new production project** (about
  US$10/month). Decided.
- D2. Approve this plan as R2. **Approved.**
- D3. Blog section on the 30th: **static and read-only**. Decided. The fixture
  bundle viewer waits for phases 18.1 and 18.2 on `main`.
- D4. Order: **19a first, then 18.3**, both ahead of phase 13a. Decided, and recorded in
  [the roadmap](../state/CURRENT.md#roadmap).

**Code (R2, a pull request, no production effect until the switch is set):**

1. Split `storageAllowed` into `adminAllowed` and `visitorStorageAllowed` in
   `src/lib/management/access.ts`. Move every call site to the right gate: the
   owner routes and pages to `adminAllowed`; the visitor routes and
   `(portfolio)/layout.tsx` to `visitorStorageAllowed`. Add unit tests for each
   switch combination, and e2e tests for criterion 3.
2. Give the live workspace an E.V / Blog top level, and mount the existing
   read-only `RagViews` in the E.V section. That component reads committed
   static data, not the sample file adapter. Confirm this before mounting it.
3. Add a static, read-only Blog section (criterion 5). It imports no blog
   pipeline code, because none is on `main`.
4. Add a threat model (`docs/threat-models/admin-panel.md`) and a runbook
   (`docs/runbooks/admin-panel.md`) covering enable, disable, owner recovery
   and incident response. Amend ADR-0023's project-count check.
5. Run the full gate, open the pull request, and bring `verify` to green.

**Owner steps (each R3, each confirmed immediately before it is done):**

6. Create the production Supabase project. Micro compute, same region as
   staging.
7. Apply the ten migrations with the CLI, then check them object by object, as
   was done for staging.
8. Configure Auth: anonymous sign-ins off; leaked-password protection on;
   site URL set to the production origin. CAPTCHA is armed only after step 9.
9. Enroll the owner: create the user, add the role row, set the password, and
   enrol TOTP. **Settled in code on 28 September:** the loopback bootstrap works
   against any project `SUPABASE_URL` names, and it is closed while CAPTCHA is
   armed. So enrolment happens from loopback *before* CAPTCHA enforcement, which
   follows it: the Turnstile secret goes into Supabase Auth only, then
   enforcement is switched on. The exact order is in the
   [admin panel runbook](../runbooks/admin-panel.md#enable-in-order).
10. Set the Vercel production environment variables (`EV_ADMIN_MODE=live`,
    `EV_MANAGEMENT_ORIGIN`, the production Supabase URL and publishable key, the CAPTCHA
    site key). Leave `EV_CONVERSATION_STORAGE` unset.
11. Add the `approved-to-deploy` label on OJ's instruction, merge, and let
    production deploy.
12. Smoke-test from a phone: criteria 1–3, then sign out and confirm
    revocation. Run the security advisors on the production project.

## Risks

| Risk | Control |
| --- | --- |
| The admin switch leaks visitor storage | Two gates, and e2e tests that assert 404 with only the admin switch on |
| A public sign-in page attracts password guessing | CAPTCHA, Supabase rate limits, MFA, and leaked-password protection |
| The owner is locked out after CAPTCHA is enforced | The runbook's recovery path is tested before the smoke test ends (owner-actions item 4 warns of this) |
| A wrong project URL or key is set in Vercel | Step 12 checks that the project the panel reads is the production project, by its project reference |
| The deadline pushes an unverified release | Release quality over speed. If step 12 fails, the switch stays off and the pull request can still merge dark |
| Package 18.3 slips because of this work | Accepted by the owner in D4 |

## Alternatives

In ADR-0025: a managed CMS, an `admin.` subdomain, and turning on the existing
production mode unchanged.

## Rollback

Unset `EV_ADMIN_MODE` in Vercel and redeploy, and every owner route returns 404.
The code change is safe to keep dark. No data is deleted, and pausing the
production project is reversible.

## Timing, honestly

Code steps 1–5 are about one working day, including tests and documents. Owner
steps 6–12 need one sitting of about two hours, of which step 9 is the least
certain. Meeting the 30 September deadline needs the owner sitting on the
29th or 30th.
