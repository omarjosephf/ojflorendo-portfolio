# Managed Auth CAPTCHA qualification

Date: 9 September 2026. Risk: R2. Status: local implementation qualified;
managed protection and public activation remain pending.

New saved-chat connections require explicit 30-day retention consent, a configured
public Auth site key and a nonempty token of at most 2048 characters. Missing or
malformed configuration closes new signup. Existing guest session verification,
refresh, saved-chat reads and disconnect remain independent of CAPTCHA. Opening
the panel never creates an identity. A rejected connection preserves the tab chat.

The visitor starts the verification widget explicitly. Expired/error tokens are
cleared; every attempted connection consumes the local token and resets the check.
A synchronous guard prevents duplicate submissions. Cancel removes the widget
and discards its token. A stalled script fails visibly after ten seconds. Later
mounts receive the same bounded load failure; late removed-widget callbacks are
ignored. The existing contact widget loader is shared, and its default contact
message and separate fail-open server policy remain unchanged.

The public `EV_AUTH_TURNSTILE_SITE_KEY` is distinct from the contact site key. It
travels in a no-store session response; Auth credentials stay server-side. The
per-request nonce reaches the lazy chat and management widget. The exact existing
Cloudflare origin and nonce-based CSP need no relaxation or new dependency.

Supabase Auth validates the token once. Calling Cloudflare Siteverify first would
consume a single-use token before Auth can verify it. Owner password sign-in
passes the same Auth CAPTCHA field when configured, then still requires current
owner status and authenticator verification. One-time password bootstrap is
blocked before mutation while Auth CAPTCHA is configured; complete owner setup
before enabling it. Owner session refresh, sign-out and MFA operations remain
available without creating an extra password challenge.

## Executed local evidence

- 69 focused route, transport, signup/owner lifecycle, contact and assistant
  regression tests passed. Two additional shared-widget tests cover stalled
  script loading, nonce propagation, expiry/error/reset/removal and late callbacks.
- 15 synthetic browser checks cover owner password/MFA/inbox and revoked access,
  setup, saved-chat reload/deletion, save-only retry, light/dark themes and
  1280/390px layouts. Two additional mobile challenge checks cover accessibility,
  nonce presence, cancellation and continued tab-chat availability.
- Application/test TypeScript, targeted ESLint and documentation anchors pass.
  A test-only role-query option mismatch was corrected before accepting types.

Browser fixtures replace Cloudflare's script and intercept Auth/application APIs.
They prove application behavior, not Cloudflare challenge accessibility or actual
managed CAPTCHA enforcement. Production storage routes remain disabled; no Auth
configuration, human account, model, allowance or hosting setting changed.

## Activation and recovery sequence

1. Keep anonymous signup closed. Verify owner setup/MFA and an independent
   Supabase dashboard recovery path before changing project-wide Auth protection.
2. Prepare a managed Cloudflare widget with exact approved preview/public
   hostnames, no wildcard or pre-clearance, and configure its public key on the
   candidate. Keep the secret exclusively in the existing Supabase Auth CAPTCHA
   setting. Inspect current Auth signup/rate settings; preserve approved limits.
3. After approval of the concrete settings, enable Turnstile protection in
   Supabase Auth. Qualify missing, invalid, expired and reused token rejection
   directly at Auth as well as through the application. A site key alone is not
   enforcement and the in-memory courtesy limiter is not a distributed defense.
4. Complete a fresh human owner password/challenge/authenticator sign-in and
   inbox read. Do not request passwords, tokens, setup keys or codes in chat.
   Qualify real guest consent/create/resume/delete with exact synthetic records,
   bounded attempts and approved cleanup; do not create a load-test user flood.
5. Record actual managed limits, deployed nonce/CSP behavior, allowed-host checks
   and recovery evidence. Only then consider anonymous/public activation with
   the remaining release gates and final owner approval satisfied.

On verification failure, close new signup and keep existing session access.
Recover configuration through the independent dashboard path; do not disable
managed protection while anonymous signup is open or remove the owner's MFA.
Do not introduce a sitekey-only or client-only verification bypass.

References: [Supabase Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha),
[Cloudflare token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[explicit widget rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
and [CSP guidance](https://developers.cloudflare.com/turnstile/reference/content-security-policy/).
