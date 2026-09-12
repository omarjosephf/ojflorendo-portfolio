#!/usr/bin/env python3
"""Record what the retrieval gate scores, and how close each question is to failing.

The gate in `assistant.cli eval` reports a hit rate: whether each expected section
reached the top-k. It does not report *by how much*. A question sitting at rank 4
with a thousandth of a point of headroom and one sitting at rank 1 with a
comfortable lead both score as a pass, and the first is a cliff nobody can see.

This writes both: the true corpus-wide rank of every expected section, and the
margin before it would drop out of the top-k. The result is committed as evidence
so the published numbers can be checked against the corpus they describe, rather
than reconstructed from timestamps after the fact.

Diagnostic only. It sets no threshold and gates nothing; `release_evaluation.py`
remains the sole authority on pass and fail.

Offline and free: pinned CPU ONNX embeddings, no provider call, no API key.

Usage:
    python scripts/measure-retrieval-ranks.py \\
        --backend-directory ../cited \\
        --output docs/reviews/evidence/2026-09-12-portfolio-retrieval.json
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_SOURCES = [
    "chunking.py",
    "documents.py",
    "embedding.py",
    "answering.py",
    "evaluation.py",
    "retrieval.py",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-directory", required=True, type=Path)
    parser.add_argument("--corpus", type=Path, default=Path("content/assistant"))
    parser.add_argument(
        "--questions", type=Path, default=Path("content/assistant-eval/questions.toml")
    )
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    # The measurement must describe the pinned local model, never a fresh download.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    sys.dont_write_bytecode = True

    def deny_network(event: str, arguments: object) -> None:
        if event in {"socket.connect", "socket.getaddrinfo", "socket.connect_ex"}:
            raise RuntimeError("This measurement forbids network access")

    sys.addaudithook(deny_network)
    sys.path.insert(0, str(args.backend_directory.resolve() / "src"))

    from assistant.answering import retrieval_query
    from assistant.chunking import chunk_passages
    from assistant.corpus_checksum import corpus_checksum
    from assistant.documents import read_corpus
    from assistant.embedding import QUERY_PREFIX, MODEL_NAME, FastEmbedEmbedder
    from assistant.evaluation import load_questions
    from assistant.retrieval import InMemoryRetriever

    chunks = chunk_passages(read_corpus(args.corpus))
    retriever = InMemoryRetriever(chunks, FastEmbedEmbedder())
    questions = load_questions(args.questions)
    k = args.top_k

    checksum = corpus_checksum(args.corpus)
    if isinstance(checksum, tuple):
        checksum = checksum[0]

    measurements = []
    for q in questions:
        results = retriever.search(retrieval_query(q.text, q.history), top_k=len(chunks))
        ranked = [
            {"rank": i, "source": r.chunk.source, "section": r.chunk.section, "score": float(r.score)}
            for i, r in enumerate(results, 1)
        ]
        row: dict = {
            "question": q.text,
            "answerable": q.answerable,
            "critical": q.critical,
            "expects": q.expects,
            "topK": [
                {"section": r["section"], "source": r["source"], "score": r["score"]}
                for r in ranked[:k]
            ],
        }
        if q.answerable:
            expected = [r for r in ranked if r["section"] == q.expects]
            best = expected[0]
            row["expectedRank"] = best["rank"]
            row["expectedScore"] = best["score"]
            row["hit"] = best["rank"] <= k
            # The first chunk below the cutoff that is not the expected section:
            # the one that would take its place if the ordering shifted.
            rival = next(
                (r for r in ranked[k:] if r["section"] != q.expects), None
            )
            row["rival"] = (
                {"section": rival["section"], "source": rival["source"], "score": rival["score"]}
                if rival
                else None
            )
            # Positive: headroom before the expected section leaves the top-k.
            # Negative: how far it has to climb to enter it.
            row["margin"] = (
                best["score"] - ranked[k - 1]["score"]
                if best["rank"] > k
                else (best["score"] - rival["score"] if rival else None)
            )
        measurements.append(row)

    answerable = [m for m in measurements if m["answerable"]]
    critical = [m for m in answerable if m["critical"]]
    margins = [m["margin"] for m in answerable if m.get("margin") is not None and m["hit"]]
    crit_margins = [m["margin"] for m in critical if m.get("margin") is not None and m["hit"]]

    report = {
        "schemaVersion": 1,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "method": (
            "Pinned CPU ONNX embeddings, runtime chunker and InMemoryRetriever, ranked "
            "over the whole corpus. Retrieval only: no answer generation, no provider "
            "call, no human review. Diagnostic; sets no threshold and gates nothing."
        ),
        "model": MODEL_NAME,
        "queryPrefix": QUERY_PREFIX,
        "topK": k,
        "chunkCount": len(chunks),
        "corpusSha256": checksum,
        "questionFileSha256": hashlib.sha256(args.questions.read_bytes()).hexdigest(),
        "platform": {
            "system": platform.system(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "versions": {
            k2: importlib.metadata.version(k2)
            for k2 in ["fastembed", "onnxruntime", "numpy", "tokenizers"]
        },
        "backendSourceSha256": {
            f: hashlib.sha256(
                (args.backend_directory / "src/assistant" / f).read_bytes()
            ).hexdigest()
            for f in BACKEND_SOURCES
        },
        "summary": {
            "questions": len(measurements),
            "answerable": len(answerable),
            "hits": sum(1 for m in answerable if m["hit"]),
            "top1": sum(1 for m in answerable if m["expectedRank"] == 1),
            "criticalHits": sum(1 for m in critical if m["hit"]),
            "criticalTotal": len(critical),
            "tightestMargin": min(margins) if margins else None,
            "tightestCriticalMargin": min(crit_margins) if crit_margins else None,
        },
        "measurements": measurements,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    # LF explicitly: .gitattributes stores this repository with LF, and ADR-0000
    # records what a CRLF rendering cost the last time a digest was taken of a
    # file whose line endings depended on the machine that wrote it.
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n"
    )

    s = report["summary"]
    print(f"corpus {checksum[:12]}  {s['chunkCount'] if 'chunkCount' in s else report['chunkCount']} chunks  top-k {k}")
    print(f"  hits           {s['hits']}/{s['answerable']}")
    print(f"  top-1          {s['top1']}/{s['answerable']}")
    print(f"  critical core  {s['criticalHits']}/{s['criticalTotal']}")
    print(f"  tightest margin          {s['tightestMargin']:+.6f}")
    print(f"  tightest critical margin {s['tightestCriticalMargin']:+.6f}")
    print(f"\nWrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
