export type Outcome = "answered" | "missing_content" | "retrieval_miss" | "provider_failure" | "policy_boundary";
export type Turn = {
  id: string; question: string; answer: string; outcome: Outcome;
  at: string; route: "primary" | "fallback" | "none";
  retrieved: string[]; cited: string[]; feedback: "helpful" | "unhelpful" | null;
  latencyMs: number | null;
};
export type Conversation = { id: string; guest: string; turns: Turn[] };
export type GapStatus = "new" | "investigating" | "drafted" | "closed";
export type Draft = {
  id: string; title: string; body: string; provenance: string;
  gapKey: string | null; status: "draft" | "ready_for_review"; updatedAt: string;
};
export type WorkspaceState = {
  version: 1; revision: number; drafts: Draft[];
  triage: Record<string, { status: GapStatus; note: string; updatedAt: string }>;
};
export type WorkspaceMutation =
  | { revision: number; action: "save_draft"; draft: Omit<Draft, "updatedAt"> }
  | { revision: number; action: "triage"; key: string; status: GapStatus; note: string };
export type CorpusChunk = { index: number; source: string; section: string | null; page: number | null; text: string; tokens: number; indexedSha256: string };
export type CorpusSnapshot = {
  schemaVersion: 1; corpusSha256: string; model: string; tokenizerSha256: string;
  tokenLimit: number; targetWords: number; overlapWords: number;
  generatedAt: string; chunks: CorpusChunk[];
};
