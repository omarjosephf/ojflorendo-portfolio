# ADR-0013: Bounded assistant transport and fixed unsupported responses

- Status: Accepted by OJ Florendo on 2026-09-07; release qualification pending
- Date: 2026-09-07
- Owner: OJ Florendo
- Risk: R2; publication remains separately authorized
- Corrected 2026-09-08: the transport clause below said "wire v2"; the accepted
  and implemented contract is wire v3. See "Transport version correction".

Keep E.V, the accepted portfolio presentation, bounded tab continuity, Beta and
FastAPI/Cited. The proxy now accepts only Cited wire v3, maps fixed policy IDs to
application-owned copy and resolves citation URLs from exact corpus source IDs.
Malformed, refused, uncited or policy-failing model prose becomes a fixed
unsupported response. An old service fails closed as unavailable.

Use one 9-second monotonic proxy budget and a 10-second browser budget including
body reading. Cited applies an 8-second backend budget, a 6-second provider
timeout and a 0.5-second validation margin, zero retries, bounded worker
admission and conservative accounting. Both request and response bodies are
bounded before parsing. Cancellation suppresses late display without claiming
the remote attempt was cancelled or free.

Prompt, policy, public corpus, configuration and v3 evaluation form one candidate
tuple. E.V naming and browser retention now agree across these sources.
Per-block citation coverage is structural; same-block unsupported claims remain
an unresolved semantic risk. Captured-answer review cannot certify unseen live
answers. No provider, embedding, storage or graduation decision is implied.

See the [v3 runtime contract](../runbooks/assistant-runtime-v3.md) for the
governing validation and paired rollback, and the [v2 runtime
contract](../runbooks/assistant-runtime-v2.md) for the resource, privacy and
lifecycle boundaries v3 inherits; extends ADR-0006/0007/0011. ADR-0014 extends
this record with provider routing and the `model_route` field.

## Transport version correction — 8 September 2026

The original text of this ADR said the proxy "accepts only Cited wire v2". That
was a drafting error, not a superseded earlier state, and it is corrected above.

The candidate never implemented a wire v2 envelope. `src/lib/assistant/service.ts`
rejects any payload whose `version` is not `3`, and the same candidate's
[v3 runtime contract](../runbooks/assistant-runtime-v3.md) documents wire v3 as
the accepted envelope. The portfolio revision deployed today (`97f76b2`) is
older still: its service parses an unversioned `{answer, citations}` body and has
no version check at all. So the "v2" sentence described neither the deployed
transport nor the accepted one.

Nothing else in this record changes. The correction is documentation-only: no
source file, budget, policy map or test was altered to produce it, and it does
not qualify the candidate transport for release. The deployed backend still
emits the unversioned envelope, so publishing the candidate proxy without its
paired Cited release would fail closed as unavailable — the pairing requirement
in ADR-0014 and the v3 runbook is unchanged by this correction.
