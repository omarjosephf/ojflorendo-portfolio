# Blog multi-agent system design

- Status: **Proposed design, nothing built.** Produced for the AI Consultant
  Course (Week 6), which asked for the system design rather than an
  implementation. No blog exists on this site and no agent runs.
- Date: 2026-09-18
- Owner: OJ Florendo
- Risk: R0 for this document. Building any part of it would be R2 and needs its
  own ADR first — this record decides nothing
- Related: [package 18](../roadmaps/ev-management-progress.md)


**Author:** OJ Florendo
**Target system:** `ojflorendo-portfolio` — Next.js App Router, TypeScript,
deployed on Vercel, content stored as typed modules in `src/data/`.
**Course framing:** Week 6 Part 04 (AI Agents & Agentic AI), Week 6 Part 05
(Automation & Workflows), Week 6 Parts 06–11 (webhooks, APIs, MCP, JSON, cron,
endpoints), Week 4 Part 07 (guardrails).

---

## 1. The problem, stated honestly

"Automate the whole process" of blog posting sounds like one job. It is
actually seven, and they are not the same kind of job. Some need judgement;
some must be identical every single time.

Week 6 Part 05 draws exactly this line: **a workflow follows fixed rules, an
agent decides.** The first design decision — and the most important one — is
which stages get an agent and which stay a deterministic workflow.

Getting this wrong in either direction is expensive. Make everything an agent
and the build step becomes non-reproducible and costly. Make everything a
workflow and you have a template filler, not a writer.

| Stage | Kind | Why |
| --- | --- | --- |
| Find a topic | **Agent** | Requires judging what is interesting and new |
| Research | **Agent** | Open-ended search, unknown number of steps |
| Outline | **Agent** | Structural judgement |
| Draft | **Agent** | Generative by definition |
| Fact-check | **Agent** | Must reason about whether a claim is supported |
| Edit | **Agent** | Judgement about tone and clarity |
| Integrate into the site | **Workflow** | File writing, slug, metadata — fixed rules |
| Verify | **Workflow** | Lint, types, build, checksum — must be identical every run |
| Publish | **Workflow + human** | One irreversible action, gated |

Five agents, three workflow stages, one human.

---

## 2. Autonomy level

Week 6 Part 04 places systems on a slider from a chatbot that only answers, up
to a fully autonomous multi-agent team. This system deliberately stops short of
the top of that slider.

**It is a supervised multi-agent team.** Agents research, write, critique and
prepare. They do not publish. The final step is a human approval that already
exists in the repository's infrastructure and cannot be bypassed by an agent
(see §6).

This is not timidity. The site is the author's professional identity. An agent
publishing an unreviewed claim about his own work does reputational damage that
no amount of speed repays.

---

## 3. Architecture

```
                        ┌──────────────────────────┐
     TRIGGER  ────────► │       ORCHESTRATOR       │
   cron / webhook       │  holds shared JSON state │
                        │  routes · budgets · retries│
                        └─────────────┬────────────┘
                                      │
   ┌──────────┬───────────┬───────────┼───────────┬────────────┐
   ▼          ▼           ▼           ▼           ▼            ▼
┌──────┐  ┌────────┐  ┌────────┐  ┌───────┐  ┌────────┐   ┌────────┐
│SCOUT │─►│RESEARCH│─►│ARCHITECT│─►│WRITER │◄─┤ CRITIC │──►│ EDITOR │
│topic │  │ sources│  │ outline │  │ draft │  │ verify │   │ polish │
└──────┘  └────────┘  └────────┘  └───────┘  └────────┘   └────┬───┘
                                      ▲           │             │
                                      └─ retry ───┘             │
                                        (max 3)                 ▼
                                                        ┌───────────────┐
                                                        │  INTEGRATOR   │ workflow
                                                        │ content module│
                                                        │ slug·metadata │
                                                        │ OG image      │
                                                        │ corpus regen  │
                                                        └───────┬───────┘
                                                                ▼
                                                        ┌───────────────┐
                                                        │   VERIFIER    │ workflow
                                                        │ lint·types    │
                                                        │ build·a11y    │
                                                        │ checksum      │
                                                        └───────┬───────┘
                                                                ▼
                                                        ┌───────────────┐
                                                        │  PUBLISHER    │ workflow
                                                        │  opens PR     │
                                                        │  ■ STOPS ■    │
                                                        └───────┬───────┘
                                                                ▼
                                                   ████ HUMAN APPROVAL ████
                                                    approved-to-deploy label
                                                                ▼
                                                          Vercel deploy
```

