# Owner admin panel runbook

Status: phase 19a code, not deployed. Decision:
[ADR-0025](../adr/0025-unified-owner-admin-panel.md). Plan:
[package 19](../roadmaps/admin-panel-package-19.md). Threats:
[admin panel threat model](../threat-models/admin-panel.md).

Every step below that creates, configures, spends, enrols or deploys is **R3**:
the owner confirms it immediately before it is done. Never put a password,
setup key, authenticator code, secret key or service key in chat, a screenshot,
a log or this repository.

## The switches

| Variable | Value | Opens |
| --- | --- | --- |
| `EV_ADMIN_MODE` | `live` | `/manage`, `/manage/live` and `/api/management/*` on the exact origin |
| `EV_MANAGEMENT_ORIGIN` | `https://<canonical host>` | Required by both gates; must be exact HTTPS with no path or port |
| `EV_CONVERSATION_STORAGE` | `production` | Visitor saved chats. **Leave unset in package 19** |

Both gates also require `NODE_ENV=production`, `VERCEL=1` and
`VERCEL_ENV=production`, so preview deployments and aliases stay closed.
`EV_MANAGEMENT_MODE=live` is retired; only `EV_MANAGEMENT_MODE=preview` is
still read, for the loopback preview.

## Enable, in order

1. **Create the production project** in the `Project Zero` organization: Micro
   compute, same region as staging. About US$10/month (ADR-0025).
2. **Apply the ten reviewed migrations** with the Supabase CLI, following
   [the staging migration runbook](ev-staging-migrations.md). Then verify each
   object in the catalogs, not only the version rows, and run the security
   advisors.
3. **Configure Auth**: anonymous sign-ins off; public sign-ups off; site URL set
   to the production origin; leaked-password protection on. Do **not** enable
   CAPTCHA yet, because password bootstrap is closed while it is armed.
4. **Provision the owner.** In the Supabase dashboard, create the owner's user
   by email. As the database operator, insert that user's ID into
   `ev_private.owners`. No form can grant this role.
5. **Enrol the owner from loopback.** On the owner's machine, point a local
   environment file at the production project (`SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` for this step only),
   with `EV_CONVERSATION_STORAGE=staging` (the loopback selector) and **no**
   `EV_AUTH_TURNSTILE_SITE_KEY`. Arm `.ev-preview/owner-setup.json` as the
   [E.V management runbook](ev-management.md#owner-staging-preview) describes.
   Run `npm run preview:management`, open `http://127.0.0.1:3215/manage/live`,
   choose the password, and enrol the authenticator (name the account
   **E.V Management**). The setup file is consumed on success. Then remove
   the secret key from the local file.
6. **Arm CAPTCHA**: create the Turnstile widget for the exact production
   hostname, put its secret only in Supabase Auth's CAPTCHA setting, and enable
   enforcement. See [the CAPTCHA qualification](../reviews/ev-auth-captcha-qualification.md#activation-and-recovery-sequence).
7. **Set the Vercel production variables**: `EV_ADMIN_MODE=live`,
   `EV_MANAGEMENT_ORIGIN`, the production `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY`, and `EV_AUTH_TURNSTILE_SITE_KEY`. Leave
   `EV_CONVERSATION_STORAGE` unset. No secret or service key is needed by the
   panel.
8. **Deploy** through the normal release path: `verify` green, the
   `approved-to-deploy` label on the owner's instruction, then merge.

## Smoke test, from a second device

1. `/manage` redirects to `/manage/live`, which shows **Owner sign-in** with the
   CAPTCHA.
2. Sign in, pass the challenge, and enter the authenticator code. The panel
   shows **E.V assistant** and **Blog agents**.
3. **Show RAG configuration** renders; **Blog agents** says **Not running**.
4. `/api/conversations` and `/api/conversation-session` return 404, and the
   public assistant offers no saved chats.
5. The sign-in appears in the **production** project's Auth logs, and not in
   staging's. The browser never calls Supabase directly, so check the logs
   rather than the browser's network requests.
6. Sign out; reload; the panel asks for sign-in again. A stale browser tab
   cannot read owner data.
7. Run the security advisors on the production project and record the result
   in ADR-0025's Verification block.

## Disable or roll back

Unset `EV_ADMIN_MODE` in Vercel and redeploy. Every owner route returns 404
again. Nothing is deleted, MFA is not removed and the project keeps its data.
Pausing the Supabase project is reversible; deleting it is a separate R3
decision.

## Owner lockout

- **CAPTCHA will not load or verify:** unset `EV_AUTH_TURNSTILE_SITE_KEY` in
  Vercel only after disabling enforcement in Supabase Auth, then redeploy. Never
  add a client-only bypass.
- **Authenticator lost:** recovery is operator-assisted after verifying the
  owner's identity through the Supabase dashboard account, which is separate
  from the panel account. Do not silently delete a verified factor.
- **Password forgotten:** re-arm the loopback setup file (enable step 5) with
  CAPTCHA temporarily disarmed, then re-arm CAPTCHA.

## Incident signals

Read Supabase Auth logs for repeated failed sign-ins or unexpected factor
changes. On any sign of compromise, follow
[the security incident runbook](security-incident.md): disable the panel first
(unset `EV_ADMIN_MODE`), then revoke sessions in Supabase Auth.
