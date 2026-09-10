# Long-term hosting and database review

Reviewed 8 September 2026 against current provider documentation and the local
candidate. This supersedes any interpretation that Vercel or Supabase has already
been selected irrevocably. No account, project, subscription or deployment was
created for this review. Production traffic, invoices and Linux runtime memory
have not been measured here.

## Recommendation

**Do not buy Vercel Pro and Supabase Pro now just to continue development.** Keep
managed PostgreSQL plus managed authentication as the preferred storage approach;
Supabase Free remains a reasonable first staging candidate. Keep the application
host decision conditional on a real deployment experiment. The owner's request
to compare alternatives precedes any project provisioning.

Vercel plus Supabase is a credible long-term combination for this product, but
calling it the cheapest or best before measuring both Python workloads would be
premature. The shortlist is:

1. **Vercel for all applications, Supabase for database/authentication**, if the
   packaged Python model, startup latency and shared spending controls qualify.
   This preserves the existing Next.js deployment workflow and can remove Fly.
2. **Fly for all applications, Supabase for database/authentication**, if the
   assistants benefit materially from persistent processes or Vercel adaptation
   costs more than it saves. Qualify the portfolio on Fly before cancelling its
   current host. Existing Python/container work makes this the closest alternative.
3. **Railway for all applications**, as a competing container-host quote if Fly's
   measured operating cost or workflow is unattractive. Retain Supabase initially
   if managed identity and database operations are still wanted.

Do not maintain three paid host experiments. First measure the present workloads,
then qualify one proposed consolidation destination using the same acceptance
criteria. An additional database bill is not duplicate app hosting: conversation
storage, identities, access policies and recovery are separate services. They can
be bought from one vendor, but still consume resources and require operations.

## What Python does and does not determine

Python does not save a visitor's conversation across devices, secure an owner
account, back up records or enforce retention by itself. Those require storage
and identity components. Supabase works through HTTP/PostgreSQL and is not tied
to a frontend language. Conversely, using Python does not require Fly.

