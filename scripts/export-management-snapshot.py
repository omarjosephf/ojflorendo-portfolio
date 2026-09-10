"""Export canonical Cited chunks for the private management preview.

Run with the Cited environment on PYTHONPATH and an explicit cached tokenizer.
No model inference, network request, or private input is performed.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from assistant.chunking import TARGET_WORDS, OVERLAP_WORDS, chunk_passages
from assistant.corpus_checksum import corpus_checksum
from assistant.documents import read_corpus
from tokenizers import Tokenizer

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--corpus", type=Path, default=Path("content/assistant"))
parser.add_argument("--tokenizer", type=Path, required=True)
parser.add_argument("--output", type=Path, default=Path("src/data/management-corpus.generated.json"))
args = parser.parse_args()
tokenizer = Tokenizer.from_file(str(args.tokenizer))
tokenizer.no_truncation()
tokenizer.no_padding()
chunks = chunk_passages(read_corpus(args.corpus))
records = [{"index": c.index, "source": c.source, "section": c.section, "page": c.page,
            "text": c.text, "tokens": len(tokenizer.encode(c.indexed_text()).ids),
            "indexedSha256": hashlib.sha256(c.indexed_text().encode()).hexdigest()} for c in chunks]
if any(c["tokens"] > 512 for c in records):
    raise SystemExit("Chunk exceeds the pinned model window; snapshot not written")
result = {"schemaVersion": 1, "corpusSha256": corpus_checksum(args.corpus),
          "model": "BAAI/bge-small-en-v1.5", "tokenizerSha256": hashlib.sha256(args.tokenizer.read_bytes()).hexdigest(),
          "tokenLimit": 512, "targetWords": TARGET_WORDS, "overlapWords": OVERLAP_WORDS,
          "generatedAt": datetime.now(timezone.utc).isoformat(), "chunks": records}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"chunks": len(records), "maxTokens": max(c["tokens"] for c in records), "corpusSha256": result["corpusSha256"]}))
