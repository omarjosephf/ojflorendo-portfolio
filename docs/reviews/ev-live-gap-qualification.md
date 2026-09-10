# Live gap-review qualification

Date: 9 September 2026. Risk: R2. Status: locally qualified; staging pending.

The live owner workspace includes a gap-review queue, diagnosis/status editor,
notes and links to saved knowledge drafts. Unsupported answers are unclassified
until reviewed. Queue records come from retained E.V replies and their paired
questions; failures and negative feedback do not automatically create facts.

## Executed verification

- 14 new SQL checks cover owner MFA, guest/direct-write denial, initial review,
  stable replay, changed/stale conflicts, draft eligibility, non-publication,
  note bounds, retention alignment, revoked access and deletion/replay refusal.
- 42 existing management SQL checks pass with the new migration. A test caught
  the old retention counter omitting reviews removed by cascade; the maintenance
  function now locks and counts those rows before deletion.
- 46 restore checks pass against the final nine-migration local schema. All
  reviews still remain excluded from recovered application data.
- 113 focused management/event/API tests pass, including eight new gap repository
  and route tests. Application/test TypeScript and targeted ESLint pass.
- Five isolated browser checks pass: light/dark at 1280/390px, failed-save note
  preservation, unchanged retry identity, saved reload and explicit replacement
  after a stale-edit conflict. Accessibility and overflow checks pass; desktop
  and mobile screenshots were inspected. Every API was intercepted.

The browser tests initially matched Next's route announcer as a second alert;
the assertion now selects the application alert. The controlled textarea now
uses an explicit stable label association so its filled value cannot alter label
lookup. These were fixed before accepting the browser result.

The complete production build/browser/release gate is reserved for the assembled
candidate; this incremental checkpoint does not reattribute earlier full-CI
results. No managed schema, human Auth account, model or hosting resource was
changed by these local tests.

## Staging and rollback proposal

Apply `202609090007_ev_answer_events.sql` followed by
`202609090008_ev_live_gap_reviews.sql` to the established Free staging database
after approval. Verify actual service-only event completion, current-owner reads,
gap revisions, simultaneous saves, deletion and retention counts with synthetic
principals and exact synthetic-record cleanup. Do not reset existing Auth users,
sessions, factors, allowances or application tables.

Rollback disables the new frontend event/gap actions and retains stricter RLS,
existing events/reviews and the conversation-deletion FK. Preserve saved records;
do not restore broad direct writes or resurrect deleted conversations. The old
answer completion RPC remains usable without telemetry. Normal preview model
dispatch remains disabled.

Remaining release gates include real staging/app integration, protected signup,
operational managed recovery, durable runtime/provider activation, funded and
human-reviewed answer captures, complete candidate verification and final owner
approval/publication.
