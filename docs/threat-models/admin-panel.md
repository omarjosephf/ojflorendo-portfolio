# Owner admin panel threat model

Status: phase 19a code, not deployed. Supplements
[ADR-0025](../adr/0025-unified-owner-admin-panel.md) and the
[E.V management threat model](ev-management.md), whose controls all still apply.
What is new is a sign-in page on the public production origin, a separate
production Supabase project, and a Blog section.

| Asset / boundary | Failure | Control and evidence required |
| --- | --- | --- |
| Admin switch | Turning the panel on also starts saving visitors' chats | Two gates in `access.ts`: `adminAllowed` (`EV_ADMIN_MODE=live`) and `visitorStorageAllowed` (that plus `EV_CONVERSATION_STORAGE=production`). Route-handler tests assert 404 from every visitor-storage route with only the admin switch set, and a mutation of one route to the admin gate fails them |
| Retired selector | An old `EV_MANAGEMENT_MODE=live` value opens production | That value no longer selects anything in production; a unit test asserts both gates stay closed with it |
| Public sign-in page | Password guessing or credential stuffing | Managed Turnstile CAPTCHA enforced by Supabase Auth, Supabase Auth rate limits, leaked-password protection, TOTP MFA, a 14-character minimum password. The in-memory limiter is a courtesy, not a defence |
| Owner session | A stolen or stale cookie reads owner data | HttpOnly, `SameSite=Strict`, `Secure` cookies scoped to `/api/management/`; every read re-checks the current session, owner role and AAL2 in the database; sign-out revokes the managed session |
| Cross-site requests | A forged request changes owner data | Exact `Origin`, JSON-only content type, and exact request-URL origin on every write; aliases and preview deployments get 404 |
| RAG configuration view | Corpus text or cost figures reach a signed-out visitor | Served only by `GET /api/management/owner?view=rag` after an MFA-verified owner check. It returns settings and chunk sizes, never chunk text. It is not rendered into the page before sign-in |
| Blog section | The panel starts a paid run, publishes or holds a key | Phase 19a's Blog section is static and read-only. It imports no pipeline code, calls no API and holds no key. Its text states what does not exist |
| Production project | Test accounts or synthetic data reach production | A separate project with one account (the owner), anonymous sign-ins off, and migrations checked object by object |
| Owner enrollment | Bootstrap is exposed online | Password bootstrap runs only on loopback in development and needs an ignored, expiring local setup file. It is closed whenever CAPTCHA is armed. The production owner route returns 404 for `initialize` |
| Wrong configuration | Vercel points at staging, or at no project | The smoke test confirms the sign-in lands in the production project's Auth logs; a missing origin or switch closes every route |
| Lockout | CAPTCHA or MFA leaves the owner unable to sign in | Enrol before arming CAPTCHA; keep the dashboard recovery path; rollback is unsetting `EV_ADMIN_MODE`. MFA is never silently removed |

## Residual risks, accepted for 19a

- The sign-in page shares the portfolio origin. An `admin.` subdomain would
  isolate cookies and origins further. It needs a DNS change and is reconsidered
  at public release.
- Owner actions are recorded only where ADR-0016's receipts already record
  them (draft saves, gap reviews). A general admin audit log is phase 19b.
- There is no alerting on repeated failed owner sign-ins beyond Supabase's own
  Auth logs. The runbook says where to read them.
