# E.V production-mode qualification

Date: 9 September 2026. Risk: R2. Local release candidate; activation pending.

Previously, owner inbox and saved-chat routes required development on loopback.
The candidate now has an explicit production mode for the existing Vercel host.
It requires all of `NODE_ENV=production`, `VERCEL=1`, `VERCEL_ENV=production`,
`EV_MANAGEMENT_MODE=live`, `EV_CONVERSATION_STORAGE=production` and one canonical
HTTPS `EV_MANAGEMENT_ORIGIN`. No deployed setting was changed.

Request Host and URL origin must match the configured origin. Aliases, preview
deployments, an incomplete configuration and noncanonical/unsafe origins remain
denied. Writes additionally require the exact Origin header and JSON. These
selectors route traffic to an already authenticated system; they do not grant
guest identity, owner authority or MFA. Every data operation retains managed
identity verification, current-session RLS and the established bounded adapters.

`/manage` redirects to the live sign-in view only when enabled. The sample
workspace and file-backed sample API remain local. Password bootstrap is also
local only, including before reading its setup file. The deployed owner UI hides
sample navigation and uses accurate private-workspace and draft-save labels.
No draft save publishes knowledge or changes the answering corpus.

Ten production-origin/route checks cover default/alias denial, strict HTTPS/Origin,
sample/bootstrap denial, passive no-account reads, anonymous data denial, Secure
HttpOnly guest cookies and current MFA before transcript access. The positive
transcript fixture was corrected to include the repository's additional Auth
identity read; authentication was not weakened to make the test pass. Existing
local management/API regressions and application/test TypeScript pass. The
complete assembled candidate gate is recorded separately when executed.

Before activation: qualify migrations 007/008 and app integration; actual CAPTCHA
enforcement, hosts and Auth limits; retention/identity cleanup and operational
recovery; the existing-host persistent budget/provider setup; and frozen answers
with human review. Apply the existing edge abuse policy to the saved-answer path
`/api/conversations/ask` as well as `/api/assistant`; the per-user application
limiter is only a courtesy limit. Review the exact deployed origin and secret
bindings, then obtain final owner release approval. Production HTTPS/MFA,
revocation, persistence, CSP and default/alias denial still need deployed smoke
checks. Unit fixtures are not evidence of a live production release.

Rollback clears the production storage mode and denies the owner/storage routes;
it does not delete records, reset allowances, remove MFA or restore deleted chats.
Keep retained records, deletion evidence and latest paid reservations through the
compatible frontend/backend rollback. Public tab chat remains the ordinary path
when saved storage is disabled.
