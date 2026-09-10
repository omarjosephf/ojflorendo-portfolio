import type { AssistantResult } from "./types";

export type AnswerEvent = {
  version: 1;
  outcome: "answered" | "not_covered" | "policy_boundary";
  route: "primary" | "fallback" | "none";
  model: string | null;
  retrieved: string[];
  cited: string[];
  latencyMs: number;
  corpusSha256: string;
  promptSha256: string;
};
const keys = ["version", "outcome", "route", "model", "retrieved", "cited", "latencyMs", "corpusSha256", "promptSha256"];
const sha = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const sources = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 20 && new Set(v).size === v.length && v.every(s => typeof s === "string" && s.length > 0 && s.length <= 200 && !/[\u0000-\u001f]/.test(s));
export function parseAnswerEvent(value: unknown): AnswerEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== keys.length || !Object.keys(v).every(k => keys.includes(k)) || v.version !== 1 ||
    !["answered", "not_covered", "policy_boundary"].includes(String(v.outcome)) ||
    !["primary", "fallback", "none"].includes(String(v.route)) ||
    !(v.model === null || (typeof v.model === "string" && v.model.length > 0 && v.model.length <= 100 && !/[\u0000-\u001f]/.test(v.model))) ||
    ((v.route === "none") !== (v.model === null)) || !sources(v.retrieved) || !sources(v.cited) || !v.cited.every(s => (v.retrieved as string[]).includes(s)) ||
    !Number.isSafeInteger(v.latencyMs) || (v.latencyMs as number) < 0 || (v.latencyMs as number) > 600000 || !sha(v.corpusSha256) || !sha(v.promptSha256)) return null;
  if (v.outcome === "answered" ? !v.cited.length || v.route === "none" : v.cited.length > 0) return null;
  return v as AnswerEvent;
}
export function eventMatchesResult(event: AnswerEvent, result: AssistantResult): boolean {
  if (event.route !== (("modelRoute" in result && result.modelRoute) || "none")) return false;
  if (result.state === "answered") {
    const cited = [...new Set(result.citations.map(c => c.sourceId))];
    return event.outcome === "answered" && cited.length === event.cited.length && cited.every(s => s !== undefined && event.cited.includes(s));
  }
  return result.state === "not-covered" && event.outcome !== "answered" && event.cited.length === 0;
}
