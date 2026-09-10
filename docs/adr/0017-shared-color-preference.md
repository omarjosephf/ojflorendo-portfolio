# ADR-0017: Shared display theme

- Status: Owner-requested local implementation; public release remains separate
- Date: 2026-09-08
- Owner: OJ Florendo
- Risk: R1; display preference only

## Decision

Offer System, Light and Dark in the portfolio navigation. The embedded E.V
dialog inherits that website preference and has no separate theme control, as
requested by the owner on 9 September 2026. System follows the device until the
visitor chooses another option. The private management toolbar also controls
the shared preference. Use one provider and semantic color pairs for all three surfaces. Future
UI changes must preserve both themes, readable contrast, visible focus and
reduced-motion behavior. Images retain their original colors.

An explicit `oj-color-theme` cookie stores only the validated preference for one
year, with Path=/, SameSite=Lax and Secure on HTTPS. No preference cookie is
written on an untouched visit. The async Next.js root layout and viewport read
it before rendering. CSS `color-scheme` and `light-dark()` apply the theme without
an initialization script or a first-paint light flash. Unsupported cookie values
fall back to System. Existing request-dependent rendering remains dynamic;
private responses must not enter a shared cache.

Client controls update all mounted surfaces together and use BroadcastChannel
for same-origin tab synchronization where supported. Explicit theme changes
suppress transitions during the style update so opposing foreground/background
colors do not pass through an unreadable midpoint. No remote call, identifier or
chat content is included. Failed cookie persistence leaves the selected theme
working on the page and displays an honest notice.

## Alternatives and limitations

LocalStorage alone would require client initialization and risk a mismatched
first paint under the request-nonce CSP. A third-party theme package is unnecessary
for this scope. The preference does not synchronize across unrelated domains or
devices. Without JavaScript, a previously saved preference and System still
render correctly, but changing the native select requires JavaScript.

Modern browsers supporting CSS `light-dark()` are the target, consistent with
this Next.js application; additional browser engines require their own checks.
[CSS color behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark).

## Verification and rollback

Production browser checks cover device changes, explicit choices, cross-tab and
chat inheritance without a duplicate selector, reloads, no-JavaScript initial rendering, invalid cookies,
blocked cookies, CSP and desktop/mobile accessibility. The management suite
covers all six sections in both themes. Existing portfolio checks still apply.

Revert the theme candidate to roll back; the preference cookie contains no data
requiring migration and can safely be ignored. Public publication remains part
of the owner's final release review.
