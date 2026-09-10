# E.V live storage staging review

Measured 9 September 2026. The owner-approved Free staging project is provisioned
in Ireland, with explicit table grants and automatic RLS for new public tables.
No subscription was purchased and these checks made no model calls.

## Executed evidence

- [13 real Supabase checks](evidence/2026-09-09-supabase-storage.json): distinct
  managed guest principals; unauthorized and cross-guest denial; six simultaneous
  identical writes returning one record; immutable assistant text/events; owner
  denial before TOTP and access at AAL2; refresh; deletion; expired-row hiding;
  manual purge; and signed-out JWT denial at the Auth and database boundaries.
- [Six actual app integration checks](evidence/2026-09-09-supabase-app.json): passive
  reads create no account; HttpOnly guest connection; saved question/response;
  completed-request replay; exact historical result restoration; another guest's
  denial; deletion and disconnect. The model service was deliberately unset; the
  stored unavailable result does not establish generated-answer quality.
- Six deterministic browser checks cover save/reload/delete, failed-save recovery
  without another generation, and light/dark accessibility at 1280/390 pixels.
- 30 local PostgreSQL checks cover the three migrations, including active-session
  revocation, immutable generation completion and one-time request admission.

The first storage full gate passed below. The owner/retention extension has
additional focused checks; its full gate is recorded separately when complete.

## Finding and correction

The first Auth attempt preceded configuration rollout and returned
`anonymous_provider_disabled`; the harness now checks the read-only Auth settings
endpoint for readiness before creating a user. Another assertion expected 401,
where the service returned the correct 403 `bad_jwt` rejection.

The substantive finding was a logged-out JWT still reading its own PostgREST
rows. `202609090001_ev_active_sessions.sql` now requires the corresponding managed
session to remain active, including guest definer RPCs. The repeated live test
returned zero rows for that token. Owner access additionally checks the current
session MFA state. No test expectation was weakened to accept the stale read.

Synthetic users were removed by exact IDs and anonymous signup was disabled after
qualification. Operational logs and this evidence contain no session keys, owner
email, raw visitor conversation or payment details.

## Current limits

The six-section sample workspace retains labelled sample events and local drafts.
The separate managed-owner workspace now has a live inbox, database-backed drafts
and bounded reporting. Answer-event instrumentation and gap-triage integration remain work. The guest storage path saves actual historical
responses but does not invent retrieval metadata absent from the answering wire.

Human-owner MFA enrollment, CAPTCHA-backed public signup, an isolated full
backup/restore rehearsal and hosting qualification remain. Inactive guest cleanup,
scheduled transcript retention and transactional deletion replay now pass.
The final owner preview and public activation are separate. Saved-answer signatures
last 30 minutes; a browser refresh can discard an unsaved signature even while the
visible reply survives in bounded tab history. The UI states this limitation.

## Full application checkpoint

The complete `npm run test:ci` gate passed on 9 September 2026: 516 unit,
30 SQL, 82 production-browser and 16 management-browser checks. Both dependency
audits, documentation anchors, lint, type checks, corpus validation and production
build passed. Package 12 is complete locally and in staging; owner integration,
operations, hosting and final answer qualification remain separate work.

## Owner and operations extension

[Seven actual owner-app checks](evidence/2026-09-09-supabase-owner.json) qualify
one-time password setup, managed sign-in, denial before MFA, enrollment, TOTP
verification, live transcript reads, sign-out and exact synthetic cleanup. The
setup file names a provisioned user; it contains no password or session key.
[Maintenance evidence](evidence/2026-09-09-supabase-maintenance.json) records the
actual scheduled canary, transactional replay and 36 local PostgreSQL checks.

The owner inbox passed five Chromium checks across desktop/mobile and both
themes, including clearing the transcript on session rejection. Screenshots were
inspected. Four additional setup-screen checks are part of the new complete gate.
The earlier 516/30/82/16 full gate predates these owner/retention changes.

## Live editorial and reporting extension

[Eight actual operations checks](evidence/2026-09-09-supabase-operations.json) passed
with isolated synthetic managed accounts, current MFA and exact cleanup. The
human owner's account was provisioned separately; no human enrollment is inferred.
Concurrent identical saves produce one revision, competing edits accept one and
reject the stale editor, and revoked sessions cannot read drafts or reports.

The report aggregates at most the newest 1000 retained questions in a seven- or
30-day rolling window, explicitly signalling truncation. It distinguishes saved
replies from replies with trusted diagnostics, shows feedback denominators and
counts a source at most once per answer. Citation exposure is not user interest.
Missing diagnostics remain missing. Deletion changes subsequent reports.

Draft writes require current owner MFA, a stable request UUID and the expected
revision. Direct authenticated table writes are revoked. The private receipt
records actor, revision, status, timestamp and input SHA-256; it stores no earlier
body text. History is therefore an audit trail, not text-version recovery. Limits
are 100 drafts and 10000 receipts per owner. Receipts cascade when an operator
deletes a draft; capacity requires an explicit reviewed archive/deletion decision.
Saving or marking ready cannot publish knowledge.

The complete owner-access gate passed with 537 unit / 36 SQL / 82 production-browser
/ 25 management-browser checks before this extension. The extension then passed
545 unit, 42 SQL, lint/types, production build, six added browser checks and three
production-denial checks. The six browser checks used isolated browser contexts
against the already-running local preview; every API request was blocked unless
explicitly mocked. The usual complete-gate configuration additionally blanks
live credentials. No synthetic browser request was sent to Supabase.

The initial browser run preserved the draft but could not locate a nested textarea
label reliably. Explicit label associations fixed it; failed-save, receipt retry,
reload, stale-edit comparison and revocation checks now pass. Desktop and mobile
screenshots in both themes were inspected. The complete suite has not been rerun
for this extension while the human setup preview remains open.
