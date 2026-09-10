# E.V management preview: review packet

Updated 9 September 2026. **Ready for local owner review. Public release is not
ready.** This packet describes the implementation and executed checks, not a
claim that production conversations are being retained.

## What is available

Run `npm run preview:management` and visit `http://127.0.0.1:3215/manage` on the
same computer. The six sections are Overview, Conversations, Questions & gaps,
Knowledge drafts, Sources & chunks, and Quality & operations.

The portfolio navigation, E.V dialog and management toolbar now offer shared
System, Light and Dark controls. An explicit choice persists and applies before
JavaScript loads; System follows the device. The new theme checks cover reloads,
cross-tab synchronization, blocked/invalid cookies, contrast and CSP.

The workspace provides a searchable conversation inbox, message/citation traces,
reporting windows, frequent-question groups, source exposure counts with explicit
denominators, feedback rates and gap diagnosis. A gap can become a manually
written draft with provenance; drafts and triage notes survive a page reload and
can be exported. Source inspection uses the actual 10-source, 67-chunk E.V
corpus, including full indexed-text token counts and digests.

Chats and usage figures are conspicuously labelled synthetic samples. Draft
persistence in these six sections is real local file storage. Supabase guest
storage and the separate owner inbox at `/manage/live` are now connected to Free
staging. Owner setup requires a password and authenticator chosen by the owner.
Saving a draft cannot publish content or add facts to the answering corpus.

## Instructor requests

| Request | Verified status |
| --- | --- |
| Add a second LLM | Existing provider-fallback candidate retained; locally tested, final provider qualification remains |
| Save conversations for a user | Managed guest save/resume/delete and generation idempotency are integrated in local staging; actual app checks pass; public collection remains disabled |
| Remove Beta | Still pending final answer review and graduation/release gates |
| Remove unnecessary chatbot parts | Removed the visible waiting bubble; broader UI decisions can be reviewed in the preview |
| Remove loading part | Visible Thinking transcript entry removed; screen-reader progress and duplicate-submit protection remain |
| Remove “not in OJ's approved content” | Updated the application-owned fallback and shared policy artifact to a direct, plain-language response |
| Choose an embedding | Retain BGE small for E.V based on the executed comparison; larger BGE loses an E.V follow-up hit |
| Review system prompt | Review and recommendations are recorded; final prompt/model/index combination still needs human answer review |

The fallback now says: “I can't answer that from the information I have. You can
contact OJ directly.” Changing the shared policy invalidates older exact-artifact
release captures. The schema identifier alone does not make an old capture apply
to these changed bytes. Re-export and bind the frontend/backend artifacts before
qualifying a provider release.

## Executed verification

Historical 8 September `npm run test:ci` gate:

- 487 unit tests across 29 frontend files.
- 25 executed PostgreSQL checks using PGlite: grants, guest isolation, MFA owner
  boundary, ownership, idempotent repeats, conflicting repeats, limits, atomic
  answer/event storage and retention deletion.
- 82 production-browser tests, including management page/API denial even when
  the preview flag is present in the production environment.
- 10 management-preview browser tests, including six-section light/dark desktop/mobile Axe
  checks, overflow, actual save/reload, failed-save text preservation, input/origin
  rejection and restoring the public layout after navigation.
- Lint, application/test type checks, production build, corpus consistency and
  documentation-anchor checks.
- Production and full dependency audits: zero reported vulnerabilities.

Desktop (1280 px) and mobile (390 px) screenshots were visually inspected. Earlier
failures were diagnosed and retained locally; no checks were quarantined and no
wait limits were increased. Fixes included contrast and accessible names, the
existing development style CSP's nonce/unsafe-inline conflict, stale route types,
an old shared-policy response and cold test-module transformation. Production
nonce policy and real browser lazy-loading checks remain enforced.

