import type { CorpusSnapshot } from "./types";

/** What the read-only RAG configuration view needs: settings and chunk sizes, never chunk text. */
export type RagSnapshot = Omit<CorpusSnapshot, "chunks"> & { chunks: { tokens: number }[] };

export function ragSnapshot(source: CorpusSnapshot): RagSnapshot {
  const { chunks, ...settings } = source;
  return { ...settings, chunks: chunks.map((chunk) => ({ tokens: chunk.tokens })) };
}

const count = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0;
const text = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 200;
/** Client-side shape check before an owner API response is rendered. */
export function isRagSnapshot(value: unknown): value is RagSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 1 && text(v.corpusSha256) && text(v.model) && text(v.tokenizerSha256) && text(v.generatedAt) &&
    !Number.isNaN(Date.parse(String(v.generatedAt))) && count(v.tokenLimit) && count(v.targetWords) && count(v.overlapWords) &&
    Array.isArray(v.chunks) && v.chunks.length > 0 && v.chunks.length <= 10000 &&
    v.chunks.every((chunk) => !!chunk && typeof chunk === "object" && count((chunk as Record<string, unknown>).tokens));
}
