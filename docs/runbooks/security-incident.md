# Responding to a security incident

Status: **procedure, written 17 September 2026. It has never been exercised.**
No P0 or P1 incident record exists in this repository, and nothing in this file
has been executed against a live system under incident conditions. Read it as a
procedure that has been reasoned through and checked against the code and
configuration it names, not as one that has been proven under pressure.

This is the runbook `docs/ENGINEERING_HANDBOOK.md` §38 requires and that §28 and
§37 assume. §38 has named this path while the file was absent, so the incident
levels §37 defines and the vulnerability-handling steps §28 lists had no
operational procedure behind them — they named what to do and nowhere said how.

`npm run docs:check-required-docs` compares §38's list against the tree, and runs
as a stage of the required gate. With this file written and §38's one naming
drift corrected the same day — it called `contact-email-delivery.md` by a name
nothing on disk used — that check passes. If it ever fails again, a document this
handbook requires has gone missing or been renamed, and this runbook is one of
the four it is watching.

## Scope

Covers a security incident affecting any part of Project Zero: the portfolio on
Vercel, the E.V retrieval backend on Fly (`omarjosephf/cited`), the Supabase
management staging project, either GitHub repository, the `ojfr.me` domain, or
any credential belonging to them.

Does **not** cover an outage with no security dimension, which is
`docs/runbooks/rollback.md`, or a deployment that simply went wrong, which is
`docs/runbooks/deployment.md`. Use this file when the question is *has something
been exposed, taken over, or abused*, and the other two when the question is
*why is it broken*.

## Authority

Containment is almost entirely R3 under `docs/ENGINEERING_HANDBOOK.md` §11 —
rotating secrets, deleting resources, changing DNS, altering account security
settings. Every one of those needs explicit owner confirmation immediately
before the action, restating the exact target and consequence, and none of them
may be inferred from approval of anything else.

An incident does not suspend that rule. It is the circumstance the rule was
written for: the moment when acting fast is most tempting and least reversible.
What an incident *does* change is the order — §37 puts containment ahead of
diagnosis for P0 and P1, so approve and contain first, and work out exactly what
happened second.

## Severity, as it applies here

`docs/ENGINEERING_HANDBOOK.md` §37 defines P0 to P3 and that definition is not
repeated here. What follows is the mapping from this project's concrete events
onto those levels, which is the part §37 cannot supply.

**P0** — any of `RESEND_API_KEY`, `ASSISTANT_SERVICE_SECRET`, the backend's
matching `SHARED_SECRET`, `SUPABASE_SECRET_KEY`, `EV_CONVERSATION_RECEIPT_SECRET`,
`TURNSTILE_SECRET_KEY`, or either model-provider key exposed, published or
suspected leaked; GitHub, Vercel, Supabase, Fly, Cloudflare or registrar account
compromise; DNS or domain takeover; production serving code nobody approved.

**P1** — `/api/contact` or `/api/assistant` under abuse at a rate that matters;
the assistant answering from outside its corpus, disclosing its system prompt, or
degrading silently to some other answering path, which §49.1 prohibits outright;
contact delivery broadly broken in a way that loses enquiries.

**P2** — a CSP or security-header regression reaching production; a moderate
advisory that is reachable in production; the management platform reachable in
production when it must return 404.

**P3** — an unreachable advisory; documentation that misstates a security
control. The second matters more than its level suggests: this project's own
record shows a runbook describing completed work as pending nearly caused
migrations to be re-applied to a live database.

When the level is genuinely unclear, treat it as the higher one until evidence
says otherwise. Downgrading later is cheap.

## The first moves

`docs/ENGINEERING_HANDBOOK.md` §37 gives the order for P0 and P1: stop unrelated
work, preserve evidence without exposing sensitive data, contain or roll back,
inform the owner immediately, verify recovery, then create the incident record.

Two project-specific notes on that sequence:

**Informing the owner is not a step you can skip by being the owner.** In a solo
project the owner is usually the person responding. The obligation that survives
is the written one — the incident record below — because the purpose of the step
is a durable account, not a notification.

**Preserving evidence comes before containment, and containment destroys
evidence.** Rotating a key ends the exposure and also ends your ability to see
what was done with it. Capture what you can read first: platform logs, the
dashboard view, the request pattern. Then rotate.

## Containment levers, by blast radius

Smallest first. Prefer the narrowest lever that actually stops the bleeding.

### 1. Switch the assistant off

The documented off switch is unsetting `ASSISTANT_SERVICE_URL` and
`ASSISTANT_SERVICE_SECRET` in the Vercel environment. `.env.example` records this
as the supported way to disable the feature. With neither set,
`readServiceConfig()` returns `null` and the route answers
`{"state":"unavailable"}` with a 200 — the visible degradation §49.1 requires,
rather than an error or a silent substitution.