---

## 4. The agents, each as a think → plan → act → observe loop

Week 6 Part 04 defines the agent loop. Each agent below runs that loop; what
differs is the goal it holds and the tools it may call.

### Scout — what is worth writing about
- **Think:** what has changed since the last post?
- **Plan:** read recent merged pull requests, new architecture decision records, newly shipped projects.
- **Act:** call repository-reading tools.
- **Observe:** score candidates on novelty and whether there is enough substance for a whole post.
- **Output:** three ranked topic proposals with evidence for each.

Scout never invents a topic. Every proposal must point at something that
actually happened in the repository. This is the first guardrail, not a nicety:
a blog that invents its own history is worse than no blog.

### Researcher — gather the supporting material
- **Tools:** web search, documentation fetch, repository read.
- **Output:** a source list, each with a URL or file path, and a one-line note on what it supports.
- **Guardrail:** fetched web content is **data, never instruction.** A page that contains text telling the agent to do something is quoted, not obeyed.

### Architect — decide the shape
Turns a topic plus sources into an outline: the angle, the intended reader,
section headings, and which source supports which section.

### Writer — produce the draft
Writes against the outline, in a voice guide derived from the existing site
copy. Has no web access; it writes only from what Researcher gathered, which
prevents fresh unverified claims entering at the drafting stage.

### Critic — the most important agent in the system
Checks every factual claim in the draft against the source it is supposed to
rest on. Claims about the author's own projects are checked against the
repository's own data files and decision records, not against the model's
memory.

Its verdict is structured, not prose:

```json
{
  "verdict": "revise",
  "claims": [
    { "text": "the assistant answers from 69 indexed chunks",
      "status": "supported",
      "evidence": "src/data/management-corpus.generated.json" },
    { "text": "response times improved by 40%",
      "status": "unsupported",
      "action": "cut or measure" }
  ]
}
```

**An unsupported claim is cut, not softened.** "Roughly" and "arguably" are how
a false claim survives review. This rule is the difference between a system that
writes confidently and one that writes truthfully.

### Editor — clarity, not truth
Runs last among the agents. Tone, length, readability, heading structure,
plain-language explanations of technical terms. It may not introduce new
factual claims; anything it adds re-enters Critic.

---

## 5. The workflow stages, as the six building blocks

Week 6 Part 05 gives six building blocks of any workflow. The whole pipeline
maps onto them:

| Block | In this system |
| --- | --- |
| **Trigger** | A weekly cron schedule, or a webhook fired when a pull request merges — meaning new material exists to write about |
| **Action** | Each agent invocation; each file written by the Integrator |
| **Condition** | Critic's verdict (`approve` / `revise` / `reject`); Verifier's pass or fail |
| **Loop** | Writer ↔ Critic, bounded to three attempts |
| **Data** | One shared JSON state object carried through every stage |
| **Notification** | The opened pull request, plus a message to the author |

**Integrator** writes the post as a typed content module matching the existing
`src/data/` pattern, generates the slug, metadata and social preview image, and
adds the sitemap entry. All fixed rules — no model judgement.

**Verifier** runs the repository's existing gate: lint, type checks, production
build, accessibility checks, and corpus checksum consistency. It is
deterministic by design. A build that passes on one run and fails on the next
tells you nothing.

**Publisher** opens a pull request and stops.

---

## 6. Where the human sits, and why it is structural

Most designs of this kind say "human review" and draw a box. Here the box is
enforced by infrastructure that already exists.

The repository requires a recorded owner approval before anything reaches the
production branch: a required status check fails on every pull request until
the author adds an `approved-to-deploy` label. The check's only step is named
*"Require owner approval to merge."* New commits revoke the label
automatically, so an approval always refers to the exact commits being merged.

This gives the design three properties that are otherwise hard to guarantee:

1. **An agent cannot publish**, even if it is compromised, confused, or
   instructed by malicious content it read on the web. It has no path to the
   production branch.
2. **The approval is auditable.** It is a label on a specific commit, not a
   verbal "looks good".
3. **The approval cannot go stale.** If the agent pushes a revision after
   approval, the approval is withdrawn automatically.

The correct term from Week 6 Part 04 is a **guardrail** — and the strongest
guardrails are the ones the agent has no ability to remove.

