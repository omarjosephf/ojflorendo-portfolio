# ADR-0025: One online owner-only admin panel, separate from visitor storage

- Status: **Accepted and deployed, 28 September 2026.** Owner decisions: the
  production database (option A) and the R2 plan. Merged as `97ecb23` (#108)
  and live on `https://ojfr.me/manage`; see Verification
- Date: 2026-09-28
- Owner: OJ Florendo
- Risk: **R2** for this record and the code change it describes (architecture,
  environment-variable contract, a new trust boundary on the public origin).
  Creating a Supabase project, applying migrations to it, entering production
  environment variables, enrolling the owner and deploying are separate **R3**
  owner actions
- Package: 19, instructor-set. Not a release gate for packages 13–16
- Related: [research](../reviews/admin-panel-blog-section-research.md),
  [plan](../roadmaps/admin-panel-package-19.md),
  [ADR-0016](0016-ev-management-storage-and-preview.md),
  [production-mode qualification](../reviews/ev-production-mode-qualification.md),
  [ADR-0022](0022-supabase-pro-for-managed-recovery.md) rider 3,
  [ADR-0023](0023-isolated-destination-for-managed-restore.md),
  [blog design](../reviews/blog-multi-agent-system-design.md),
  handbook §11 and §48 Track G

## Context

The instructor requires one admin panel for the portfolio. It must be deployed
online, so it works from another device. Only OJ may sign in. It must hold the
E.V RAG management panel and an admin for the blog multi-agent system. The
deadline is Wednesday 30 September 2026.

Verified in the code at `origin/main` `d113d31` on 28 September:

- **An owner sign-in already exists.** `/manage/live` uses Supabase password
  sign-in, a TOTP authenticator code (MFA), a database-owned role allowlist,
  HttpOnly cookies scoped to `/api/management/`, and same-origin JSON checks
  (ADR-0016). It has run only against the staging project, and only from the
  loopback address on the owner's machine.
- **A production mode is built and has never been switched on.**
  `src/lib/management/access.ts` opens it only when six conditions hold
  together, among them `EV_MANAGEMENT_MODE=live`,
  `EV_CONVERSATION_STORAGE=production` and one exact HTTPS
  `EV_MANAGEMENT_ORIGIN`.
- **That one switch opens two different things.** The same `storageAllowed`
  gate controls the owner routes (`/manage`, `/manage/live`,
  `/api/management/*`) *and* the visitor saved-chat routes
  (`/api/conversations*`, `/api/conversation-session`). It also sets
  `storageEnabled` on the public assistant in `src/app/(portfolio)/layout.tsx`.
  Switching the admin panel on today would therefore start saving visitors'
  chats on the public site. That has its own unmet gates: CAPTCHA
  enforcement, anonymous-signup protection, retention and recovery (see the
  qualification record).
- **The seven-section panel is local-only.** `ManagementWorkspace.tsx`,
  including package 17's RAG configuration section, renders sample data on
  loopback only. The deployed owner UI (`LiveOwnerWorkspace.tsx`) is the smaller
  inbox, operations and gaps view.
- **No blog admin exists, and no blog code is on `main`.**
- **The Supabase organization holds one project,** `ev-management-staging`,
  on Pro. Its US$10 compute credit covers that one project, and ADR-0022 rider 3
  makes a second project a separate decision.

## Decision

1. **One panel, on the existing site.** The admin panel is `/manage` on the
   production origin, in the existing Vercel project. It has two top-level
   sections, **E.V** and **Blog**. No new domain or DNS change is needed.

2. **Separate the admin switch from visitor storage.** Replace the single gate
   with two:
   - `adminAllowed`, which opens the owner routes when `EV_ADMIN_MODE=live`
     and the existing production and exact-origin conditions hold (it
     replaces the old `EV_MANAGEMENT_MODE=live` selector, which is retired so
     that no earlier configuration can open anything);
   - `visitorStorageAllowed`, which is `adminAllowed` *and*
     `EV_CONVERSATION_STORAGE=production`.

   The public assistant, `/api/conversations*` and `/api/conversation-session`
   use only `visitorStorageAllowed`. Package 19 turns on `EV_ADMIN_MODE` and
   leaves visitor storage **off**. Anonymous sign-up stays disabled in the
   production project. Tests must prove that the admin switch alone leaves
   every visitor-storage route returning 404 and the assistant's
   `storageEnabled` false.

3. **Production database: a separate production Supabase project** (option A
   below, chosen by the owner on 28 September 2026). It receives the ten reviewed
   migrations and holds one account: the owner's. Staging stays disposable and
   keeps its synthetic data.

4. **Identity stays as built.** Supabase password plus TOTP, the role
   allowlist, a current-session check and AAL2 (the MFA-verified level) are
   checked in the database on every owner read. No bespoke password system is
   added. Before the panel is reachable, the production project must have:
   managed CAPTCHA enforced on owner sign-in; leaked-password protection on (a
   Pro feature); and a verified owner recovery path. A Proxy redirect is only
   a convenience; every route handler and database function still authorizes.

5. **Blog section, read-only first.** In 19a the Blog section displays status,
   runs, review bundles and configuration, and changes nothing. Owner decisions
   (select a brief, approve, request a revision, reject, accept a lesson) come
   in 19b. Each will be written through an idempotent, revision-checked
   function, and each will record who, when and the bundle's SHA-256 digest.
   An approval requests a content-only pull request from the separately
   governed publisher. It never publishes, merges or deploys, and the
   `approved-to-deploy` gate is unchanged.

6. **The E.V section is the existing live views plus package 17's read-only
   RAG configuration.** Sample-data sections stay local. No section publishes
   knowledge or changes the answering corpus.

7. **No model call originates from the panel in package 19.** The panel holds
   no provider key and starts no pipeline run.

## Production database options

| Option | Cost | For | Against |
| --- | --- | --- | --- |
| **A. New production project in the Pro organization (chosen)** | About US$10/month for Micro compute. The organization credit is already used by staging | Real separation: staging keeps its synthetic users, test owners and qualification data, and stays safe to clone or reset. Pro daily backups cover it. Matches the handbook's staging/production split and ADR-0016's "live persistence" gates | A second set of migrations, secrets and an owner enrollment to maintain. Needs ADR-0022 rider 3's separate decision, which this is |
| B. Promote `ev-management-staging` to production | US$0 extra | Already migrated and verified object by object | Carries synthetic accounts and test owners into production. Staging stops being disposable. ADR-0023's rehearsal would then clone production data |
| C. A non-Supabase database | Varies | — | Throws away managed Auth, the MFA and RLS design and all ten migrations. Rejected |

## Alternatives considered

- **A managed CMS or the provider dashboards** (handbook Track G says to
  evaluate these first). Rejected for this package. The instructor requires one
  panel, the blog's content is typed modules in Git, and no dashboard shows E.V's
  review queue or a blog review bundle.
- **An `admin.` subdomain.** It would give stronger cookie and origin isolation,
  but it needs a DNS change (R3) and new origin configuration. The existing
  path-scoped `SameSite=Strict` HttpOnly cookies are acceptable for now.
  Reconsider it at public release.
- **Turning on the existing production mode unchanged.** Rejected. It would
  switch on visitor chat storage before its gates pass.

## Consequences

- A new public sign-in surface on the portfolio origin. Controls: CAPTCHA,
  Supabase Auth rate limits, MFA, `no-store`, same-origin JSON, the existing
  CSP, and restrictive AAL2 policies. A threat model and a runbook are
  required before go-live (handbook Track G).
- **ADR-0023 needs a small amendment.** Its check that "the organization lists
  one project again" becomes "lists the permanent projects again (staging and
  production)". The 13d rehearsal still clones staging. Rehearsing recovery of
  *production* data becomes a follow-up.
- The monthly Supabase bill rises from about US$25 to about US$35.
- Rollback: unset `EV_ADMIN_MODE` and redeploy, and `/manage` returns 404 again.
  No record is deleted, and MFA is not removed. The production project can be
  paused. Deleting it is a separate R3 action.

## Verification

**Code, 28 September 2026 (branch `feat/admin-panel-19a`, local):** both gates
implemented and every call site moved; 18 production-access tests, including
admin-only-mode route tests that return 404 from every visitor-storage route
(a deliberate mutation pointing one visitor route at the admin gate makes them
fail); the RAG view served only to an MFA-verified owner, without chunk text;
component tests for the E.V and Blog sections; the Playwright management suite
with axe audits at 1280 and 390 pixels in both themes. Route-handler tests stand
in for "e2e" in criterion 3, because a production-mode Vercel environment cannot
be reproduced locally; the deployed smoke test covers it for real.

**Deployment, 28 September 2026.** Every R3 step was confirmed by the owner
immediately before it was done.

- **Project:** `ev-management-production` (`ksgrzepzowgisprcxpwv`), Micro,
  `eu-west-1`, PostgreSQL 17.6.1.166, created 14:31 UTC. Default privileges were
  compared with staging before any migration and matched exactly.
- **Migrations:** the ten reviewed versions, applied with `supabase db push`
  after a dry run. Fingerprints of tables and RLS, policies, table grants,
  column grants and event triggers match staging exactly. The 23 functions match
  once carriage returns are ignored: this worktree had migrations 003, 004, 007
  and 008 checked out with CRLF endings, so eight production functions carry
  carriage-return characters in their source (staging has them for 003 and
  004). Behaviour is unaffected, and the backup reader checks only the version list.
- **Auth:** sign-ups, anonymous sign-ins and manual linking off; site URL
  `https://ojfr.me`; leaked-password protection, secure password change and
  current-password-on-update on; minimum length 14 with all four character
  classes. One user, one owner row, one verified TOTP factor.
- **CAPTCHA:** a dedicated Turnstile widget for `ojfr.me`; enforcement proven by
  a no-token password request refused with `captcha_failed`.
- **Vercel:** five Production-only variables; `EV_CONVERSATION_STORAGE` and any
  secret key absent.
- **Enrolment defect found and fixed** (`bbab610`): a rejected TOTP code signed
  the owner out and discarded the setup key, so every retry enrolled a new
  factor; a password Auth refused left the setup lock in place. Both now keep
  the owner on the step with a plain message. Covered by tests.
- **Release:** `verify` green on `bbab610`; `approved-to-deploy` applied on the
  owner's instruction and recorded on the pull request; merged pinned to that
  head as `97ecb23`; Vercel deployment `dpl_BrguodXNEzrY9vJXyXpUGMGZ8DGT` READY.
- **Smoke test, automated:** `/manage` 307 to `/manage/live` 200; owner API
  `signed_out` with CAPTCHA required; gaps and reports 401; the RAG view returns
  no data signed out; `/api/conversations` and `/api/conversation-session` 404;
  sample API 404; the `vercel.app` alias 404; `www` 308 to the apex;
  `private, no-store` and `noindex`; writes with no or a foreign `Origin` 403;
  production bootstrap 404.
- **Smoke test, owner's iPhone:** password sign-in with CAPTCHA at 17:24:47 UTC
  and TOTP verification at 17:25:08, both in the production project's Auth log
  (staging logged no Auth request after 17:00); both sections shown; RAG
  configuration loaded; Blog "Not running"; sign-out (`/logout` 204 at
  17:26:32) returned the page to sign-in.
- **Security advisors:** the same intentional findings as staging (eight
  deny-all private tables, seven owner-checked definer functions) and no
  leaked-password finding.
