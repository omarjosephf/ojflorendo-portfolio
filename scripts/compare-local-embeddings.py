"""Offline, pinned BGE comparison using the actual Cited retrieval harness.

This measures section retrieval on existing development sets, not answer quality
or a held-out benchmark. No model-provider call or download is allowed.
Run with Cited's pinned runtime and local verified model snapshots.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import sys
from time import perf_counter
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-directory", required=True, type=Path)
    parser.add_argument("--small-snapshot", required=True, type=Path)
    parser.add_argument("--base-snapshot", required=True, type=Path)
    parser.add_argument("--portfolio-directory", type=Path, default=Path("."))
    parser.add_argument("--ev-questions", type=Path, help="Explicit question file; default is the existing development set")
    parser.add_argument("--cited-questions", type=Path, help="Explicit question file; default is the existing development set")
    parser.add_argument("--candidate-check", action="store_true", help="Compare only small 180/40, small 120/24 and base 180/40, as predeclared on 9 September")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    sys.dont_write_bytecode = True

    def deny_network(event, arguments):
        if event in {"socket.connect", "socket.getaddrinfo", "socket.connect_ex"}:
            raise RuntimeError("This benchmark forbids network access")

    sys.addaudithook(deny_network)
    sys.path.insert(0, str(args.backend_directory.resolve() / "src"))
    import numpy as np
    from fastembed import TextEmbedding
    from tokenizers import Tokenizer
    import assistant.chunking as chunker
    from assistant.answering import retrieval_query
    from assistant.corpus_checksum import corpus_checksum
    from assistant.documents import read_corpus
    from assistant.embedding import QUERY_PREFIX
    from assistant.evaluation import load_questions, evaluate_retrieval
    from assistant.retrieval import InMemoryRetriever

    COMMON = {
        "tokenizer.json": "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66",
        "special_tokens_map.json": "5d5b662e421ea9fac075174bb0688ee0d9431699900b90662acd44b2a350503a",
    }
    MODELS = [
        {
            "name": "BAAI/bge-small-en-v1.5",
            "dimensions": 384,
            "repository": "qdrant/bge-small-en-v1.5-onnx-q",
            "revision": "52398278842ec682c6f32300af41344b1c0b0bb2",
            "snapshot": args.small_snapshot,
            "files": {
                **COMMON,
                "model_optimized.onnx": "51f1bd0addd6e859e42c2c8021a5e5461385bb676a649f4b269aa445449f2431",
                "config.json": "13582bcf2effc85b7bf3d3f5532e686bc1c9ce86bb009d10f0ec33cbe92299dd",
                "tokenizer_config.json": "0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53",
            },
        },
        {
            "name": "BAAI/bge-base-en-v1.5",
            "dimensions": 768,
            "repository": "qdrant/bge-base-en-v1.5-onnx-q",
            "revision": "738cad1c108e2f23649db9e44b2eab988626493b",
            "snapshot": args.base_snapshot,
            "files": {
                **COMMON,
                "model_optimized.onnx": "4e556722bc4f65716c544c8a931f1e90fb3f866e5741fd93a96f051d673339c7",
                "config.json": "86f84a5285de7f1ee673f712387219ef1e261ec27dcd870e793a80f9da1aaa3b",
                "tokenizer_config.json": "0b29c7bfc889e53b36d9dd3e686dd4300f6525110eaa98c76a5dafceb2029f53",
            },
        },
    ]

    class OfflineEmbedder:
        def __init__(self, spec):
            self.dimensions = spec["dimensions"]
            self.model = TextEmbedding(
                model_name=spec["name"],
                specific_model_path=str(spec["snapshot"].resolve()),
                cache_dir=str(spec["snapshot"].resolve()),
                local_files_only=True,
                threads=4,
                providers=["CPUExecutionProvider"],
                cuda=False,
            )
            self.queries = {}

        def encode(self, texts):
            matrix = np.asarray(
                list(self.model.embed(texts, batch_size=32)), dtype=np.float32
            )
            if matrix.shape != (len(texts), self.dimensions):
                raise ValueError("Unexpected embedding dimensions")
            matrix = matrix / np.maximum(
                np.linalg.norm(matrix, axis=1, keepdims=True), 1e-12
            )
            if not np.isfinite(matrix).all():
                raise ValueError("Non-finite embedding")
            return matrix.astype(np.float32, copy=False)

        def embed_passages(self, texts):
            return self.encode(texts)

        def embed_query(self, text):
            # Precomputed using the exact runtime query, including follow-up history.
            return self.queries[text]

    sets = [
        (
            "ev",
            args.portfolio_directory / "content/assistant",
            args.ev_questions or args.portfolio_directory / "content/assistant-eval/questions.toml",
        ),
        (
            "cited",
            args.backend_directory / "content",
            args.cited_questions or args.backend_directory / "eval/questions.toml",
        ),
    ]
    result = {
        "schemaVersion": 1,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "method": "Pinned CPU ONNX models, runtime section-preserving chunker and retrieval harness; top-k 4; no answer generation. Question-file digests and scope are recorded separately; no answer-quality or human-review claims.",
        "questionSetScope": "Explicit question files; inspect their frozen protocol and authorship" if args.ev_questions or args.cited_questions else "Existing development sets",
        "candidateCheck": args.candidate_check,
        "threads": 4,
        "queryTimingPasses": 3,
        "queryPrefix": QUERY_PREFIX,
        "platform": {
            "system": platform.system(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        },
        "versions": {
            k: importlib.metadata.version(k)
            for k in ["fastembed", "onnxruntime", "numpy", "tokenizers"]
        },
        "backendSourceSha256": {
            f: hashlib.sha256(
                (args.backend_directory / "src/assistant" / f).read_bytes()
            ).hexdigest()
            for f in [
                "chunking.py",
                "documents.py",
                "embedding.py",
                "answering.py",
                "evaluation.py",
                "retrieval.py",
            ]
        },
        "models": [],
        "runs": [],
    }
    for spec in MODELS:
        file_evidence = {}
        for name, expected in spec["files"].items():
            raw = (spec["snapshot"] / name).read_bytes()
            actual = hashlib.sha256(raw).hexdigest()
            if actual != expected:
                raise ValueError(f"Unverified model file: {spec['name']} / {name}")
            file_evidence[name] = {"sha256": actual, "bytes": len(raw)}
        token = Tokenizer.from_file(str(spec["snapshot"] / "tokenizer.json"))
        token.no_truncation()
        token.no_padding()
        start = perf_counter()
        embedder = OfflineEmbedder(spec)
        load_ms = (perf_counter() - start) * 1000
        embedder.encode([QUERY_PREFIX + "What does this assistant do?"])
        model_evidence = {
            k: spec[k] for k in ["name", "dimensions", "repository", "revision"]
        }
        model_evidence.update({"files": file_evidence, "loadMs": load_ms})
        result["models"].append(model_evidence)
        for label, corpus, question_path in sets:
            questions = load_questions(question_path)
            passages = read_corpus(corpus)
            if not passages:
                raise ValueError(f"No passages found for {label}: {corpus}")
            queries = list(
                dict.fromkeys(retrieval_query(q.text, q.history) for q in questions)
            )
            max_query = max(len(token.encode(QUERY_PREFIX + q).ids) for q in queries)
            if max_query > 512:
                raise ValueError("Full query input exceeds model token window")
            timings = []
            for trial in range(3):
                order = queries if trial % 2 == 0 else list(reversed(queries))
                for query in order:
                    start = perf_counter()
                    vector = embedder.encode([QUERY_PREFIX + query])[0]
                    timings.append((perf_counter() - start) * 1000)
                    if query in embedder.queries and not np.allclose(
                        embedder.queries[query], vector, atol=1e-6
                    ):
                        raise ValueError("Repeated query vector changed")
                    embedder.queries[query] = vector
            # A word-size sensitivity experiment, not a new token-aware chunker.
            for target, overlap in [(180, 40), (120, 24), (240, 40)]:
                if args.candidate_check and (target == 240 or (spec["name"] == "BAAI/bge-base-en-v1.5" and target != 180)):
                    continue
                chunker.TARGET_WORDS, chunker.OVERLAP_WORDS = target, overlap
                chunks = chunker.chunk_passages(passages)
                indexed = [c.indexed_text() for c in chunks]
                token_lengths = [len(token.encode(t).ids) for t in indexed]
                if max(token_lengths) > 512:
                    raise ValueError("Indexed input exceeds model token window")
                start = perf_counter()
                retriever = InMemoryRetriever(chunks, embedder)
                index_ms = (perf_counter() - start) * 1000
                report = evaluate_retrieval(retriever, questions, top_k=4)
                outcomes = [
                    {
                        "question": o.question.text,
                        "expected": o.question.expects,
                        "answerable": o.question.answerable,
                        "critical": o.question.critical,
                        "rank": o.rank,
                        "topScore": o.top_score,
                        "retrieved": list(o.retrieved),
                    }
                    for o in report.outcomes
                ]
                row = {
                    "dataset": label,
                    "model": spec["name"],
                    "dimensions": spec["dimensions"],
                    "targetWords": target,
                    "overlapWords": overlap,
                    "chunks": len(chunks),
                    "corpusSha256": corpus_checksum(corpus),
                    "questionFileSha256": hashlib.sha256(
                        question_path.read_bytes()
                    ).hexdigest(),
                    "indexedTextSha256": hashlib.sha256(
                        json.dumps(indexed, ensure_ascii=False).encode()
                    ).hexdigest(),
                    "questions": len(questions),
                    "answerable": len(report.answerable),
                    "critical": len(report.critical),
                    "top4Hits": sum(o.hit for o in report.answerable),
                    "top1Hits": sum(o.top_1 for o in report.answerable),
                    "criticalHits": sum(o.hit for o in report.critical),
                    "mrrAt4": float(
                        np.mean(
                            [1 / o.rank if o.rank else 0 for o in report.answerable]
                        )
                    ),
                    "scoreSeparation": report.score_separation,
                    "maxChunkTokens": max(token_lengths),
                    "maxQueryTokens": max_query,
                    "indexMs": index_ms,
                    "queryP50Ms": float(np.percentile(timings, 50)),
                    "queryP95Ms": float(np.percentile(timings, 95)),
                    "outcomes": outcomes,
                }
                result["runs"].append(row)
                print(
                    json.dumps({k: v for k, v in row.items() if k != "outcomes"}),
                    flush=True,
                )
        del embedder
    chunker.TARGET_WORDS, chunker.OVERLAP_WORDS = 180, 40
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
