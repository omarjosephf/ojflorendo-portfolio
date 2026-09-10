# E.V and Cited: offline embedding and chunk comparison

Measured 8 September 2026. Recommendation: **retain BGE small English v1.5 for
E.V and retain the existing 180-word target / 40-word overlap pending new test
questions**. The larger model loses one E.V retrieval hit, takes more local
CPU time and adds about 151 MB. A one-question top-1 gain from smaller chunks is
insufficient evidence to replace an already-qualified retrieval configuration.

This is a development-set comparison, not a production answer-quality claim.
The production embedding, chunker and stored vectors were not changed.

## Method and reproducibility

Used the actual Cited document reader, section-preserving chunker, heading-plus-body
indexed text, history-aware query builder, cosine retriever and evaluation harness.
The model's trained query prefix is applied to queries only. Both models use
L2-normalized vectors, CPU ONNX with four threads, exact pinned model files and
a 512-token window. The [BGE model card](https://huggingface.co/BAAI/bge-base-en-v1.5)
documents the prefix, sequence limit and model dimensions.

There are **62 E.V questions** (43 answerable, including 13 critical) and **15
Cited questions** (10 answerable). The combined total is 77; it must not be
reported as 77 E.V questions. Unknown questions are included in score-separation
analysis, but no answer or refusal was generated. These existing sets have
already informed development and are not an independent held-out test.

The 12 configurations are two models by three word-size settings by two corpora.
Only chunk-size constants change in the isolated research process; citation
boundaries remain intact. This is a word-size sensitivity experiment, not the
proposed token-aware chunker experiment. Exact token counts were checked after
headings, query prefixes and special tokens; no tested input exceeded 512.

Run [compare-local-embeddings.py](../../scripts/compare-local-embeddings.py)
with the matching Cited checkout and explicit local BGE small/base snapshots.
`--help` lists the required paths. The script verifies all five model file hashes
before loading and blocks network connections. It requires the existing pinned
Cited Python runtime; it does not install dependencies. No model API key or paid
call is needed.

The [machine-readable results](evidence/2026-09-08-embedding-comparison.json)
retain every case's expected section, rank, retrieved sections, source-code and
corpus digests, model revisions/hashes, package versions and measurements. Timings
are local Windows x86_64 CPU observations after one warm-up: three single-query
passes, alternating question order. They are not Vercel cold starts, production
latency guarantees or statistically independent benchmark trials. Query vectors
are reused across chunk settings; corpus vectors are rebuilt for each setting.

## E.V results

Top-4 is the count of answerable questions whose labelled expected section appears
in the first four chunks. It is not multi-label recall or proof that every answer
claim is supported. MRR@4 uses reciprocal expected-section rank, with zero for a
miss. All six E.V runs retrieve all 13 critical cases.

| Model | Target / overlap words | Chunks | Top-4 hits | Top-1 hits | MRR@4 | Maximum chunk tokens |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BGE small, current | 180 / 40 | 67 | 43/43 | 34/43 | 0.8740 | 327 |
| BGE small | 120 / 24 | 81 | 43/43 | 35/43 | 0.8818 | 218 |
| BGE small | 240 / 40 | 62 | 43/43 | 34/43 | 0.8682 | 419 |
| BGE base | 180 / 40 | 67 | 42/43 | 35/43 | 0.8818 | 327 |
| BGE base | 120 / 24 | 81 | 41/43 | 34/43 | 0.8624 | 218 |
| BGE base | 240 / 40 | 62 | 41/43 | 34/43 | 0.8663 | 419 |

With current chunks, BGE base loses the follow-up “And what technologies did he
use for that one?”: its expected section moves from fourth to outside the top
four. A higher average reciprocal rank does not compensate for losing a section
that generation needs. Other rank changes, including improvements and regressions,
are retained per case in the result file.

BGE small's query p50/p95 were approximately **6.3/8.2 ms**; base was approximately
**19/24.2 ms**. Maximum full E.V query length was 31 tokens. The answerable and
unanswerable cosine distributions overlap for both models. A single similarity
cutoff cannot perfectly decide answerability on this set.

## Cited results

| Model | Target / overlap words | Chunks | Top-4 hits | Top-1 hits | MRR@4 |
| --- | --- | ---: | ---: | ---: | ---: |
| BGE small, current | 180 / 40 | 10 | 10/10 | 7/10 | 0.8333 |
| BGE small | 120 / 24 | 11 | 10/10 | 8/10 | 0.8833 |
| BGE small | 240 / 40 | 10 | 10/10 | 7/10 | 0.8333 |
| BGE base | 180 / 40 | 10 | 10/10 | 10/10 | 1.0000 |
| BGE base | 120 / 24 | 11 | 10/10 | 10/10 | 1.0000 |
| BGE base | 240 / 40 | 10 | 10/10 | 10/10 | 1.0000 |

Cited benefits in top-1 ranking on this very small set, while both models already
return all expected sections in the top four. This justifies retaining base as a
candidate for Cited, not switching both products together. Its query p95 was
approximately 22.7 ms versus 7.7 ms for small. No generated-answer improvement,
held-out gain or deployed cost reduction has been established.

## What remains before a model change

Freeze unseen, human-labelled questions and evaluate retrieval and answer support
separately. Add the proposed token-aware chunk variants and any other candidate
only with its correct preprocessing. Test startup/memory on the intended host,
measure both products independently, and qualify the final prompt/model/index
combination with human answer review. Rebuild and version all vectors if the
embedding space or indexed text changes. E5 and managed embedding APIs were not
run in this experiment; the broader shortlist remains in the
[prompt and retrieval review](ev-prompt-and-retrieval-review.md).

## Frozen new-question check, 9 September 2026

Before viewing new results, the assistant froze [38 new questions and a selection
protocol](evidence/heldout-2026-09-09/protocol.json): 24 E.V (20 supported) and 14
Cited (10 supported). Expected headings were checked against the actual source
files, and exact normalized duplicates of the development questions were rejected.
This is assistant-authored standalone-question evidence, not independent human
labelling, a multi-turn qualification suite or a generated-answer review.

| Candidate | E.V top-4 / top-1 | Cited top-4 / top-1 |
| --- | --- | --- |
| BGE small, 180/40 words | 20/20 · 16/20 | 10/10 · 8/10 |
| BGE small, 120/24 words | 19/20 · 16/20 | 10/10 · 8/10 |
| BGE base, 180/40 words | 18/20 · 16/20 | 10/10 · 9/10 |

[Full results and per-question ranks](evidence/heldout-2026-09-09/result.json)
reinforce retaining small 180/40 for E.V. Neither alternative met the predeclared
promotion condition. Base's one extra Cited top-one hit does not establish better
answers or justify a shared model migration. No question or expected heading was
changed after observing the result. All full chunk/query inputs remained below
512 tokens; negative-question score ranges still overlap supported questions.

The six runs used the same pinned CPU snapshots and denied network access. There
were no paid calls. The generic comparison script now accepts `--ev-questions`,
`--cited-questions` and `--candidate-check` to reproduce this selection using the
question files beside the protocol and the previously documented model snapshots.
Human answer review, realistic follow-ups/adversarial source tests and target-host
qualification remain. Future tuning on these results makes this set development
evidence; it must not be described as a fresh unseen test again.
