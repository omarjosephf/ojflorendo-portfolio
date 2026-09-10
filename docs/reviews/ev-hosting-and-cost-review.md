# E.V and Cited hosting and cost review

Reviewed 8 September 2026. This is a research recommendation, not a migration,
subscription change or claim that the current Vercel deployment can already serve
the complete Cited backend.

A broader [long-term platform review](ev-long-term-platform-review.md) now compares
consolidation alternatives and portability after the owner requested reconsideration.
No hosted database project has been created.

## Recommendation and payment timing

Build and review the management platform locally with synthetic conversations.
Supabase Free is a suitable initial database candidate when a hosted integration
is needed. Do not buy Supabase Pro merely because the roadmap is approved.

Evaluate consolidating the portfolio, E.V API, Cited demo and owner workspace on
Vercel, using Supabase for persistence and authentication. Retain Python/FastAPI
where it remains useful. This is the preferred candidate to investigate in response
to the owner's wish to avoid paying two application hosts, not a proven deployment.

Vercel Pro is a separate decision from the database tier. Its commercial-use
eligibility rule can require an upgrade before traffic grows. Supabase Pro should
be purchased when its reliability, backup or capacity features are needed, after
the total operating cost is accepted.

| Service | Current documented price / behavior | Appropriate trigger |
| --- | --- | --- |
| Vercel Hobby | Free, non-commercial personal use | Eligible personal work and experiments within limits |
| Vercel Pro | US$20/month platform fee, one deploying seat and US$20 of usage credit included; additional usage can cost more | Commercial deployments, required collaboration/features or capacity |
| Supabase Free | Free database/auth tier; 500 MB database and inactivity pausing | Prototype and integration work where those limits are acceptable |
| Supabase Pro | Starts at US$25/month, first project included; additional projects can add compute cost | Required availability without inactivity pausing, managed backups or capacity |
| Fly.io | Metered compute, storage and other resources; support subscriptions are optional | Keep only where measured runtime requirements or total cost justify it |