Separate offline research executed all 12 model/chunk/dataset combinations and
verified 54 hashed Linux wheels with recursive dependency closure. See
[embedding results](ev-embedding-comparison.md) and
[hosting measurements](ev-hosting-and-cost-review.md#measured-linux-package-footprint-8-september-2026).

## Readiness and remaining work

The [delivery checklist](../roadmaps/ev-management-progress.md) records **11 of
16 work packages complete locally, 5 unfinished**. These are unequal work
packages, not an estimate of the fraction of time or deployment risk remaining.

| Action | Readiness | What remains |
| --- | --- | --- |
| Review local management preview | Ready | Owner feedback on the implemented workflows and design |
| Try the migration in disposable Supabase staging | SQL candidate ready for staging qualification | Access to the selected staging project; real Auth/MFA/RLS/network tests |
| Collect real visitor conversations | Not ready | Managed guest sessions, chat save/resume/delete wiring, clear storage notice and live failure/retention tests |
| Consolidate both Python workloads on one app host | Not ready | Actual build, cold/warm latency and memory, shared transactional spend reservations, failure and cost qualification |
| Replace embedding/chunk settings | No replacement recommended for E.V | New held-out questions and answer-support evidence before a change |
| Remove Beta and publish chatbot changes | Not ready | Human review of the exact final answer artifacts, graduation gates and production smoke verification |
| Buy new subscriptions | Not required for this local preview | Choose tiers from actual hosting/commercial-use and database requirements |

The owner's authorization permits continuing verified implementation; it does not
supply missing live-service evidence or a human review that has not happened.
The existing request for preview before publication remains the release sequence.
No subscription, paid inference, live transcript collection, deployment, resource
shutdown, commit or push was performed during this preview implementation.

## Follow-up verification: themes and platform comparison

The [long-term comparison](ev-long-term-platform-review.md) covers Vercel,
Supabase, Fly, Railway, Render and self-hosting, including responsibilities,
pricing limits, portability and qualification gates. The
[practices audit](ev-rag-platform-practices-audit.md) maps the current candidate to
RAG security, editorial, analytics, quality and operations expectations. Both are
ready for owner review; they are not live deployment evidence.

A fresh complete gate passed after the theme changes. Two management contrast
failures were fixed. Theme transitions now apply foreground/background together,
fixing an intermediate contrast failure. A management navigation failure observed
during an overlapping development-style edit did not recur in the clean gate;
all ten management checks passed without retries or increased waits. Desktop and
mobile dark management screenshots, dark chat and the portfolio overview were
inspected. Manual production HTTP checks confirmed private/no-store responses
and the correct initial theme for both explicit cookie values.

The gate identified advisories newly indexed on 8 September 2026. The candidate
updates Sharp and its platform packages from 0.35.3 to 0.35.4, and the development
YAML parser from 4.3.1 to 4.3.2. A native PNG conversion and the existing image/
build/browser checks passed. No audit exception was added.
[Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c),
[js-yaml advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh).

At the 8 September theme checkpoint, no live project, purchase or deployment had been performed. The owner's requested
long-term review precedes provisioning, and public release still follows the
owner's final preview review. Remaining packages stay 12-16.


## Guest storage checkpoint, 9 September 2026

Free Supabase staging is now provisioned. The [storage staging review](ev-storage-staging-review.md)
records 13 database/Auth checks, six actual app integration checks, six new browser
checks and 30 local SQL checks. It also records the live logout issue and correction.
The older full-gate counts above refer to the 8 September artifact. A fresh full
gate is required before this extended candidate can replace that checkpoint.

## Current owner preview checkpoint

The subsequent complete owner-access gate passed: **537 unit / 36 SQL / 82
production-browser / 25 management-browser** checks, clean audits, types/lint,
corpus/docs and production build. Owner setup is provisioned and ready for the
human to choose their password and enroll an authenticator in the local preview.

The live workspace now also contains bounded retained-chat reporting and durable
knowledge drafts with revision conflicts, safe retries and audit receipts. Its
additional verification is recorded in the [staging review](ev-storage-staging-review.md):
545 unit / 42 SQL / six new workflow/browser checks / three production-denial
checks, lint/types and production build. It is not a new full-gate claim. The
six-section sample workspace remains labelled synthetic and keeps its local adapter.

The new frozen embedding comparison was reproduced with identical corpus, question
and indexed-text hashes and identical ranks/scores across six runs. It supports
retaining the existing baseline; it does not replace human answer grading.

**12/16 packages remain complete locally/staging.** Human owner enrollment,
CAPTCHA, isolated restoration, runtime telemetry, hosting/shared admission and final
answer qualification remain in packages 13–15. Package 16 remains owner preview
review and verified public release. Additional spending remains US$0 of US$3.
