# Project: Cited — Document Assistant

## Cited: what it is

Cited is a document assistant that answers questions from a set of documents and
shows the exact passage each answer came from. When the documents do not contain
the answer, it says so instead of producing a plausible one.

It is live at https://cited-demo.fly.dev and the source is at
https://github.com/omarjosephf/cited. Status: live.

## Cited: the guarantee it makes

Every quoted citation is verified locally against the passage the model was
actually sent. Questions the documents cannot answer are refused rather than
guessed at. Answer quality, refusal behaviour, and citation integrity are scored
by a committed evaluation set rather than asserted.

## Cited: why it exists

Most demonstrations of this kind answer confidently whether or not they should,
and ask you to trust a citation the model generated about itself. Ordinary search
has the opposite problem: it returns a list of documents and leaves the reading to
you. OJ wanted the version that is actually useful in a working context — one
that returns the answer, shows its source, and is honest about the limits of what
it was given — and to hold it to a standard where the honesty is measured rather
than claimed.

## Cited: how it is built

The technology Cited is built with is Python and FastAPI, the Anthropic API
with Claude Haiku 4.5, fastembed and ONNX Runtime for local embeddings, NumPy
for vector search, pytest, Docker and Fly.io. The technical design behind that
stack:

- Documents are read into passages that remain individually citable, with paths
  relative to the corpus root so identically named files stay distinguishable.
  PDFs keep their page numbers, so a citation can read `guide.pdf, p.4`.
- Embeddings run locally through ONNX rather than a hosted API, so retrieval adds
  no per-query cost and introduces no second vendor.
- Retrieval is NumPy cosine similarity behind a `Retriever` interface. At this
  corpus size a vector database is complexity without benefit, and the interface
  keeps the upgrade cheap if that changes.
- Answering uses the Anthropic API's native citations, computed against the
  passages actually supplied, then re-verifies every quote locally — so the
  guarantee lives in the repository rather than in a vendor's feature list.
- The HTTP layer owns transport, protection, and presentation only. It decides
  nothing about answers, which keeps the core usable as a library.

Technologies: Python, FastAPI, the Anthropic API with Claude Haiku 4.5,
fastembed / ONNX Runtime, NumPy, Docker, Fly.io, pytest, GitHub Actions, and
AI-assisted engineering with human review.

## Cited: what was measured

The results of evaluating Cited, measured by its committed evaluation set rather
than asserted, are as follows. On the committed question set: 100% retrieval hit rate and 80% top-1, 100%
answering accuracy, all unanswerable questions correctly refused, none wrongly
refused, and zero citations rejected as unverifiable, across five consecutive
runs.

The scope of that claim is stated rather than glossed: it is fifteen questions
against a ten-chunk corpus. That is enough to catch regressions, and it has
already found three real bugs. It is not enough to show the system generalises.

## Cited: three things that went wrong

Three things went wrong while building Cited, and each changed the design. They
are recorded because a project about checkable claims should be able to describe
its own failures.

**A similarity threshold cannot tell you what is answerable.** The plan was to
refuse questions whose best retrieval score fell below a cutoff. Measurement
killed it: the lowest-scoring answerable question scored 0.666 while the
highest-scoring unanswerable one scored 0.755, because that question was
topically adjacent to a document without being covered by it. The ranges overlap,
so no cutoff separates them. Refusal became a judgement the model makes after
reading the passages.

**Trusting a citation the model wrote about itself.** Asking a model to include
its source and hoping produces citations that look right and cannot be checked.
Citations here are computed by the API against the documents actually supplied,
then every quote is re-verified locally; a quote that does not appear is discarded
and counted. That check has never fired, which is the point — it is the mechanism
by which OJ would find out if it stopped being true.

**An unstable score that was not the model's fault.** Answering accuracy
oscillated between 93% and 100% across runs, which looked like model variance. It
was not: the scoring was inferring refusals rather than detecting them. An
explicit refusal marker stabilised the figure at 100%. Before trusting a
measurement, check the instrument is measuring what you think it is.

## Cited: honest limitations

The demo interface is deliberately small and has the basics right — a language
attribute, a single main heading, visible focus styling, colour-scheme support —
but it has not been through a full accessibility audit, and OJ does not describe
it as meeting the standard the rest of his work is held to until it has.

Spend is bounded by request rate, a daily answer budget, and a cap on question
length. The documentation is explicit that only a provider-level spend cap truly
bounds the loss, because the in-process budget resets on restart.

## Cited: relationship to OJ Assistant

OJ Assistant on this website runs on the same engine, pointed at a different
corpus: OJ's own approved portfolio content instead of the demo's
prompt-engineering material. The two are separate deployments with separate
budgets. That second deployment is itself the evidence for the claim that Cited
is a reusable product rather than a one-off.
