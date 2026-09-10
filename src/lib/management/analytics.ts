import type { Conversation, Outcome, Turn } from "./types";

export const outcomeLabels: Record<Outcome, string> = {
  answered: "Answered", missing_content: "Missing information", retrieval_miss: "Retrieval needs review",
  provider_failure: "Service unavailable", policy_boundary: "Privacy boundary",
};
export function questionKey(question: string): string {
  return question.normalize("NFKC").toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
export function windowStart(anchor: string, days: number): number {
  const end = new Date(anchor);
  return Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - days + 1);
}
export function selectWindow(conversations: Conversation[], anchor: string, days: number): Conversation[] {
  const start = windowStart(anchor, days), end = Date.parse(anchor);
  return conversations.map((c) => ({ ...c, turns: c.turns.filter((t) => Date.parse(t.at) >= start && Date.parse(t.at) <= end) }))
    .filter((c) => c.turns.length > 0).sort((a, b) => Date.parse(b.turns.at(-1)!.at) - Date.parse(a.turns.at(-1)!.at));
}
export type QuestionGroup = { key: string; question: string; count: number; sessions: number; conversationIds: string[]; outcomes: Outcome[] };
export function groupQuestions(conversations: Conversation[], gapsOnly = false): QuestionGroup[] {
  const groups = new Map<string, { question: string; turns: Turn[]; sessions: Set<string> }>();
  for (const c of conversations) for (const t of c.turns) {
    if (gapsOnly && t.outcome === "answered") continue;
    const key = questionKey(t.question), group = groups.get(key) ?? { question: t.question, turns: [], sessions: new Set<string>() };
    group.turns.push(t); group.sessions.add(c.id); groups.set(key, group);
  }
  return [...groups].map(([key, g]) => ({ key, question: g.question, count: g.turns.length, sessions: g.sessions.size,
    conversationIds: [...g.sessions], outcomes: [...new Set(g.turns.map((t) => t.outcome))] }))
    .sort((a, b) => b.count - a.count || a.question.localeCompare(b.question));
}
export function summarize(conversations: Conversation[], anchor: string, days: number, sources: string[]) {
  const selected = selectWindow(conversations, anchor, days), turns = selected.flatMap((c) => c.turns);
  const answered = turns.filter((t) => t.outcome === "answered").length;
  const feedback = turns.filter((t) => t.feedback !== null);
  const sourceSignals = sources.map((source) => ({ source,
    retrieved: turns.filter((t) => t.retrieved.includes(source)).length,
    cited: turns.filter((t) => t.cited.includes(source)).length,
    helpful: turns.filter((t) => t.cited.includes(source) && t.feedback === "helpful").length,
    rated: turns.filter((t) => t.cited.includes(source) && t.feedback !== null).length,
  })).sort((a, b) => b.cited - a.cited || b.retrieved - a.retrieved || a.source.localeCompare(b.source));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(windowStart(anchor, days) + index * 86_400_000).toISOString().slice(0, 10);
    const dayTurns = turns.filter((t) => t.at.startsWith(date));
    return { date, answered: dayTurns.filter((t) => t.outcome === "answered").length, total: dayTurns.length };
  });
  return { selected, turns, answered, feedback, sourceSignals, daily,
    sessions: selected.length, guests: new Set(selected.map((c) => c.guest)).size,
    gaps: groupQuestions(selected, true), questions: groupQuestions(selected),
    helpful: feedback.filter((t) => t.feedback === "helpful").length,
    fallback: turns.filter((t) => t.route === "fallback").length,
  };
}
