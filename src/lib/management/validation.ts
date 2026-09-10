import type { Draft, WorkspaceMutation, WorkspaceState } from "./types";
const statuses = ["new", "investigating", "drafted", "closed"];
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
function text(v: unknown, max: number, min = 0): v is string { return typeof v === "string" && v.trim().length >= min && v.length <= max && !v.includes("\0"); }
function validDraft(v: unknown): v is Omit<Draft, "updatedAt"> {
  return object(v) && typeof v.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(v.id) &&
    text(v.title, 160, 1) && text(v.body, 20_000, 1) && text(v.provenance, 1000, 1) &&
    (v.gapKey === null || text(v.gapKey, 500, 1)) && ["draft", "ready_for_review"].includes(String(v.status));
}
export function parseMutation(v: unknown): WorkspaceMutation | null {
  if (!object(v) || !Number.isSafeInteger(v.revision) || (v.revision as number) < 0) return null;
  if (v.action === "save_draft" && validDraft(v.draft)) {
    const { id, title, body, provenance, gapKey, status } = v.draft;
    return { revision: v.revision as number, action: "save_draft", draft: { id, title, body, provenance, gapKey, status } };
  }
  if (v.action === "triage" && text(v.key, 500, 1) && !["__proto__", "prototype", "constructor"].includes(v.key) &&
    statuses.includes(String(v.status)) && text(v.note, 1000)) {
    return { revision: v.revision as number, action: "triage", key: v.key, status: v.status as "new", note: v.note };
  }
  return null;
}
export function isWorkspaceState(v: unknown): v is WorkspaceState {
  if (!object(v) || v.version !== 1 || !Number.isSafeInteger(v.revision) || (v.revision as number) < 0 ||
    !Array.isArray(v.drafts) || v.drafts.length > 100 || !object(v.triage) || Object.keys(v.triage).length > 200) return false;
  return v.drafts.every((d) => validDraft(d) && "updatedAt" in d && text(d.updatedAt, 40, 1)) &&
    new Set(v.drafts.map((d) => d.id)).size === v.drafts.length &&
    Object.entries(v.triage).every(([key, value]) => !["__proto__", "constructor", "prototype"].includes(key) &&
      text(key, 500, 1) && object(value) && statuses.includes(String(value.status)) && text(value.note, 1000) && text(value.updatedAt, 40, 1));
}