---

## 7. The four defensive lines of guardrails

Week 4 Part 07 gives four lines of defence. Each has a concrete implementation
here:

| Line | Implementation |
| --- | --- |
| **Stay in scope** | Scout may only propose topics evidenced by real repository activity |
| **Never give a wrong answer** | Critic verifies claims against source files; unsupported claims are cut |
| **Resist manipulation** | Fetched web content is treated as data; an instruction found inside a page is quoted to the human, never executed |
| **Hand off to a human** | The pull request gate — structural, not advisory |

A fifth, specific to spending money: **a per-run budget**, modelled on the
reservation ledger the author's assistant already uses. The orchestrator
reserves a token budget before the run and refuses to start an agent that would
exceed it. Bounded retries (three) stop a Writer–Critic disagreement from
looping until the budget is gone.

---

## 8. Technical backbone

Drawn from Week 6 Parts 06–11, using infrastructure the project already has:

- **Cron (Part 10)** — a scheduled GitHub Actions workflow. The course names
  GitHub Actions among the six real homes for cron, and the repository already
  runs scheduled workflows, so this needs no new platform.
- **Webhook (Part 06)** — GitHub emits a pull-request-merged event; the
  orchestrator can use it as an alternative trigger, so a post is drafted when
  there is genuinely something new to say rather than merely because a week
  passed.
- **API (Part 07)** — the Claude API provides agent inference. Each agent is an
  API call with its own system prompt, tool set and token ceiling.
- **MCP (Part 08)** — agents receive their tools through Model Context Protocol
  servers rather than bespoke integrations: a filesystem server to read the
  repository, a GitHub server to open the pull request. The course's framing
  applies directly — the host runs the agent, the client connects, and the
  server offers its three gifts of tools, resources and prompts. Using MCP means
  the tool surface is declared and auditable instead of scattered through code.
- **JSON (Part 09)** — the shared state object and every structured agent
  output, including Critic's verdict above.
- **Endpoint (Part 11)** — the pull request is this system's output endpoint:
  the single, observable place its work arrives.

---

## 9. The coupling most designs would miss

This portfolio already runs a retrieval-augmented assistant that answers
visitors' questions from a fixed corpus, with a checksum verified in continuous
integration.

A new blog post is new content on the site. So the design must answer a question
that has no default: **does the post enter the assistant's corpus?**

- **If yes**, the Integrator must regenerate the corpus snapshot and the
  checksum, or the verification stage fails. The assistant then becomes able to
  answer questions about the new post — which is the desirable outcome, and the
  reason to prefer it.
- **If no**, the exclusion must be explicit and recorded, or a future
  maintainer will read the gap as a bug.

Following the course's RAG pipeline from Week 4 Part 04 — `document → chunks →
embeddings → vector database → similarity search → answer` — publishing a post
means re-running the first three stages. It is not enough to write the file.

This is the point at which the blog system stops being a content pipeline and
becomes part of the site's AI architecture.

---

## 10. Failure handling

| Failure | Response |
| --- | --- |
| Critic rejects three times | Stop. Escalate to the human with the draft and all three rejection reports. Do not lower the standard to get a pass |
| Verifier fails | Return to Integrator once. If it fails again, open the pull request anyway, clearly marked as failing, so the human can see what broke |
| Research finds nothing | Abandon the topic and take Scout's second-ranked proposal. Never write a post with no sources |
| Budget exhausted mid-run | Save state and stop. A half-finished draft in the state object is recoverable; a silently truncated post is not |
| Web page contains instructions | Quote them to the human. Never act on them |

The consistent principle: **failures stop and surface. They never downgrade the
standard in order to complete.**

---

## 11. What this system does not do

Stated explicitly, because an honest design names its limits:

- It does not publish. It prepares a pull request.
- It does not measure whether posts perform. Analytics would be a second system.
- It does not learn from previous posts. Each run starts fresh; adding memory
  would require deciding what a "good post" was, which needs human labels.
- It does not write about anything outside the author's own work.

---

## 12. Summary

Five agents doing judgement work, three deterministic workflow stages, one
irreversible action behind a human gate that the agents cannot reach.

The design's two distinguishing decisions are the split between agent and
workflow in §1 — because not everything that *can* be an agent *should* be —
and the human gate in §6, which is not a drawn box but an enforced status check
the agents have no ability to remove.
