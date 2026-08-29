# Runbook — the OJ Assistant corpus

- **Decision record:** [ADR-0006](../adr/0006-retrieval-grounded-portfolio-assistant.md)
- **Applies to:** the corpus at `content/assistant/`, its system prompt, and the
  `oj-assistant` deployment of the `cited` service

## What this corpus is

The complete set of documents the assistant may answer from. **If it is not in
here, the assistant cannot say it.** That is the point: it is the single source
of truth for OJ's public claims as the assistant states them, and the reason the
old hand-written answer manifest was deleted rather than kept.

Editing these files changes what the public assistant tells visitors about OJ.
Treat a corpus change with the same care as changing published copy on the site,
because that is what it is.

```text
content/
├── assistant/                   the corpus itself
│   ├── *.md                     owner-approved documents
│   └── OJ_..._Public_CV.pdf     a copy of the published public CV
├── assistant-system-prompt.md   the assistant's role, tone, scope, guardrails
└── assistant-eval/questions.toml  the evaluation set
```

## Rules for corpus content

1. **Everything in here is public.** It is served to anyone who asks a question.
   No private phone number, no address, no unpublished work, no client
   confidence, no secret. Tests enforce the mechanical parts of this; they do not
   replace reading what you wrote.
2. **Every claim must be verifiable** from owner-approved information. No
   invented projects, clients, metrics, testimonials, or availability.
3. **Write self-describing sections.** A section body must state its own subject
   rather than relying on its heading — headings are carried as citation
   metadata and are *not* embedded, so they contribute nothing to retrieval. This
   is not style advice: it was worth 32 percentage points of retrieval hit rate
   (45% → 77%) when the corpus was rewritten this way.
4. **Aim for 80–180 words per section.** Short abstract sections behave as
   attractors — they are semantically close to every question and outrank the
   specific content that actually answers it.
5. **Keep section headings unique across the whole corpus.** Two documents with a
   section called "What it is" make the evaluation set ambiguous, and an
   ambiguous `expects` produces a wrong score rather than an error.
6. **The public CV copy must stay byte-identical** to `public/documents/`. A test
   enforces it. Replace both together or neither.

## Making a corpus change

```bash
# 1. Edit the documents in content/assistant/.

# 2. Regenerate the derived record. The digest diff is the review surface —
#    read it, because it represents a change to OJ's public claims.
npm run assistant:build-corpus

# 3. Re-score retrieval. Free: no API key, no spend.
cd ../oj-doc-assistant
PYTHONPATH=src python -m assistant.cli \
  --corpus deploy/oj-assistant/content eval \
  --questions ../ojflorendo-portfolio-public/content/assistant-eval/questions.toml \
  --top-k 4

# There is no --retrieval-only flag: a run is free unless --paid is given, so
# omitting --paid is what makes it free. Spending is opt-in and has to be stated.

# 4. Run the gate. It includes assistant:check-corpus, which fails if the
#    documents and the committed record disagree.
npm run test:ci
```

If retrieval hit rate drops, diagnose in this order: **corpus gap → retrieval
failure → prompt failure.** Never fix it by deleting a question or by changing
`expects` to whatever happened to be retrieved — that converts a real signal into
a green number and is explicitly out of bounds.

## Releasing the corpus to the service

The corpus crosses a repository boundary as a deterministic, checksummed
artifact. It is never copied by hand.

```bash
# From the portfolio repository.
npm run assistant:export -- ../oj-doc-assistant/deploy/oj-assistant
```

That writes `CHECKSUM`, `content/`, and `system-prompt.md` into the serving
repository's staging area, verifies the artifact hashes to the same value as the
source, and prints the checksum. **Record that checksum in the release notes.**

Then, from the `cited` repository — an R3 action requiring explicit owner
approval:

```bash
fly deploy --config fly.oj-assistant.toml --remote-only --ha=false
```

`--config` and `--ha=false` are both mandatory. Without `--config` this
redeploys the public demo app; without `--ha=false` Fly creates a second machine
with a second in-memory budget counter, silently doubling the daily allowance.

### Verifying the deployment served the corpus you built

```bash
curl -s https://<app>.fly.dev/health
```

`corpus` in the response is the first 12 characters of the deployed corpus
checksum. **Compare it against the value the export printed.** If they differ,
the deployment is serving different content from the one that was reviewed.

The service also verifies this itself at startup and **refuses to start** on a
mismatch, so a wrong corpus fails loudly rather than answering confidently from
the wrong documents.

### What the checksum does and does not prove

It catches the realistic failures: a stale copy, a partial copy, a corrupted
transfer, a document edited on the serving side. It is **not** an independent
witness — the digest travels with the corpus it describes, so it cannot detect
both being replaced together. For that, set `CORPUS_CHECKSUM` explicitly to the
value in the release notes; it takes precedence over the file.

## Changing the system prompt

`content/assistant-system-prompt.md` sets the assistant's role, tone, scope,
guardrails, human handoff, output format, and few-shot examples.

It is **per-deployment configuration only**. There is no interface for editing
it and no request field that reaches it: a system prompt a visitor can influence
is not a system prompt. It ships with the corpus artifact and is picked up by the
same export and deploy.

Changing it changes how every answer reads, so re-run the evaluation set
afterwards rather than assuming behaviour held.

## Before any public release

- [ ] Anthropic account spend cap configured — **owner action, and the only hard
      financial ceiling.** The in-process daily counter resets on every machine
      start, and under `min_machines_running = 0` that happens routinely.
- [ ] `SHARED_SECRET` set on the service, matching `ASSISTANT_SERVICE_SECRET` in
      the site's environment.
- [ ] Evaluation set run with answering enabled and thresholds met.
- [ ] Cold-start latency measured against the real deployment.
- [ ] `/health` checksum matches the release notes.
- [ ] Handbook §49.1 amendment ratified — see ADR-0006 D12. **Public release is
      blocked until then.**

## Rolling back

Fastest, and no deployment required: **unset `ASSISTANT_SERVICE_URL`** in the
site's environment. The route fails closed, the panel shows its honest
unavailable state, and the rest of the site is untouched.

To roll the corpus back rather than the feature, re-export from an earlier commit
of `content/assistant/` and redeploy. The service's startup check makes a
mismatched or partial rollback fail rather than half-apply.