Prices are list prices, not fixed ceilings or a forecast of this account's invoice.
Vercel's included US$20 credit is part of the US$20 fee, not another subscription.
Multiple projects can share a Vercel team; the fee is not US$20 per chatbot.
[Vercel Pro](https://vercel.com/docs/plans/pro-plan),
[project allowances](https://vercel.com/docs/plans/hobby),
[Supabase pricing](https://supabase.com/pricing),
[Fly pricing](https://fly.io/docs/about/pricing/).

### Commercial-use distinction

Vercel restricts Hobby to non-commercial personal use and includes advertising a
product or service in its commercial-use examples. The repository's portfolio
offers services to clients. That is a reason to plan for Pro if those services
remain on Vercel; it should not be presented as a guaranteed Hobby-eligible site
merely because it is a personal portfolio or has little traffic. Vercel Support
can resolve uncertain classifications.
[Vercel fair-use policy](https://vercel.com/docs/limits/fair-use-guidelines)

### Database timing

Free can support the first integration without an immediate upgrade. Before
relying on retained production chats, decide acceptable downtime and recovery.
Supabase's paid plans have daily backups; Free requires a deliberate external
backup process. A paid plan does not replace retention, deletion or restore testing.
[Supabase backups](https://supabase.com/docs/guides/platform/backups)

### Fly billing distinction

Running Machines accrue usage charges, subject to the account's applicable credits
or allowances. Paying for a support plan is not what starts compute billing.
Stopped resources can still incur storage costs; stopping a Machine is not
equivalent to removing every billable resource. This review did not inspect a fresh
invoice or determine the owner's current amount due.
[Fly billing](https://fly.io/docs/about/billing/)

## Why Fly was a reasonable original choice

The accepted portfolio architecture reused an existing evaluated Cited service and
container instead of building a second answering engine. Fly fit that existing
deployment. The current backend packages FastEmbed/ONNX, a local embedding model
and precomputed corpus vectors. A running process can keep those loaded between
requests. See [ADR-0006](../adr/0006-retrieval-grounded-portfolio-assistant.md).

The newer budget candidate also uses a persistent SQLite reservation ledger and
process-shared admission control on one machine. That is convenient on a host with
a persistent volume, but it is an implementation choice, not a reason the product
must remain on Fly forever.
[ADR-0015](../adr/0015-durable-budget-and-provider-order.md)

The historical reuse decision does not prove Fly is the cheapest long-term
configuration. A second host may cost less than a larger subscription in some
workloads, while consolidation may simplify both cost and operations in others.
Compare the full system rather than the number of vendor logos.

## What Vercel supports now

Vercel explicitly supports Python and FastAPI, including lifespan initialization.
Neither language choice nor use of FastAPI makes migration impossible.
[Vercel FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi)

Current documentation lists a standard 500 MB uncompressed Python bundle and a
Large Functions public beta supporting bundles up to 5 GB. Function memory and
execution limits are separate constraints. The Linux runtime artifact and measured
cold start matter; the size of a development virtual environment is not a valid
deployment measurement.
[Python runtime](https://vercel.com/docs/functions/runtimes/python),
[function limits](https://vercel.com/docs/functions/limitations)

These capabilities make a fresh feasibility check worthwhile. They do not establish
that the present Docker deployment, filesystem assumptions and spending controls
will work unchanged.

The clearest required adaptation is durable shared state: Vercel Functions do not
provide a shared persistent local filesystem suitable for the current SQLite
ledger. Supabase Postgres is a candidate replacement, using transactional
reservations, idempotency and access controls.
[Vercel SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)

The rest needs measurement and qualification:

- Package the model, compatible native dependencies and published vector artifacts
  without request-time model downloads. Verify both corpora and their citations.
- Measure cold and warm latency against E.V's existing visitor deadline; a generous
  platform timeout does not make a slow chatbot acceptable.
- Preserve global spending limits across concurrent function instances, process
  loss, cancellation and retries. Reserve before dispatch and retain uncertain
  charges. A copied in-memory counter would reintroduce the overspending defect.
- Keep Cited and E.V's corpus, prompt, credentials and spending allocations isolated
  even if they share a vendor/team.
- Run ingestion as bounded resumable work, not an untracked background task that
  must survive a request. Preview jobs may run locally until hosted work is qualified.
- Use suitable database connection handling and region placement. Test storage
  failure behavior and authenticated management routes.
- Keep the local embedding if it fits and performs well. Benchmark an external
  embedding API only if it removes a measured obstacle or reduces total cost;
  account for network latency, privacy and API charges.

## Measured Linux package footprint, 8 September 2026

The pinned runtime now has a measured archive inventory for Linux x86_64 and
CPython 3.12. All 54 selected wheels were downloaded with the existing lock's
hashes, then reverified locally. Recursive dependency checks, including the
API extra and Linux platform markers, found no missing dependency. No wheel was
installed or executed on Linux.

| Component | Uncompressed bytes |
| --- | ---: |
| 54 runtime dependency wheels | 218,095,823 |
| Pinned BGE small model and tokenizer/configuration | 67,179,163 |
| Python source and HTML runtime assets | 372,129 |
| Cited source corpus | 9,584 |
| E.V source corpus, including its public PDF | 119,840 |
| **Known combined footprint** | **285,776,539** |

That is approximately **285.8 MB / 272.5 MiB**. It is below the documented
500 MB standard Python limit, with approximately 214 MB of nominal headroom
when comparing decimal bytes. This is encouraging evidence for the Vercel
candidate; package size alone is not a justified reason to reject it.
[Python runtime limit](https://vercel.com/docs/functions/runtimes/python)

This is not the output of a Vercel build. Generated vectors, bytecode,
application packaging metadata and Vercel wrapper/runtime overhead are excluded.
Native library loading, startup latency, deployed memory, region placement and
shared transactional spend admission remain unqualified. Preserve the current
model and precompute vectors during the build; do not download or index on the
visitor's first request.

The [full inventory](evidence/2026-09-08-python-footprint.json) records wheel
versions, filenames, hashes and ZIP sizes. Reproduce its verification with
[scripts/measure-python-footprint.py](../../scripts/measure-python-footprint.py)
using the matching Cited checkout, hashed Linux wheel directory and verified
model snapshot. It checks dependency closure including `uvicorn[standard]` and
includes runtime HTML/PDF assets. The source lock checksum records the exact
local bytes; a checkout with different line endings has a different byte hash.

The larger BGE base model adds about 151 MB before other overhead. The
[retrieval comparison](ev-embedding-comparison.md) does not justify adopting it
for E.V, so the smaller production model remains the deployment baseline.

## Illustrative consolidated costs

These are proposed configurations after successful migration and retirement of
unneeded Fly resources. Existing hosting continues to bill while it remains active.

| Configuration | Starting subscription total | What remains additional |
| --- | --- | --- |
| Eligible Vercel Hobby + Supabase Free | US$0 | Model API costs; free-tier limits apply |
| Vercel Pro + Supabase Free | US$20/month | Model APIs and usage beyond included allowances |
| Vercel Pro + Supabase Pro, first database project | US$45/month | Model APIs, extra usage/projects/add-ons and applicable taxes |
| Vercel Pro + Fly + Supabase | Vercel fee plus Fly usage plus selected database tier | Three services; require a measured reason to retain this arrangement |

The US$45 figure is arithmetic from the linked list prices, not an account quote.
Vercel's subscription does not include Supabase Pro or pay this application's
separate model-provider accounts.

A second consolidation option is hosting both the Next.js portfolio and FastAPI
on Fly, with Supabase for data. The portfolio README supports a Node-capable host.
This could avoid Vercel's subscription but requires qualifying the website's
deployment, caching, security and operations on that host. It is an alternative to
cost, not a claim of lower measured cost. A Vercel-first prototype best addresses
the owner's expressed preference without moving the working website first.

## Preview and migration sequence

1. Deliver a local, synthetic-data preview of the owner workspace for review.
2. Prepare the runtime package and database-backed spending design; qualify a
   protected hosted preview only under the applicable preview deployment approval.
3. Present cold/warm measurements, both-corpus evaluation, failure tests and a
   workload-based cost estimate. Choose the host before new production purchases.
4. Keep the management interface and transcripts authenticated in every environment.
   Public release means deploying the product, not exposing the admin console.
5. After owner review and release approval, migrate each service with a rollback
   path. Retire Fly resources only after both Cited and E.V have replacements and
   the rollback window and retained data have been addressed.
6. Verify billing resources after retirement; no unused volume, Machine or other
   resource should remain unintentionally billable.

No subscription, production migration, resource shutdown, transcript collection or
new inference call was performed in this review.

