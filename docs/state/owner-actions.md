# Remaining owner-gated actions

Written 19 September 2026; re-checked against the live systems on 28 September
2026 (see [the verification log](#verification-log-28-september-2026)). Every
item below needs OJ Florendo personally, at a keyboard or in a vendor console. This file exists because that work was spread
across roughly twenty documents with nothing aggregating it, so it could not be
batched or scheduled and the whole of it was being treated as blocked.

**It is not all blocked.** One chain is, and it is blocked by the calendar
rather than by anything anyone can do. The rest is reachable today. That
distinction is the point of this file, and it is stated in full under
[What is actually blocked](#what-is-actually-blocked).

**Since 28 September 2026 this file holds the how, not the when.** Status and
execution order for every item live in [the roadmap](CURRENT.md#roadmap) at the
top of `CURRENT.md`, and nowhere else. This file keeps what each item needs, its
tier, whether it can be undone, what it costs and what it depends on. The item
numbers below are identifiers, not an order: the roadmap runs item 6 before the
captures and items 4 and 5 after them. That split is deliberate. `CURRENT.md`
records seven occasions when a value written in two places drifted apart, and a
second copy of status or order would be the eighth.

[`CURRENT.md`](CURRENT.md) also keeps the record of owner-gated Actions 1–6,
which are closed. The open items — Actions 7 and 9, and the console work in
packages 13–16 that the nine numbered Actions never covered — are described
here.

## How this file was checked

Nothing here is inherited. Every claim was verified on 19 September 2026 against
the source that decides it — the code, the ledger files, or the live system —
and the [verification log](#verification-log-19-september-2026) at the end says
what was read and from where. Where something could not be reached from this
session, it says that instead of asserting — **one item, the Cloudflare R2
bucket, is in that state and nothing else is.**

This matters more than usual here. By its own count `CURRENT.md` has been wrong
about implemented state five times, twice at the confirmation prompt of a paid
run. Two of the corrections below are new on this date.

## How to read an entry

**R-tier** is the change-risk classification in
`docs/ENGINEERING_HANDBOOK.md` §11. In plain terms: **R0** is documentation,
**R1** is ordinary product work, **R2** needs an approved plan before editing
because it touches architecture, security, dependencies, CI or operations, and
**R3** is production, publication, secrets, money or anything destructive — it
needs explicit confirmation immediately before the action, and approval of the
code never implies approval of the R3 step.

**Reversible** means: if this goes wrong, can it be undone, and at what cost.
"No" is used strictly. A ledger row cannot be deleted; a recurring subscription
can be cancelled but the month is spent.

**Cost** is money that actually moves, separated from money that is merely
*reserved*. The capture reserves US$6.00 of headroom and is expected to spend
about US$0.16 of it. Those are different numbers and confusing them is what
produced an approved ceiling of US$0.34 that never reconciled with anything.

## What is actually blocked

**One chain, by one date.** The 1 October 2026 UTC floor blocks the capture
chain and nothing else: item 7, then 8, then package 15, then package 16.

The reason is narrow and was verified in the ledger file itself rather than read
out of a document. The service ledger counts reservations with
`WHERE month = ?` (`persistent_budget.py:226`), and all 36 of its rows are
stamped `month = '2026-09'`. The portfolio capture's gate needs 150 attempts
free on all three ceilings before it dispatches anything, and the service ledger
reads 114 until the calendar month turns. On 1 October that filter matches
nothing, the ledger reads 150, and the gate clears.

Running the capture before then refuses. Refusing costs nothing, but it proves
nothing either, so there is no reason to try.

**Everything else is reachable now.** Items 1 to 6 below depend on no date at
all. Three of them cost nothing whatever. That is roughly a third of the
remaining owner work, and it has been sitting behind a calendar that does not
apply to it.

## The inventory

Numbered as first written on 19 September. The "Earliest" column says when an
item *could* start; [the roadmap](CURRENT.md#roadmap) says when it *will*.

| # | Action | R | Reversible | Cost | Earliest |
| --- | --- | --- | --- | --- | --- |
| 1 | [Deployed backend event call](#1-deployed-backend-event-call) | R1 | n/a — changes nothing | none | now |
| 2 | [Assistant smoke check](#2-assistant-smoke-check-off-corpus) | R1 | n/a — changes nothing | none | now |
| 3 | [Contact delivery smoke check](#3-contact-delivery-smoke-check) | R1 | No — the email is sent | none | now |
| 4 | [Managed Auth CAPTCHA enforcement](#4-managed-auth-captcha-enforcement) | **R3** | Yes, but see lockout | none | now |
| 5 | [Off-site encrypted backup activation](#5-off-site-encrypted-backup-activation) | **R3** | Partly — key custody is not | R2 usage only | now |
| 6 | [Managed recovery rehearsal](#6-managed-recovery-rehearsal) | **R3** | The clone's deletion is permanent and intended | Clone compute only; Pro already running | now |
| 7 | [Portfolio answer capture](#7-portfolio-answer-capture) | **R3** | **No** | ~US$0.16 | **1 Oct 2026 UTC** |
| 8 | [Demo answer capture](#8-demo-answer-capture) | **R3** | **No** | ~US$0.04 | after 7 |
| 9 | [Independent human labelling](#9-independent-human-labelling) | R1 | Yes | none | after 7 and 8 |
| 10 | [Owner preview review](#10-owner-preview-review) | R1 | Yes | none | after 9 |
| 11 | [Release smoke pass](#11-release-smoke-pass) | R1 | Partly | none | after final deploy |
| 12 | [Final publication approval](#12-final-publication-approval) | **R3** | Yes, by rollback | none | last |

Items 1–3 are one sitting. Item 4 is one sitting. Item 5 is one sitting and
should not share it. Item 6 is one working session, start to finish, including
the deletion. Items 7 and 8 are one October sitting. The grouping is explained
under each heading.

---

## Sitting one: free production verification

**Items 1, 2 and 3. About thirty minutes. No money, no date, no dependencies.**

These are grouped because they share a question and a session. The same
deliberately off-corpus question serves items 1 and 2, against two different
endpoints, and item 3 is the only other free check with a side effect. Doing
them together is what makes this a sitting rather than three errands.

**Added 28 September: read Vercel's Spend Management setting in the same
sitting.** The team moved to Pro that day and nobody has looked at how its spend
limit is set. Vercel's documentation search did not return the Pro default, and
[the platform review](../reviews/ev-long-term-platform-review.md) records that
spend notifications do not stop traffic unless pausing is configured, and that
pausing can take every project in the team offline. Read the setting and record
it here. Reading is free and changes nothing; changing it is an account setting
and needs its own decision.

One honest caveat that applies to all three: running them today proves the build
now serving production. It is not the release smoke pass, which is item 11 and
has to happen after the final deploy. Do these for the evidence, not to close
Action 9.

### 1. Deployed backend event call

**What it needs.** A single HTTP request to the Fly backend carrying
`X-Assistant-Event: 1` and `X-Assistant-Secret`, with a question the corpus
cannot support. No agent can make it: the secret is read at the keyboard, and
`api.py:341-348` returns the event header only when the presented secret matches
the configured one under a constant-time comparison.

Do not paste the secret inline into PowerShell. That writes it to
`ConsoleHost_history.txt` on disk, which is the trap `CURRENT.md` already
records for the provider keys. Read it into a variable with a masked
`Read-Host -AsSecureString`.

**What a good result looks like.** A real event with `route: "none"` and
`model: null`.

**Cost: none, and this was traced rather than assumed.** Three separate exits
return before any provider call — `screen_question` before retrieval
(`answering.py:275`), an empty retrieval result, and the prefilter score
threshold (`answering.py:300`) — and the budget is only ever charged inside
`ProviderRouter.create()`, at `self._budget.spend()` (`provider_router.py:105`).
Nothing upstream of that line can reserve.

**A correction to the premise this action was handed down with.** The brief for
this file said an off-corpus question "is refused at the prefilter" by
`screen_question`. Those are two different gates. `screen_question` is
application policy — product identity, the privacy boundary, anti-extraction —
and it runs *before* retrieval. The prefilter is a retrieval-score threshold and
runs *after*. A merely off-corpus question is refused by the prefilter or by an
empty result set, not by `screen_question`. The conclusion is unaffected: all
three exits are free. The mechanism is worth stating correctly because someone
choosing the test question needs to know which gate they are aiming at.

**Worst case if the question is badly chosen.** An on-corpus question would
answer and reserve one attempt — from the **Fly** service ledger at
`/data/budget.sqlite3`, which reported `answers_remaining_today: 10` when
checked today. That ledger has nothing to do with the capture. It cannot touch
`capture-budget.sqlite3`, and it cannot affect October. The downside is one
answer's worth of a daily allowance that resets.

- **R-tier: R1.** A verification against production that writes nothing, spends
  nothing and changes no configuration. The secret *handling* carries the §11
  R3 caution about exposing credentials, which is why the masked-input note
  above is not optional.
- **Reversible:** not applicable. Nothing changes.
- **Unblocks:** the last reachable item on package 13's event integration. Both
  ends are already implemented and deployed — the backend has emitted
  `X-Assistant-Event` since the commit that introduced wire v3, which is what
  the 13 September deploy carried, and `/health` still reports that corpus.
  What is missing is one call proving it end to end.
- **Depends on:** nothing.

### 2. Assistant smoke check (off-corpus)

**What it needs.** `POST /api/assistant` on `https://ojfr.me` with the same
off-corpus question. No secret, no keyboard credential — this one is listed as
owner-operated because it reaches the live backend and *can* reserve, not
because it needs a key.

**What a good result looks like.** The assistant says plainly that it cannot
answer and offers the human route. An answer that quietly arrives from
somewhere else is a release blocker under `docs/ENGINEERING_HANDBOOK.md` §49.1,
not a curiosity.

- **R-tier: R1.** **Reversible:** not applicable. **Cost:** none, for the same
  traced reason as item 1.
- **Unblocks:** one of the three unrun halves of Action 9.
- **Depends on:** nothing. Share the question with item 1.

### 3. Contact delivery smoke check

**What it needs.** A real submission to `POST /api/contact` on production, which
sends a real email to `CONTACT_TO_EMAIL` through Resend. Mark the body so it is
identifiable as a smoke test.

A response of `{"ok":true,"delivered":false,"mode":"mock"}` means the provider
variables are not set in the production environment. On production that is a
finding, not a pass.

- **R-tier: R1.** **Cost:** none.
- **Reversible: no** — the email is sent. It goes to OJ's own inbox, so the
  consequence is an inbox entry, but it is not repeatable without filling that
  inbox, which is why it is worth doing deliberately rather than casually.
- **Unblocks:** the second of the three unrun halves of Action 9.
- **Depends on:** nothing.

---

## Sitting two: managed Auth CAPTCHA enforcement

### 4. Managed Auth CAPTCHA enforcement

**Do all three steps in one sitting, or none of them.** A half-configured
CAPTCHA is the one failure mode here that has teeth, and it is described under
"lockout" below.

**What it needs, in order.**

1. **Cloudflare.** Create a Turnstile widget. This yields a site key and a
   secret key. **Check which Cloudflare account you are in.** `CURRENT.md`
   records that the Cloudflare connector reaches a different account from the
   one holding `ev-private-backups`, so more than one exists, and a widget
   created in the wrong one will look correct and fail at verification.
2. **Vercel.** Set `EV_AUTH_TURNSTILE_SITE_KEY` to the **site** key in the
   production environment. The code validates the shape
   (`/^[a-zA-Z0-9_-]{10,100}$/`, `src/lib/management/auth-captcha.ts:4`) and
   treats anything else as absent.
3. **Supabase Auth.** Configure the **secret** key and enable CAPTCHA
   enforcement. This is the step that actually enforces anything. The code says
   so in its own comment: the site key "is not proof of that setting".

**The lockout risk, stated plainly.** `.env.example:83` records that setting
this key "also requires verification for owner password sign-in" — enabling
CAPTCHA does not only gate guest signup, it gates OJ's own sign-in to the
management panel. If the site key is set in Vercel but the secret is not
configured in Supabase Auth, owner sign-in can be left requiring a challenge
that cannot be satisfied. Confirm owner sign-in works before closing the
sitting, and keep the ability to unset the Vercel variable to hand.

- **R-tier: R3.** §11 names "changing account security settings" among its R3
  examples, and step 3 is exactly that. Step 2 alone would be R2 — an
  environment-variable contract change — but the three steps are one action.
- **Reversible: yes**, by unsetting the Vercel variable and disabling the
  Supabase Auth setting — subject to the lockout caveat, which is a reason to
  verify before leaving, not a reason to avoid the action.
- **Cost: none.** Cloudflare Turnstile is free.
- **Unblocks:** the CAPTCHA item of package 13. Signup stays closed regardless;
  this qualifies the protection, it does not open the door.
- **Depends on:** nothing. No date, no purchase, no other action.

**What is already done, so it is not re-litigated.** The implementation is
complete and locally qualified: `auth-captcha.ts`, the owner sign-in wiring, the
guest-signup path, token expiry and retry, failure handling and mobile challenge
controls, with focused tests covering the missing-key and malformed-key cases.
Nothing here is code work.

---

## Sitting three: off-site encrypted backups

### 5. Off-site encrypted backup activation

**Give this its own sitting.** The brief that produced this file grouped it with
items 1 and 4 as a single sitting's work. That understates it. Items 1 and 4 are
minutes; this is seven ordered steps across three consoles, one of which is
generating a cryptographic key whose loss makes every backup permanently
unreadable. Key custody deserves undivided attention.

**What it needs**, following
[the backup runbook](../runbooks/ev-backups.md)'s "Exact setup for owner review"
rather than this summary, which is an index and not a substitute:

1. **Supabase.** Run the reviewed
   [reader setup SQL](../../supabase/operations/prepare-backup-reader.sql),
   creating the `NOLOGIN`, non-superuser, non-inheriting `ev_backup_reader`
   role. Activating its login with a fresh random password is a separate private
   operation.
2. **Verify the reader** actually works: login, TLS certificate verification,
   the full intended row access, and denial of Auth, owner assignments, budget
   data, SQL-history bodies and every write.
3. **Cloudflare R2.** Create bucket-scoped object credentials. **Same account
   caution as item 4** — this must be the account holding `ev-private-backups`.
4. **Generate the 32-byte encryption key** only after agreeing recoverable
   custody, and save the recovery copy in the password manager or encrypted
   offline storage, outside R2 and outside the repository. Verify that copy
   before the first real backup. Key loss prevents decryption; there is no
   recovery path.
5. **Create the `ev-backups` GitHub environment** and restrict it to `main`,
   then set the variables and secrets the runbook tabulates.
6. **Run the synthetic end-to-end backup**, and verify remote expiry, cleanup
   and failure notification.
7. **Only then** set the repository variable `EV_BACKUP_ENABLED=true`. That is
   the final activation switch and nothing before it turns the job on.

**A prerequisite no document listed, found on 19 September.** The workflow
declares `environment: ev-backups` (`.github/workflows/ev-backups.yml:20`), and
this repository has only two environments, `Preview` and `Production`. **The
`ev-backups` environment does not exist.** The runbook's step 5 says to restrict
it, which reads as configuring something already there. It has to be created.
This would have surfaced as a confusing workflow failure at activation time.

**A second observation from the same check.** The workflow is scheduled hourly
at minute 17 and is firing correctly and skipping, so it has not been disabled
for inactivity. But the five most recent runs landed at 00:20, 21:40, 18:28,
14:59 and 11:13 — roughly every three hours, not hourly. That is GitHub's
documented delay-and-drop behaviour on scheduled workflows, observed rather than
predicted, and it is direct evidence for why the runbook requires missed-run
detection and owner notification before activation. Do not treat the hourly cron
as an hourly guarantee.

- **R-tier: R3.** Creating secrets, §11's own example.
- **Reversible: partly.** The activation flag, the credentials and the
  environment can all be undone. **Key custody cannot be repaired after the
  fact** — a key lost after backups are written makes those backups permanently
  unreadable. Revoking credentials or changing keys later requires a separately
  reviewed change action, not a quiet edit.
- **Cost:** R2 usage rates only. The subscription and the private EU bucket are
  already active and approved, with the six-day prefix expiry rule in place. The
  runbook's 4 GiB figure is a capacity illustration at an artificial maximum,
  not a forecast and not a spending cap.
- **Unblocks:** package 13's off-site backup item, and with it the control
  Supabase itself recommends for projects that have no managed backups.
- **Depends on:** nothing. In particular it does **not** depend on Supabase Pro.
  The exporter reads over `EV_BACKUP_DATABASE_URL`, which works on Free, and
  ADR-0022 leaves this job explicitly unchanged. Buying a subscription would not
  advance this item by one step.

---

## Sitting four: managed recovery

### 6. Managed recovery rehearsal

**One working session, start to finish, including the deletion.** Not spread
across days. The same-session deletion is the control that keeps the cost
bounded, and it is the first thing that gets dropped when a session is split.

**What it needs.** Four things in a fixed order, all in the Supabase dashboard,
under [ADR-0022](../adr/0022-supabase-pro-for-managed-recovery.md) and
[ADR-0023](../adr/0023-isolated-destination-for-managed-restore.md):

1. **Pro is bought.** The `Project Zero` organization read as plan `pro` on
   28 September 2026. What remains of this step is reading two settings in the
   dashboard that the connector cannot see: the Spend Cap should be **on**, and
   Point-in-Time Recovery should be **off** — roughly US$100/month, and the one
   add-on the Spend Cap does not bound.
2. **Create the clone** with "Restore to a new project". Record the creation
   time.
3. **Lock it down before inspecting anything.** Unschedule `ev-retention` and
   `ev-cron-history`, disable `pg_cron`, revoke application roles, leave Auth
   unconfigured, and drop the carried `auth.*` rows rather than treating them as
   identities. **Re-read the source's installed extensions immediately before
   the rehearsal** — ADR-0023 says its list is a snapshot, not a guarantee. It
   was re-read on 19 September and still holds: the source has exactly six
   extensions installed — `pg_cron`, `pgcrypto`, `uuid-ossp`,
   `pg_stat_statements`, `supabase_vault` and `plpgsql` — so **`pg_cron` remains
   the only external-operation extension present**, and `pg_net`, `wrappers`,
   `http`, `dblink` and `postgres_fdw` all report `installed_version: null`.
   Step 3 is a closeable checklist, not an open-ended sweep.
4. **Measure, record, delete the clone, and confirm** the organization lists one
   project again.

**Added 28 September: two more dashboard steps in the same session.** Turn on
**leaked-password protection** in Auth settings; Supabase documents it as
available on the Pro Plan and above, and the advisor still reported it off on 28
September. It is a change to an account security setting, so R3, free, and it
fills a line of ADR-0022's Verification block. And read the **Spend Cap** (on
by default for Pro, per Supabase's billing documentation, and not covering
compute or Point-in-Time Recovery) and **Point-in-Time Recovery** (expected
off), which the connector cannot see.

**Why step 3 comes before inspection, in one sentence:** a clone carries both
live `pg_cron` jobs, and the hourly one calls `ev_private.run_maintenance()`,
whose third deletion prunes the deletion-tombstone ledger that the recovery
contract's merge depends on — so an unlocked clone would destroy the evidence on
a schedule, with nobody acting.

**What this does not do.** It does not satisfy the ten-step recovery contract
and must not be reported as having done so. A Supabase clone is a *physical*
restore of the whole cluster; the contract is a *logical, allowlisted* one that
explicitly refuses the roles, grants and `auth.*` a clone delivers. They are
different operations. This rehearsal measures whether Supabase can bring the
project back and how much the daily-backup window loses. That is all.

- **R-tier: R3**, twice over — creating a project and deleting one. The third
  R3 step, enabling the paid service, was taken by the owner by 28 September.
- **Reversible:** the clone's deletion is permanent and intended. The
  subscription can be cancelled, but it is already running. Deleting a project permanently deletes its backups,
  which is fine for a clone and is a further reason item 5 stays required.
- **Cost: the US$25/month is already being paid**, organization-wide, and
  continues until someone downgrades, whether or not this rehearsal happens.
  That is why the owner moved this item ahead of the captures on 28 September:
  the fee buys nothing until the rehearsal uses it. The clone mirrors the source's compute at a few cents an hour while
  it exists — **and roughly US$10/month for as long as nobody notices it**,
  which is what the same-session deletion exists to prevent.
- **Unblocks:** package 13's managed recovery item, and the empty Verification
  blocks in both ADRs. Fill them in afterwards; both are currently `_pending_`
  on every line, and ADR-0023's last two lines are explicitly not a formality.
- **Depends on:** no date and no other action. ADR-0022 triggered the purchase
  on intent, "when someone is about to rehearse a restore", so that the fee
  would start when the work did. The purchase came first instead, so the
  rehearsal is now the thing that makes the fee worth paying. Both decisions are
  accepted and settled; neither authorises the clone or its deletion, each of
  which is still its own R3 step.

**Do not start this in the same session as the October capture.** They are both
R3, both irreversible in different ways, and each deserves undivided attention.

---

## The capture chain

**Items 7 and 8 are one October sitting. Nothing before 1 October 2026 UTC.**

Before that date there is free, agent-doable preparation that does not need OJ:
restage `deploy/oj-assistant` from the pin, run the pin gate, and diff the
staged corpus and system prompt against the pinned revision. Worth doing in the
days before, not on the morning of.

### 7. Portfolio answer capture

**What it needs.** `Invoke-PaidEvaluation.ps1` run twice — once without `-Paid`
to read the three ceilings, then once with it. Both halves are owner-operated:
the key prompt sits above the preflight block and is not gated on `-Paid`, so
even the free run needs the keyboard. A handoff asking an agent to "run the free
preflight and read the ceilings" is asking for something that cannot be done.

**Point it at `C:\ledgers\allowance-225.sqlite3`.** Not `allowance.sqlite3`.
Both files sit in the same directory, only the filename distinguishes them, and
`-AllowanceLedger` is a mandatory argument that nothing cross-checks. A run
aimed at the retired ledger finds 114 attempts and refuses on headroom, which
reads exactly like a budget fault. The ledgers are in `C:\ledgers`, outside
OneDrive — and **run the capture against a path outside the synced tree**, since
a refused `os.replace` under OneDrive is what ended the 15 September run.

**Verified in the files today, not inherited:**

| Ledger | Ceiling | Carried | Rows | Reads |
| --- | --- | --- | --- | --- |
| `allowance-225.sqlite3` | 10,440,000 | 1,440,000 | 0 | **225 attempts** |
| `allowance.sqlite3` — retired, never draw from it | 6,000,000 | 0 | 36 | 114 |
| `capture-budget.sqlite3` — service | 150/150/6M/6M | — | 36, all `2026-09` | 150 in October |

`integrity_check` returns `ok` on all three.

**Exit 1 is the expected outcome of a good capture**, not a failure —
`answer_failures` reports every answer awaiting claim-level review, which
immediately after a capture is all of them. Only exit 2 is a refusal. Re-running
a paid capture because it exited 1 spends the allowance a second time.

- **R-tier: R3.** Spends a non-renewable lifetime allowance.
- **Reversible: no.** `capture.py` only ever inserts into the reservations
  table and never deletes. There is no resume and no per-case recovery; a failed
  run is a spent run. This is the action with the least margin for error in the
  whole list.
- **Cost:** about **US$0.16** — 67 paid calls expected of 75 questions, eight
  decided by pre-model policy guards at no cost, at the measured US$0.0024 per
  call. It *reserves* US$6.00 of headroom at the pinned US$0.04. The US$0.34
  recorded when Action 7 was approved does not reconcile with the measured rate;
  treat it as the approved ceiling, not a forecast.
- **Unblocks:** item 8, then package 15, then package 16.
- **Depends on:** **1 October 2026 UTC**, and nothing else. Every code blocker
  is closed and merged, the seventh as `360e8fa` with CI green.

### 8. Demo answer capture

**Run it in the same October sitting, immediately after item 7.** Portfolio must
go first — its gate needs all 150 free before dispatch, and the first command
that touches the allowance ledger decides the order permanently. Nothing in the
code enforces this.

**Both captures fit in one October day, and this is worth stating because no
document says it.** The service ledger's whole monthly envelope is 150 attempts
and a single day may use all of it. Portfolio spends about 67, leaving 83 on the
service ledger and 158 on the allowance; the demo gate needs 30 free on each.
Both clear. The demo suite has been treated as a later worry; it need not be.

**The fallback headroom is unchanged at 45, and the reason it is unchanged has
changed.** At most 45 of the 75 portfolio questions may fall back to the backup
provider before the demo capture becomes impossible that month. Under the old
150-attempt allowance, the allowance and the service ledger bound this equally.
Under the new 225-attempt allowance the allowance permits 120 —
so **the service ledger now binds alone**, at the same number. Anyone reasoning
"the allowance went to 225, so the fallback headroom grew" would be wrong. The
service envelope cannot be raised to fix it either: `Settings` hard-caps
`daily_answer_limit` at `le=150` and both money limits at `le=6_000_000`, and a
ledger stamped higher could not be used at all. If the demo capture misses
October, it waits for 1 November.

Fallback is availability-only — billing, quota and authentication failures do
not consume an attempt — so this needs a genuine primary outage mid-capture to
bite.

- **R-tier: R3. Reversible: no.** Same reasons as item 7.
- **Cost:** about **US$0.04** at the measured rate, reserving 30 attempts of
  headroom.
- **Unblocks:** the release manifest. `release_manifest.py:232` requires both
  the `demo` and `portfolio` suites present (`:232`) and applies
  `capture_state == "complete"` to every evaluation (`:244`), not only the
  deployment's selected one. Only the paid path ever writes that field.
- **Depends on:** item 7, in that order, permanently.

### 9. Independent human labelling

**What it needs.** `review --run <run> --template --output <sheet>` writes the
blank labelling sheet and `review --review <filled>` scores against it. Both are
free and neither is the hard part. **Recruiting independent labellers is the
long pole, not the money** — and it is the one item on this list whose duration
is set by other people's availability rather than by OJ's.

Worth starting the recruiting *before* October, since it is the only item here
that can be usefully prepared in advance of the captures it depends on.

- **R-tier: R1. Reversible: yes. Cost: none.**
- **Unblocks:** package 15, and with it package 16.
- **Depends on:** items 7 and 8 for the runs to label.

---

## Release

### 10. Owner preview review

Owner preview feedback on the assembled candidate, per package 16. R1,
reversible, free. Depends on item 9.

### 11. Release smoke pass

**What it needs.** `docs/ENGINEERING_HANDBOOK.md` §34 step 7, run in full
against `https://ojfr.me` **after** the final deploy, following
[the deployment runbook](../runbooks/deployment.md). The free read-only checks,
the two checks with side effects (items 2 and 3 above), and the four browser
checks — navigation and interactions, console and network errors, responsive,
and `prefers-reduced-motion`.

**Why this is a separate item even though its parts have all passed.** No single
run has covered everything. The free checks pass consistently; the four browser
items all passed on 17 September but across two runs rather than one —
`prefers-reduced-motion` was run separately, later that day, with a
no-preference control — and deploys have landed since.

**Do not trust a count of the free runs, including one written here.** The
runbook's evidence log records four, all on 17 September. More have been
executed on 19 September, against both `f849648` and `1e6417c`, by more than one
session, and none of them is written up. A tally that lives only in sessions is
the repository-versus-reality drift this project keeps cataloguing, so the log is
the record and the count is unknown until it is brought up to date. **Bringing
the log up to date is not an owner action** — anyone can write it, and it should
be written before the release pass, so that pass is not the first entry in a
stale log.
A release smoke pass is one run covering everything against the build being
published. Record what you did not check; §31 and §50 both treat an undisclosed
skipped check as worse than a disclosed one.

**The browser checks are manual.** `playwright.config.ts` hardcodes `baseURL` to
localhost and always starts a local build, so the suite cannot be pointed at a
deployed origin without editing the config.

- **R-tier: R1.** **Reversible:** partly — the contact email is sent.
  **Cost:** none.
- **Unblocks:** item 12. **Depends on:** the final deployment existing.

### 12. Final publication approval

The `release-approval` check on the release pull request. **A failing
`release-approval` is the approval gate working, not a bug** — it is red by
design until OJ approves. Never label it, never try to fix it, and leave
Auto-fix off, because the Auto-fix switch also re-enables auto-merge.

- **R-tier: R3.** **Reversible:** by rollback, per
  [the rollback runbook](../runbooks/rollback.md). **Cost:** none.
- **Unblocks:** package 16, and the release.
- **Depends on:** everything above.

---

## What needs no owner action, and why

Recorded so these are not rediscovered as open work.

**Package 14 — deferred by decision, not outstanding.** Its status is "optional
consolidation deferred". The tracker states that shared PostgreSQL runtime
activation "is deferred with optional host consolidation; it is not required by
this selected topology". The durable budget it would have replaced is already
live: the Fly volume `vol_r1j28g1m15o9j3pr` exists, is encrypted, and is
attached to machine `d8d0503c7e1548` — read from Fly today, not from a document.
Package 14 contributes no owner action to the release.

**Package 17 — merged.** [PR
#104](https://github.com/omarjosephf/ojflorendo-portfolio/pull/104) merged as
`f849648` at 02:04 UTC on 19 September 2026, and PR #105 corrected the tracker
the same morning as `1e6417c`, which production has served since 02:20:32 UTC.

**Package 18 — no owner action yet, but no longer design-only.** The first
instructor task was a design, and it was delivered. The work has since grown
into phases: 18.1 (a static blog, committed locally as `44313f8` but on no
GitHub branch), 18.2 and 18.3 (uncommitted in the blog worktree). Phase 18.3's
paid comparison will need owner R3 decisions; they belong to that phase's own
ADR-0024 and runbook, both still uncommitted in the blog worktree, not to this
file. Its place in the order is in
[the roadmap](CURRENT.md#roadmap).

**Packages 1–12, and owner-gated Actions 1–6.** Closed. `CURRENT.md` holds the
record.

---

## Verification log, 28 September 2026

Re-read from a session on the owner's machine, all read-only, to land this file
beside [the roadmap](CURRENT.md#roadmap). **One thing changed since 19
September: Supabase is now on Pro.** Everything else matched.

- **Supabase, through its connector.** The `Project Zero` organization reads
  plan **`pro`** (it read `free` on 19 September). Still exactly one project,
  `ev-management-staging`, `ACTIVE_HEALTHY`, Postgres `17.6.1.166`, so no clone
  exists. All ten migrations listed. Installed extensions unchanged: the same
  six, with `pg_cron` the only external-operation one, so item 6's step 3 list
  still holds. Security advisors unchanged: the eight deny-all RLS INFO findings,
  the seven-function SECURITY DEFINER WARN, and the leaked-password WARN, which
  **can now be closed** as a separate Auth setting. Spend Cap and Point-in-Time
  Recovery are not exposed by the connector and remain unread.
- **Vercel, through its connector.** One team, "OJ's personal projects", holding
  `ojflorendo-portfolio` and `ev-cited-runtime-probe-20260909`. The latest
  production deployment is `READY` on `1e6417c`. The owner's billing page shows
  the team on Pro and Active; the connector does not return the plan field.
- **Production.** Apex 200, `www` 308, and `/manage`, `/manage/live`,
  `/api/management/owner` and `/api/conversations` all 404. GitHub's
  Deployments API still names `1e6417c`, deployment `6536105171`.
- **Fly.** `GET /health` returns `ok`, corpus `7bddb04dedc7`, 69 chunks,
  `answers_remaining_today: 10`.
- **Ledgers, opened read-only.** `integrity_check` ok on all three.
  `allowance-225.sqlite3` holds ceiling `10440000`, carried `1440000`, 0
  reservations — 225 attempts. The retired `allowance.sqlite3` still holds 36
  reservations. The service ledger `capture-budget.sqlite3` still holds 36, as
  tabulated under item 7. No file has been modified since 17 September.
- **GitHub.** No repository variables, so the backup job is still inert.
  Environments are still `Preview` and `Production`; `ev-backups` still does not
  exist. The three most recent scheduled backup runs were `skipped`, at 00:45,
  22:09 and 18:23 UTC — still irregular. One open pull request, Dependabot #106.
- **Cloudflare, through its connector.** Zero R2 buckets, the same result as 19
  September and still not evidence either way, for the reason given below.

## Verification log, 19 September 2026

What was read, and from where. Everything below was checked from a session on
OJ's own machine, which reaches Fly, Vercel, Supabase and `ojfr.me`; a cloud
session would not have.

**Ledger files, read read-only with `sqlite3` in `mode=ro`** at `C:\ledgers`, so
nothing was locked or written. All three tables and row counts as tabulated
under item 7; `integrity_check` `ok` on all three. The service ledger's 36
reservations are every one of them `day = '2026-09-15'`, `month = '2026-09'`,
`micro_usd = 40000`. Its stored `last_seen` is unchanged from the capture.

**`omarjosephf/cited` at `360e8fa`**, the local clone on `main`, clean against
`origin/main`. Read directly: the month filter at `persistent_budget.py:226`;
the allowance arithmetic `(ceiling - carried) // 40000 - count` at
`capture.py:94-99`; the `2 * len(questions)` gate at `cli.py:300`; the three
free exits in `answering.py:275`, `:294` and `:300`; `self._budget.spend()`
inside `ProviderRouter.create()` at `provider_router.py:105`; the event's
`route`/`model` derivation at `answer_event.py:28-29`; and the secret-gated
event header at `api.py:341-348`.

**Live Fly backend.** `GET /health` returns corpus `7bddb04dedc7`, 69 chunks,
`answers_remaining_today: 10`. One machine, `d8d0503c7e1548`, started, one check
passing, last updated 13 September. Volume `vol_r1j28g1m15o9j3pr`, 1 GB,
encrypted, attached.

**Live production, checked twice as `main` moved under this work.** First
against `f849648` (deployment `6535983155`), then again against `1e6417c`
(deployment `6536105171`, `success` at 02:20:32Z) after PR #105 merged
mid-session. Both times: apex 200, `https://www.ojfr.me` 308 to the apex, and
all four management and conversation paths — `/manage`, `/manage/live`,
`/api/management/owner`, `/api/conversations` — returning 404. **So the
production denial now holds across two deployments on the same day**, which is
a stronger claim than either run alone.

**GitHub.** No repository variables are set, so `EV_BACKUP_ENABLED` is unset and
the backup job is inert. Environments are `Preview` and `Production` only —
`ev-backups` does not exist. The backup workflow's five most recent scheduled
runs all completed as `skipped`, at the irregular intervals noted under item 5.

**Supabase, read with the CLI.** The `Project Zero` organization
(`rvscomcgubjbgzxcggoc`) holds exactly one project, `ev-management-staging`
(`clekxlhhclwgtmismogv`), `ACTIVE_HEALTHY`, `eu-west-1`, Postgres `17.6.1.166`.
**One project means no clone exists** and rider 3's second project has not been
created. The Postgres version confirms ADR-0023's physical-backup precondition
still holds.

**The plan is `free`, read from the Management API on 19 September**, so **no
Pro purchase has happened and no charge has been incurred**. ADR-0022's and
ADR-0023's empty Verification blocks are correct rather than merely unrevised.
The security advisors corroborate the plan independently and match ADR-0022's
18 September reading exactly: the `auth_leaked_password_protection` WARN is
still open, which is the finding that cannot be closed on Free; the eight
deny-all `rls_enabled_no_policy` INFO findings stand; the seven-function
`authenticated_security_definer_function_executable` WARN stands; and the
`rls_auto_enable` SECURITY DEFINER finding remains gone, as the 17 September
migration check left it. Nothing has drifted.

**Cloudflare: still unverified, and the negative result does not settle it.** A
Cloudflare connector came available later in the session and reports **zero R2
buckets**. That is what `CURRENT.md`'s standing record predicts — the connector
lands in a different account from the one holding `ev-private-backups` — but an
empty list from one account is not evidence about another, and no account-listing
tool is exposed to tell which account answered. Both readings remain open: the
right account was not reached, or the bucket is absent. **Do not read this as
the bucket being missing.** The bucket, its lifecycle rule and its emptiness
still rest on the 9 September infrastructure checkpoint, and confirming them
needs the owner in the correct Cloudflare account — which is the first thing
step 3 of item 5 has to establish anyway.

## A related defect, deliberately not fixed here

[ADR-0007](../adr/0007-conversational-turns-for-the-assistant.md) line 192 has an
arithmetic defect: its cost table sums to US$11.92–US$12.40 but states
approximately US$11.75, and its inference row still carries Haiku-era numbers
where 150 answers at the measured Gemini rate is about US$0.36. Amending an
accepted ADR is a separate decision for OJ and is not in scope for this file.
Recorded here so it is not lost.

## Tools worth watching, not adopting

Recorded 22 September 2026 so these questions are not re-asked from scratch.
Neither is an owner action. Both are here because they were evaluated and
declined for now, and the reasoning is worth more than the verdict.

**Jev**, from TypeSafe AI, was released on 15 September 2026. It is not a coding
tool and cannot write, edit or review anything. It takes a block of text and a
set of typed questions, and returns a decision — a choice from a fixed list, a
score against ordered levels, or a probability that a statement is true — each
with a confidence value. Roughly US$0.042 per million input tokens, outputs
free, 70–500ms per call, 64k context. Access is early-access by waitlist.

**It contributes no owner action, now or to this release.** Three reasons, and
the first is the one that matters:

- **There is no cost problem for it to solve.** The Gemini runtime is about
  US$0.0024 per answer and roughly US$12 a month. A large multiple saved on a
  classification step inside that figure is worth pennies, and would be bought
  by adding a second AI vendor to a deployed, verified runtime.
- **The popular token-saving claim is about something else.** The demonstrations
  circulating are third-party Claude Code plugins that use Jev to prune stale
  tool calls from a session rather than summarise them. Those plugins are days
  old, unaffiliated with TypeSafe, carry effectively no adoption history, and
  read the entire session in order to work. There is credible public argument
  that pruning tool calls discards reasoning a long task still needs.
- **The model is one week old** and its published benchmarks are vendor-run,
  which the vendor itself says should be independently checked.

**The one place it may later earn an assessment** is the Verifier agent, if that
agent ends up making the same pass/fail judgement at volume — the shape Jev's
boolean primitive is built for. Verifier has no committed code and no
architecture yet, so choosing a runtime dependency for it now would decide its
design before that design exists. **The trigger is Verifier reaching its own
design phase, and the outcome would be an ADR, not an adoption.**

**Obsidian** is a local application that opens a folder of Markdown files and
adds backlinks, full-text search and a graph view over them. It reads the files
in place: no import step, no proprietary format, nothing to migrate, and
uninstalling it leaves the files exactly as they were. It is free for all
purposes including commercial; the paid commercial licence is voluntary support,
not a requirement, and buying it unlocks nothing.

**It is a candidate for the workspace reorganisation, not for today.** That
reorganisation — folding the remaining stale loose documents into this
repository — is already agreed and already sequenced after the capture chain.
Navigating `docs/` is the problem Obsidian would be bought for, and that problem
is at its worst precisely when the reorganisation is underway. Introducing it
before then means learning a tool against a documentation set that is about to
change shape.

**Two conditions, if it is adopted at that point.** They are not optional
preferences; each maps to a failure this project has already had.

- **It points at `docs/` and stores nothing of its own.** A fact is true when it
  is committed to git, and nowhere else. This file's own preamble exists because
  live status written in two places drifted apart, and `CURRENT.md` counts seven
  such occasions. A note-taking application is the most natural possible home
  for an eighth, and the constraint is what prevents that.
- **`.obsidian/` is git-ignored before it is ever opened.** Obsidian
  auto-generates that configuration folder inside any folder it opens, including
  machine-local workspace layout. This repository is public and
  `CLAUDE.md` requires that machine-local material never reach it. The
  repository's `.gitignore` does not currently mention `.obsidian`, so the
  ignore rule is a prerequisite of first launch, not a cleanup afterwards.

A third point is worth stating because it is the reason the tool is attractive
at all: Obsidian solves *finding* things, not *trusting* them. The recurring
defect here is documents that confidently describe state they were never checked
against. No amount of backlinking detects that, and nothing in this entry should
be read as suggesting otherwise.
