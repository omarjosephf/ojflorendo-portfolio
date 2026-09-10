# Trusted answer-event qualification

Date: 9 September 2026. Risk: R2. Status: implemented and locally qualified;
staging migration and deployed backend integration pending.

The management inbox can display actual observations for saved answers, and
owner reports count the same events. Unsupported replies remain unclassified.
Missing diagnostics are shown explicitly. Public answer bodies do not expose
events, runtime model names or retrieved-only sources.

## Executed local checks

- 154 focused frontend tests: strict transport, event validation, save/replay,
  encrypted retry privacy, owner assurance and existing management behavior.
- 28 release-manifest/capture tests pass with the new event module included in
  verified runtime sources and the generated manifest schema.
- 55 backend HTTP tests with stub providers: authenticated opt-in, unchanged
  public response, actual source/model identity, unclassified refusal and missing
  runtime identity. No paid model calls.
- 42 existing management SQL checks and 16 new event checks: atomic response/event
  completion, immutable retries, rollback on insertion failure, owner MFA reads,
  guest denial, malformed observations and deletion cascade/replay refusal.
- 46 restore checks rerun against all eight local migrations. Application-only
  recovery and access quarantine still pass with the new event policy/function.
- Application/test TypeScript, targeted frontend lint, backend Ruff and strict
  mypy pass. Full release CI is still required for the assembled release candidate.

Two old SQL assertions expected guest-visible events. They were corrected to
assert guest denial and MFA-owner visibility; the new restrictive policy is
intentional. A frontend narrowing error and mock typing error were fixed.
The first backend run hit the sandbox's default temporary-directory restriction;
all 55 cases pass with a task-local temporary directory. Four browser checks pass after restarting the stopped local preview, covering
light/dark themes at 1280/390px with no accessibility violations or horizontal
overflow. Screenshots were visually inspected. All API calls were intercepted;
the human owner session was not accessed. Initial browser failure was connection
refused because the earlier preview process had exited.

## Staging proposal and rollback

Apply only `202609090007_ev_answer_events.sql` to the established Free staging
database. No table is dropped, no existing row is deleted, no provider or budget
allowance is enabled, and no Auth owner/session/factor is reset. Qualify with
synthetic records and exact synthetic-record cleanup only; never bulk-reset data.
Confirm the service-only RPC grant and owner-only direct reads in actual catalogs.
Real provider integration remains disabled until its separate budget/quality gate.

Rollback: disable event requests on the frontend/backend and preserve existing
event rows and the stricter owner policy. The original completion RPC remains
available for responses without telemetry. Do not roll back by broadening guest
read grants or deleting observations. Keep legacy receipt verification through
the last original receipt's 30-minute lifetime.

## Limits

These tests do not establish answer correctness, managed database disaster
recovery, signup bot protection or production readiness. A backend timeout or
network failure currently yields no completed event; reports expose incomplete
diagnostic coverage. Missing content and retrieval defects need source review.
