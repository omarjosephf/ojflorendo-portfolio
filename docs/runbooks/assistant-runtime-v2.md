# E.V runtime contract v2

For the owner-selected Luna/Gemini local candidate, see [runtime v3](assistant-runtime-v3.md).
The v2 single-provider and wire requirements below remain historical.

The backend's detailed contract is maintained in Cited at
`docs/runbooks/assistant-runtime-v2.md`. This companion defines the portfolio
boundary and the compatible candidate requirements.

The portfolio accepts only `version: 2` results. An answered result has bounded
text and citations containing exact `source_id`, a 64-character lowercase
SHA-256 `evidence_id`, and a quote. Every source ID must exactly match
`assistantCorpusSources.path`; display labels and links come from that map.
Stored citations with IDs are resolved again on restore. Legacy records retain
the exact label/link allowlist. Unknown IDs never become guessed links.

A `not-covered` result contains a fixed policy ID. The portfolio selects text
from `content/assistant-policy.json`, version `portfolio-policy-v3`, and ignores
backend policy prose. Unknown policies use: “I don't have that information in
OJ's published material. You can contact OJ directly.” Arbitrary unsupported
text in saved browser records also becomes this fixed fallback.

The raw body cap is 8 KiB at each request boundary and 48 KiB for responses.
Answer/quote/source fields are capped at 4000/1000/200 characters, with 1–8
citations. Proxy timeout is 9 seconds from route entry; browser timeout is 10
seconds through body parsing. The service receives only a trusted remaining
deadline, never a visitor-supplied extension. Cited reserves 0.5 seconds for
validation within its 8-second backend budget and uses at most 6 seconds for a
single provider attempt. No retries or second provider are activated.

Backend authentication precedes body parsing. An occupied job retains its worker
slot through timeout or disconnect until it actually exits. No-call policy work
does not spend a provider allowance; uncertain dispatched attempts remain
counted. Metrics are aggregate and usage can be unknown. The configured model
is not an attestation of the model that actually answered.

Before releasing, bind both repository revisions and any local dirty-file
hashes, prompt, policy, corpus checksum, questions, runtime/configuration and
dependency/model locks. Verify the Python policy map exactly matches the JSON
map. Generate a fresh corpus export and retain its checksum. A changed corpus
requires matching vectors and fresh approved answer-quality evidence. Do not
invent a committed revision for local changes or overwrite historical runs.

Run Cited's complete tests and the portfolio route/service/component tests, then
the integrated portfolio build/browser gates. Keep mixed supported/invented
claim regressions: runtime citation checks cannot establish semantic truth.
Paid model runs, captured-answer human review and live observation remain
separate evidence requirements.

Rollback is a paired API/prompt/policy/corpus/config/vector change. Keep safe
unavailable behavior while versions differ. The existing tab record is display
data only; generated answer text never enters the four-turn provider history.
Operational changes, publication and Beta graduation still need owner authority.