No code change is involved: `readServiceConfig()` is called inside the request
handler (`src/app/api/assistant/route.ts:194`) and reads `process.env` at call
time. **Whether a Vercel environment change reaches an already-running deployment
without a redeploy is platform behaviour this runbook has not verified.** Assume
a redeploy is required, and prove the switch worked by calling the live endpoint,
not by reading the dashboard.

Setting only one of the two is a misconfiguration rather than a disable. The
route fails closed and logs a warning naming the missing one, which is safe but
is not the state you want to leave production in.

### 2. Revoke contact delivery

Revoke `RESEND_API_KEY` at the provider, then remove it from the Vercel
environment. With any of the three contact variables absent the safe mock
transport takes over: the flow still validates, no mail is sent, and the UI says
plainly that nothing was sent. That is honest degradation, not a fix — enquiries
made during this window are lost, so it is a containment measure with a real
cost, and the window belongs in the incident record.

### 3. Roll back the deployment

`docs/runbooks/rollback.md` holds the known-good target and the procedure. Use it
when the incident is *in the shipped code*. It will not help against a leaked
credential, because the credential is in the environment rather than the build.

### 4. Rotate the shared secret between site and backend

`ASSISTANT_SERVICE_SECRET` on Vercel must equal `SHARED_SECRET` on the Fly
service. `.env.example` records the order: **change it on the service first**,
then on the site. Reversing that order leaves the site authenticating with a
secret the service no longer accepts, which fails closed — safe, but it is an
outage you chose by accident.

A leaked value here is both an access incident and a spend incident. See
**Money** below.

### 5. Rotate provider credentials

`GEMINI_API_KEY`, `GEMINI_PROJECT_ID`, `OPENAI_API_KEY` and `OPENAI_PROJECT_ID`
belong to the backend, not to this repository. They are Fly secrets on the
deployed service, and they also exist transiently in the owner's PowerShell
session during a paid capture, where they are never persisted.
`Set-Provider-Keys.ps1` writes Fly secrets; it is not a tool for session
variables. That script lives in the owner's workspace root, outside this
repository and outside version control, so nothing here can tell you what it
says today. Revoke at the provider console first, because that is the only action
that actually stops use of a key someone else holds; updating Fly afterwards
restores service.

### 6. Repository and platform

Branch protection is restorable from `docs/operations/main-protection.json`,
which exists so the control can be reapplied and read back rather than
reconstructed from memory. Apply it, then verify by reading the live
configuration back — that file documents both commands.

The five `EV_BACKUP_*` values referenced by `.github/workflows/ev-backups.yml`
live in a GitHub Actions environment named `ev-backups`. **As of 17 September
2026 none has been minted**, and the job is inert behind the `EV_BACKUP_ENABLED`
repository variable, which the reviewed activation has not set. It also carries
no pull-request trigger, so a fork cannot reach those secrets. Check whether that
is still true before
assuming there is anything there to rotate; if the flag has since been set, those
five are P0-class credentials with database and object-store reach.

### 7. Domain and DNS

Registrar and DNS actions are R3 and are never improvised —
`docs/ENGINEERING_HANDBOOK.md` §35 says so explicitly for recovery. Verify DNS
before removing any old deployment or domain binding. A domain incident is the
one category here where a wrong containment step is harder to undo than the
incident.

## Where the credentials are

Rotation is only as good as the inventory it works from. This is that inventory,
read from `.env.example`, `SECURITY.md` and the workflow files on 17 September
2026. It is a map of *where a value lives*, and deliberately holds no value.

