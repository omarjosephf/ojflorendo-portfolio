# Threat model: Phase 18.4 live blog pipeline

- Status: **Accepted for Phase 18.4 by the owner's approval of the live-runner
  plan, 30 September 2026**
- Owner: OJ Florendo
- Scope: `src/lib/blog/live`, `scripts/blog-agents.mjs`, the Blog section of
  the owner panel and the promotion of an approved post into
  `content/blog/posts`
- Related: [ADR-0026](../adr/0026-gemini-first-blog-agent-models.md),
  [Package 18 design](../reviews/blog-multi-agent-system-design.md),
  [runbook](../runbooks/blog-agents.md). The
  [bake-off threat model](blog-provider-bakeoff.md) covers only the cancelled
  comparison.

## What the system does

The owner runs one command on their own computer. Idea Scout
(`gemini-3.8-flash` with Grounding with Google Search) suggests up to five
topics. The owner picks one. The Planner–Researcher, Writer, SEO Agent,
independent Reviewer–Verifier (`gemini-3.1-pro-preview`) and Critique Agent
then run in sequence against Google's Interactions API. The result is a
private run record on the owner's computer. Nothing is published: a post
reaches the site only when the owner approves it, the `promote` command writes
it as a JSON post file, and the owner approves the pull request that carries it.

## Assets

| Asset | Where it lives | Why it matters |
| --- | --- | --- |
| Gemini API key | A key file outside the repository, passed to Node with `--env-file` | Spend and account abuse |
| Spend ledger | The data directory outside the repository | The only durable cost control |
| Private run records | The data directory | Full drafts and evidence; not secret, but unreviewed |
| Published posts | `content/blog/posts` on `main` | Public statements under OJ's name |
| Run summaries | `src/data/blog-runs.json` on `main`, shown in the panel | Public once committed |

## Trust boundaries

1. **Web to Idea Scout.** Google Search results are untrusted. They can steer
   topic suggestions only. They never become evidence, and the owner reads every
   idea before choosing.
2. **Sources to drafting agents.** Only files on the owner-approved allowlist in
   `sources.ts` are used. All are public in the repository. Their sentences are
   offered as data. A sentence that matches an instruction-like or
   credential-like pattern is never offered.
3. **Model output to code.** Every response is JSON checked against a strict
   contract. Claims must equal an offered sentence byte for byte. Citations
   must quote that sentence exactly where they point. The unchanged Phase 18.2
   parsers re-check all of it. Anything else stops the run.
4. **Reviewer to Writer.** Only fixed signals cross back for the single
   revision: failed citation indexes, unmapped locations and issue categories.
   Free Reviewer text never reaches the Writer.
5. **Run record to repository.** Only `promote` writes into the repository. It
   refuses a record whose integrity digest does not match, or a run that did not
   pass every gate.

## Threats and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Prompt injection from a web page steers Idea Scout | Search results are topic signals only; ideas must name allowlisted sources; the owner chooses | A misleading topic can be suggested; the owner rejects it |
| Injection inside a source file reaches the Writer | Sources are OJ's own public files; pattern-matched sentences are withheld; claims are exact sentences, not model prose | Pattern matching is defence in depth, not proof |
| A fabricated fact or citation is published | Exact-sentence claims, deterministic citation checks, an independent Reviewer on a different model, seven hard gates, a pass mark strictly above 75, and owner approval | Connective prose can still mislead without stating a fact; the owner reads every post |
| Runaway spend | Each call's worst case is reserved in a durable ledger before sending; US$1.00 per run and US$5.00 for the phase; seven calls per run; no retries; an unknown outcome keeps its full reservation | Google may bill a request whose response is lost; the reservation already counts it |
| Key leakage | The key file is outside the repository and never printed; errors keep only the HTTP status; the key never reaches the site, Vercel or a browser | The key is on the owner's disk in plain text; a least-privilege, spend-limited key limits the damage |
| Private data sent to Google | The allowlist is public repository material only; the 18.2 privacy and machine-path scans run on inputs and outputs | Only public material is in scope |
| A model silently changes | The response must name the requested model; models change only by code review (ADR-0026 Model Scout) | Google can change a model behind the same identifier |
| Grounding-terms breach | Idea Scout results are shown to the owner with Google's Search Suggestions, exactly as supplied; grounded text is not committed | Terms may change; re-read them before building 19b |
| Unapproved publication | Runs never write posts; `promote` needs a passing, intact record and is run only after the owner says yes; merging needs the owner's release approval | None beyond the existing release process |

## Out of scope

Running agents on Vercel, a production database, a scheduler, auto-publish,
the OpenAI and Anthropic fallbacks, and the Model Scout. Each needs its own
review before it is built.
