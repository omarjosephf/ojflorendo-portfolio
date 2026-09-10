# E.V and Cited Python hosting experiment

Date: 2026-09-09. Risk: R2. Bounded research checkpoint complete; package 14 remains
in progress. The experiment measures fixed-query retrieval, not the full assistants.

Both corpora run on an actual Linux Vercel Hobby function with the pinned BGE small
model and precomputed vectors. All 24 E.V and 14 Cited frozen questions reproduce
the offline top-four source/chunk order and scores within 0.000001. The questions
remain assistant-authored; these results do not establish human-reviewed answer
quality or negative-question refusal accuracy.

## Measured results

| Measurement | Result |
| --- | --- |
| Offline validation | 252 checks; zero outbound network attempts or paid calls |
| Protected preview validation | 46 checks across 60 requests |
| Uploaded source | All 57 files match the bound local source; no credential files |
| Builder size before optimization | 277.81 MB |
| Function artifact reported by Vercel inspect | 97.95 MB |
| Build command duration | 9 / 11 / 8 seconds across the three builds |
| E.V observed cold request | 3.25 seconds HTTP total |
| Cited observed cold requests | 3.31, 2.38 seconds HTTP total |
| E.V warm HTTP median / p95 | 200 / 239 ms; 24 sequential requests |
| Cited warm HTTP median / p95 | 210 / 260 ms; 13 sequential requests |
| E.V / Cited warm query median | 31 / 21 ms |
| E.V / Cited process CPU median | 30 / 25 ms per warm handler |
| Maximum observed process RSS | 299432 KiB, approximately 292 MiB |
| Two eight-client bursts | 6 success / 2 busy; 5 success / 3 busy |
| Preview instances observed | 3; the admission lock is per instance |
| Additional spending / subscriptions | US$0 of shared US$3 allowance / none |

HTTP measurements use curl's transfer timing from the test machine to `iad1` and
include network/TLS/platform time, but exclude CLI startup. Handler measurements
include lazy initialization when indicated. Cold observations are a small sample, not a cold-start percentile or service
guarantee. The final import-order correction passed lint, 252 offline checks and
another 60 cloud requests; earlier source and measurements were preserved separately. Warm p95 uses nearest
rank. CPU time is process-level and RSS is a process high-water mark, not a billing
meter. The two artifact sizes measure different build stages; the final
uncompressed function size was not separately exposed by the inspected API.

The function uses Python 3.12.13, FastAPI 0.141.1, Fastembed 0.8.0, ONNX Runtime
1.28.0, NumPy 2.5.1 and tokenizers 0.23.1. Runtime configuration is two ONNX threads,
CPU execution, a ten-second function limit and offline model loading. Fixed dataset
and case allowlists reject arbitrary/duplicate query fields. Missing or corrupt
sources/vectors fail closed; request-time passage embedding is forbidden. No
answering route or provider runtime is loaded. Source, model, vector, corpus and
configuration hashes are bound separately from the measured responses.

## Protection failure and containment

The initial protection check did not pass end to end. Standard Protection was
verified before uploading, but Vercel CLI 59.13.1 converted the explicitly requested
first preview deployment to production and automatically created two unprotected
default aliases. Anonymous checks observed HTTP 200 on both. The aliases were
immediately removed and subsequently returned HTTP 404. The unique deployment URL
remained protected. The uploaded bundle contained public corpora and fixed research
queries, with no application credentials or private transcripts.

Both subsequent deployments were verified as actual previews with no aliases. Anonymous
requests to its health and both retrieval routes were denied with authentication
redirects. Authorized measurements used the CLI's protection bypass handling;
credentials were neither printed nor added to source. Final checks verified both
removed aliases still returned 404 and all three unique deployment URLs returned 302.
This records a failed first protection attempt and successful containment, not an
uninterrupted protection claim. The existing portfolio project, Fly apps,
production secrets, DNS and owner's local session were untouched.

For future first-deployment experiments, a preview flag alone is insufficient.
Qualify the actual target and every assigned alias before any sensitive workload
is uploaded; this experiment does not authorize another public first deployment.

## Limits and decision

The current [Python runtime documentation](https://vercel.com/docs/functions/runtimes/python)
allows a standard 500 MB uncompressed bundle. The
[Hobby upload limit](https://vercel.com/docs/limits) is 100 MB of source.
[Function limits](https://vercel.com/docs/functions/limitations) provide Hobby
functions with 2 GB memory and one vCPU. Build capacity was two cores and 8 GB;
this is provisioned capacity, not measured peak build memory.
[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
is available on all plans. The [Hobby plan](https://vercel.com/docs/plans/hobby)
restricts use to personal, noncommercial projects; this technical experiment does
not establish eligibility for commercial public services. No subscription or paid
model call was used, and earlier budget ledgers remain intact.

Retain Vercel as a technically plausible candidate. Do not migrate paid answering
on this evidence alone. 3 observed instances make a local SQLite budget or
process lock insufficient for shared spend admission. Full application startup,
durable transactional admission, actual generation/fallback latency, storage
integration, sustainable plan eligibility, operational recovery and the final
release gate remain. ADR-0015/0016 remain unchanged; no production hosting decision
is adopted by this experiment.

See the [sanitized evidence](evidence/2026-09-09-python-runtime-probe.json) and
[delivery tracker](../roadmaps/ev-management-progress.md). Full frontend/backend
application suites were not repeated because their source was unchanged in this
phase; focused probe checks and documentation verification cover this checkpoint.
Both candidates remain dirty and uncommitted on
`codex/ev-durable-budget-provider-integration`. No commit, push, merge or tag was
performed. Three research deployments were created, the first unexpectedly assigned
to production; its two default aliases were removed. No existing public product
was deployed or changed. Final public release remains the owner's preview review
and explicit confirmation.