Vercel supports Python, with a standard 500 MB uncompressed bundle limit; its
larger 5 GB option is a public beta. Our known Linux package inventory is
**285.8 MB**, excluding build-wrapper overhead and some generated artifacts. It
has not run on Linux or Vercel. Package size alone is therefore not a valid
reason to rule Vercel out. [Python runtime](https://vercel.com/docs/functions/runtimes/python),
[local footprint evidence](ev-hosting-and-cost-review.md#measured-linux-package-footprint-8-september-2026).

The current Python budget candidate uses a persistent, single-machine SQLite
ledger. Ephemeral function instances need transactional shared admission before
model dispatch. Conversation storage and the provider spending ledger are
separate concerns; adding chat tables does not solve distributed spending.
[Vercel SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel),
[budget ADR](../adr/0015-durable-budget-and-provider-order.md).

The portfolio can run on a Node server outside Vercel. Its request nonce and new
server-rendered theme preference mean a static export is not equivalent. A new
host must preserve response headers, image behavior, caching and protected APIs.
The installed Next.js 16.3.3 self-hosting guide was inspected; upstream explains
Node hosting and multi-instance cache responsibilities.
[Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

## Comparable costs and responsibilities

USD list prices, excluding tax, domains, model calls and unmeasured overages.
These are starting points, not quotes for this account. A subscription credit is
included in its minimum charge, not an extra charge on top.

| Arrangement | Cost basis | What matters for this project |
| --- | --- | --- |
| Vercel Pro + Supabase Free | $20/month starting platform charge | A staging/early-use arrangement, subject to database limits and recovery requirements |
| Vercel Pro + Supabase Pro | $45/month starting combined charge | One app host; managed database/auth; usage and added resources can increase the bill |
| Fly apps + Supabase | Metered Machines, volumes and transfer, plus database tier | Closest fit to the existing Python process; portfolio migration still needs proof |
| Railway apps + Supabase | Hobby $5 minimum or Pro $20 minimum, each credited toward resource usage, plus database tier | Straightforward container candidate; aggregate memory, CPU and transfer determine cost |
| Railway apps + its PostgreSQL template | Aggregate resource usage, plus identity/operations needs | Potentially one invoice, but the database template is unmanaged and is not a Supabase-equivalent service |
| Render apps + managed PostgreSQL | Each service/replica has its own compute allocation; database and storage priced separately | Viable consolidation architecture; guest identity/MFA still needs a solution; obtain the complete current quote before choosing |
| Fly apps + Fly Managed Postgres | App resources + database from $38/month + $0.28/provisioned GB-month | One vendor does not automatically mean a lower total than Supabase |
| One VPS with apps and database | Server, off-server backups, transfer and maintenance time | Most operational responsibility: patching, monitoring, restore, identity and incident recovery |

Vercel Pro's $20 includes one deploying seat and $20 usage credit, across the team;
it is not $20 per chatbot. Hobby is restricted to non-commercial personal use.
The portfolio offers client services, so plan for Pro if that activity remains
on Vercel; traffic volume alone does not settle eligibility.
[Vercel Pro](https://vercel.com/docs/plans/pro-plan),
[Hobby restrictions](https://vercel.com/docs/plans/hobby).

Supabase Free currently includes a 500 MB database and 5 GB egress, with up to
two active projects and pausing after a week of inactivity. Automatic backups
are not included. Pro starts at $25 including the first project; additional
projects start from $10 and daily backups retain seven days. Free is useful for
staging. Choose production recovery requirements before deciding when to upgrade.
[Supabase pricing](https://supabase.com/pricing).

Railway's memory rate is $0.00000386 per GB-second: **1, 2 or 4 GB used continuously
for 30 days is approximately $10, $20 or $40 for memory alone**. CPU, volumes,
egress and plan minimums remain. These are illustrative calculations, not our
measured footprint. Its $5 minimum is not a promise to host three applications
and a database for $5. [Railway pricing](https://railway.com/pricing).
Railway explicitly assigns configuration and maintenance of its PostgreSQL
template to the customer. [PostgreSQL responsibilities](https://docs.railway.com/databases/postgresql).

Fly bills resources rather than requiring a $20 app-host subscription. Its
Managed Postgres pricing is separate; current documentation also lists version
upgrades/security patches among developing capabilities, which must be clarified
before relying on that product. [Fly resource pricing](https://fly.io/docs/about/pricing/),
[Managed Postgres](https://fly.io/docs/mpg/).

Render supports Node/Python services and a managed database, but a single vendor
still bills the chosen services. Its Free database expires after 30 days, so it
is not an indefinite production conversation store. Dynamic pricing tables were
not fully exposed in the retrieved pricing page; no complete Render quote is
claimed here. [Service types](https://render.com/docs/service-types),
[compute plans](https://render.com/docs/compute-plans),
[Free database lifecycle](https://render.com/docs/free).

Self-hosting the full Supabase stack currently calls for at least 4 GB RAM,
2 CPU cores and 40 GB SSD, before accounting for these applications. Its guide
assumes Linux, Docker and networking administration. This is an available exit
route, not the recommended first production operation for this project.
[Supabase self-hosting](https://supabase.com/docs/guides/self-hosting/docker).

## Costs to control before launch

Set separate budgets for app compute, database and model calls. Include previews,
backups, egress between providers, logs, email delivery and any paid authentication
features. Put application and database near each other; measure the actual
cross-provider round trip. Preserve separate E.V/Cited admission allocations.

Vercel spend notifications do not stop traffic unless pausing is configured;
checks can lag by minutes and pausing can affect all team projects. A chat-specific
admission limit is still needed to avoid taking the portfolio offline because of
chat abuse. [Vercel spend management](https://vercel.com/docs/spend-management).
Supabase's spend cap covers selected usage items, not opted-in compute and all
add-ons. It is not a universal dollar ceiling.
[Supabase cost control](https://supabase.com/docs/guides/platform/cost-control).

Start a guest identity only when chat storage is requested, not on every page
view. Add anti-abuse protection and an explicit cleanup policy. Supabase warns
that anonymous signups grow the database and do not currently clean themselves
up. Deleting expired conversations alone does not delete inactive identities.
[Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

## Portability and recovery

The current data model uses PostgreSQL tables, UUIDs, explicit migrations and
server-side adapters. Preserve those boundaries. Keep knowledge sources,
chunk manifests, model revisions and evaluation sets in portable formats. A model
or dimension change requires a new versioned index and re-embedding; it is not a
blind in-place update.

Supabase is **not zero lock-in**. The candidate uses `auth.users`, `auth.uid()`,
JWT assurance claims, managed Auth and PostgREST RPCs. Moving the SQL records is
easier than replacing those identity and API contracts. An exit rehearsal must
map identities, replace those helpers, rerun isolation tests and deliberately
invalidate or migrate sessions. Do not promise that a database dump alone moves
the complete product. Even Supabase-to-Supabase restore needs attention to custom
Auth/Storage schema changes and roles.
[Backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Keep encrypted backups outside the running database's failure domain and test a
restore to an isolated destination. Proposed initial recovery objectives for
review: at most 24 hours of transcript loss and restoration within one working
day. These are design targets, not verified guarantees. Restore must reapply
expiry/deletion rules before allowing reads. Protect raw transcripts and keep
redacted operational evidence separately.

## Decision gates and when to pay

Continue local implementation at no new platform subscription cost. When staging
is needed, review the chosen free project configuration: owner identity, region,
MFA, signup abuse controls, retention and recovery. A free staging result is not
production qualification.

Before paying for or migrating an app host, capture this evidence for **both**
E.V and Cited on one proposed destination:

- A real target build with pinned native dependencies, bundled model and verified
  corpus; no request-time model download.
- Cold/warm p50 and p95 latency, peak resident memory, concurrency and failure
  rates inside the existing visitor deadlines.
- Admission across retries, process loss and simultaneous instances; no duplicate
  paid dispatch from a save retry.
- Verified guest isolation, owner MFA, expired-session behavior, retention and a
  restore drill; authenticated routes remain uncached.
- A low/expected/burst monthly cost worksheet populated with measured resource
  usage, including both workloads, portfolio, database and model charges.
- A rollback rehearsal and owner preview acceptance before DNS or public traffic
  moves. Retire the old host only after recovery and both applications pass smoke
  tests; inspect remaining billable volumes and services.

The database upgrade trigger is dependable recovery/availability or measured
capacity need. The Vercel upgrade trigger can be commercial-use eligibility or
required features, even before high traffic. Neither should be purchased merely
because its name appears in the roadmap. Revisit the comparison after real usage
or a material pricing change, not on a speculative calendar migration.