| Credential | Lives in | Notes |
| --- | --- | --- |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Vercel server environment | Any one absent means mock mode and an honest "not sent" |
| `TURNSTILE_SECRET_KEY` | Vercel server environment | The Cloudflare console holds the authority |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser bundle, public by design | Inlined at **build** time — changing it needs a redeploy |
| `ASSISTANT_SERVICE_SECRET` | Vercel server environment | Must equal `SHARED_SECRET` on Fly; rotate the service first |
| `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Vercel / local qualification environment | Staging project only; `/manage` is 404 in production by design |
| `EV_CONVERSATION_RECEIPT_SECRET` | Server-only environment | Rotating invalidates outstanding unsaved receipts |
| `EV_AUTH_TURNSTILE_SITE_KEY` | Public site key | Its secret half lives in Supabase Auth, not here |
| `GEMINI_*`, `OPENAI_*` | Fly secrets on `omarjosephf/cited` | Revoke at the provider console first |
| `EV_BACKUP_*` (five) | GitHub Actions environment `ev-backups` | Not minted as of 17 Sep 2026; job inert behind a repository variable |
| GitHub, Vercel, Fly, Supabase, Cloudflare, registrar logins | Owner's password manager, with MFA | §26 lists the hardening that must stay on |

`SECURITY.md` states the standing rule these all inherit: an exposed secret must
be revoked and rotated immediately, and no secret may enter source control, logs,
screenshots or project documentation — including the incident record you are
about to write.

## Some forensic data does not exist, by design

Do not spend the first hour looking for it.

This project deliberately does not log contact message bodies, visitor questions,
provider response bodies or raw request bodies. `SECURITY.md` states that
assistant questions are not stored and no conversation history is kept on either
side this project controls; `docs/ENGINEERING_HANDBOOK.md` §36 lists the
prohibited fields. The assistant's page-memory history lives only in the open tab
and is gone when it closes.

So "what exactly did the attacker ask" is frequently unanswerable here, and that
is a privacy property working as intended rather than a gap to close during an
incident. What *is* available: platform request logs and their status categories,
the rate-limit behaviour, provider-side usage and billing, the ledger
reservations for spend, and the GitHub audit log for repository and account
events.

Widening logging to improve forensics is a privacy change. It is R2, it needs a
threat-model and privacy review, and it is never a decision to take mid-incident.

## Money is an incident category here

Unusually for a portfolio, abuse of `/api/assistant` spends real money, and one
of the two ledgers behind it does not refill.

If a spend incident is suspected, read `docs/runbooks/durable-budget.md` and
`docs/state/CURRENT.md` before touching anything. Two things matter more than
speed:

- **Never re-create a ledger to recover allowance.** Item 5 of the durable-budget
  runbook forbids it, and the qualification allowance is a lifetime ceiling — a
  ledger recreated to regain authority destroys the control it was created to be.
- **The service ledger and the qualification allowance are different things with
  different windows.** Containment aimed at the wrong one does nothing.

The controls that already bound this are described in `SECURITY.md`: a
server-only shared secret, a per-instance throttle, the production edge rule on
`/api/assistant`, and the durable reservations. None of them is a guaranteed
monetary bound, which is why a leaked `ASSISTANT_SERVICE_SECRET` is treated as P0
rather than as an access nuisance.

## When the report comes from outside

`docs/ENGINEERING_HANDBOOK.md` §28 gives the ten steps and they are not repeated
here. The project specifics around them:

- The reporting address is the one published in `SECURITY.md`. Reports are
  acknowledged privately, and a security-sensitive report must not become a
  public issue.
- Do not ask a reporter for credentials, tokens or personal data, and do not
  accept them if offered — `SECURITY.md` tells reporters not to send them, and
  the same rule binds the person receiving the report.
- Only the latest deployed `main` is supported. A report against an old commit,
  tag or preview deployment is still worth reading, but the fix lands on `main`.
- Coordinate disclosure after remediation and production verification, not
  before.

## Recording it

`docs/ENGINEERING_HANDBOOK.md` Appendix E is the incident record template. Use it
as written rather than inventing fields.

The handbook does not say where incident records live. This runbook proposes
`docs/incidents/NNNN-short-title.md`, following the numbering already used by
`docs/issues/` and `docs/exceptions/` — **a convention this file is establishing,
not one the handbook mandates.** If the owner prefers another location, change it
here in the same breath, because a runbook that names a path nobody uses is the
exact defect this file was written to end.

Separate what was verified from what is inferred. This project's record shows
that the distinction is where its most expensive mistakes have lived — a failed
`os.replace` was proven by two files on disk while its cause remained inference,
and saying so was what kept the conclusion honest.

## Before closing an incident

All of these, from §28 step 10 and §50:

- The exposure is closed, and closure was verified against the live system rather
  than assumed from an action taken.
- Every credential touched is rotated everywhere it exists, not only where it was
  noticed. The inventory above is the checklist.
- Any control weakened to contain the incident is restored, and the restoration
  is verified.
- Any handbook rule waived is covered by an exception record under §46 with an
  expiry — an expired exception has no authority, and an undocumented one never
  had any.
- The required gate is green on whatever shipped as the fix.
- The incident record is written, including what was *not* established.
- The follow-up work is captured somewhere durable, not in the responder's head.

## What this runbook cannot do for you

Nearly every containment lever above is an owner console action. Rotating a
secret, revoking a provider key, changing DNS, restoring branch protection and
reading Vercel's deployment record all require credentials that live with the
owner and are not available to an agent, by design and per §11.

An agent responding to an incident can: read code and configuration, identify
what a leaked value reaches, assemble the rotation list from the inventory above,
draft the incident record, check the gate, and say precisely what it did not
verify. It cannot contain anything. Plan the first fifteen minutes on that
assumption.

## Evidence log

**Nothing to record.** This runbook has never been used. When it is first
exercised, record the date, the incident record it produced, and — more usefully
than either — which steps turned out to be wrong.
