import policy from "../../../content/assistant-policy.json";
import { assistantCorpusSources } from "@/data/assistant-corpus";
import { screenQuestion } from "./guard";
import {
  ASSISTANT_HISTORY_LIMIT,
  ASSISTANT_INPUT_LIMIT,
  isAssistantModelRoute,
  type AssistantHistoryTurn,
  type AssistantResult,
} from "./types";

export const ASSISTANT_SESSION_KEY = "oj.smart-assistant.session.v1";
export const ASSISTANT_SESSION_VERSION = 1;
export const ASSISTANT_EXCHANGE_LIMIT = 20;
export const ASSISTANT_SESSION_BYTE_LIMIT = 32 * 1024;
export const ASSISTANT_RESPONSE_BYTE_LIMIT = 48 * 1024;

const ANSWER_LIMIT = 4_000;
const CITATION_LIMIT = 8;
const CITATION_QUOTE_LIMIT = 1_000;
const CITATION_LABEL_LIMIT = 80;

export interface AssistantExchange {
  readonly id: number;
  readonly question: string;
  readonly result: AssistantResult | null;
}

export interface AssistantSessionSnapshot {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly exchanges: readonly AssistantExchange[];
}

interface StoredSession {
  readonly version: typeof ASSISTANT_SESSION_VERSION;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly exchanges: readonly StoredExchange[];
}

interface StoredExchange {
  readonly question: string;
  readonly result: AssistantResult;
}

const allowedCitationLinks = new Map(
  assistantCorpusSources
    .filter(
      (source): source is typeof source & { readonly publicUrl: string } =>
        source.publicUrl !== null,
    )
    .map((source) => [`${source.label}\n${source.publicUrl}`, source.publicUrl]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  maximum: number,
  allowEmpty = false,
): string | null {
  if (typeof value !== "string" || value.length > maximum) return null;
  const trimmed = value.trim();
  return trimmed || allowEmpty ? trimmed : null;
}

function readTimestamp(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
    ? value
    : null;
}

function parseCitation(value: unknown) {
  if (!isRecord(value)) return null;
  const quote = readString(value.quote, CITATION_QUOTE_LIMIT);
  const label = readString(value.label, CITATION_LABEL_LIMIT);
  if (!quote) return null;
  if (value.sourceId !== undefined || value.evidenceId !== undefined) {
    if (typeof value.sourceId !== "string" || value.sourceId.length > 200 ||
        typeof value.evidenceId !== "string" || !/^[a-f0-9]{64}$/.test(value.evidenceId)) return null;
    const source = assistantCorpusSources.find((candidate) => candidate.path === value.sourceId);
    if (!source) return null;
    return { quote, label: source.label, href: source.publicUrl,
      sourceId: source.path, evidenceId: value.evidenceId } as const;
  }
  if (!label) return null;

  const href =
    typeof value.href === "string"
      ? (allowedCitationLinks.get(`${label}\n${value.href}`) ?? null)
      : null;

  return { quote, label, href } as const;
}

/**
 * Validate an untrusted result from either the API or tab storage.
 *
 * The same parser protects both boundaries. Citation URLs survive only when
 * their source ID resolves to the corpus, or a legacy label/URL pair is an
 * exact member of the checked-in corpus allowlist. Stored policy prose must
 * match application-owned copy; otherwise it becomes the fixed fallback.
 */
export function parseAssistantResult(value: unknown): AssistantResult | null {
  if (!isRecord(value) || typeof value.state !== "string") return null;

  if (value.state === "unavailable") return { state: "unavailable" };

  // Old tab records have no route. Preserve that absence instead of attributing
  // historical responses to the newly configured primary model.
  if (value.modelRoute !== undefined && !isAssistantModelRoute(value.modelRoute)) return null;
  const route = isAssistantModelRoute(value.modelRoute) ? { modelRoute: value.modelRoute } : {};

  const answer = readString(value.answer, ANSWER_LIMIT);
  if (!answer) return null;

  if (value.state === "not-covered") {
    const fixedAnswer = Object.values(policy.responses).includes(answer)
      ? answer : policy.responses.unsupported;
    return { state: "not-covered", answer: fixedAnswer, ...route };
  }

  if (value.state !== "answered" || !Array.isArray(value.citations)) return null;
  if (
    value.citations.length === 0 ||
    value.citations.length > CITATION_LIMIT
  ) {
    return null;
  }

  const citations = value.citations.map(parseCitation);
  if (citations.some((citation) => citation === null)) return null;

  return {
    state: "answered",
    answer,
    citations: citations.filter((citation) => citation !== null),
    ...route,
  };
}

/** Bound the response bytes before JSON parsing, including chunked responses. */
export async function readAssistantResponse(response: Response): Promise<AssistantResult | null> {
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength === 0) continue;
      size += value.byteLength;
      if (size > ASSISTANT_RESPONSE_BYTE_LIMIT) {
        void reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return parseAssistantResult(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function parseStoredExchange(
  value: unknown,
  id: number,
): AssistantExchange | null {
  if (!isRecord(value)) return null;
  const question = readString(value.question, ASSISTANT_INPUT_LIMIT);
  const result = parseAssistantResult(value.result);
  if (!question || !result || screenQuestion(question)) return null;
  return { id, question, result };
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** Parse a bounded versioned tab record. Invalid entries are discarded. */
export function parseAssistantSession(
  raw: string,
): AssistantSessionSnapshot | null {
  if (byteLength(raw) > ASSISTANT_SESSION_BYTE_LIMIT) return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(value) || value.version !== ASSISTANT_SESSION_VERSION) {
    return null;
  }
  const createdAt = readTimestamp(value.createdAt);
  const updatedAt = readTimestamp(value.updatedAt);
  if (!createdAt || !updatedAt || updatedAt < createdAt || !Array.isArray(value.exchanges)) return null;

  const parsedExchanges = value.exchanges
    .slice(-ASSISTANT_EXCHANGE_LIMIT)
    .map((exchange, index) => parseStoredExchange(exchange, index))
    .filter((exchange): exchange is AssistantExchange => exchange !== null);
  const exchanges = parsedExchanges.map((exchange, id) => ({ ...exchange, id }));

  return { createdAt, updatedAt, exchanges };
}

/**
 * Load the tab record. A bad record is removed rather than partially trusted.
 * Storage exceptions are reported to the caller so it can stay in memory.
 */
export function loadAssistantSession(
  storage: Pick<Storage, "getItem" | "removeItem">,
): AssistantSessionSnapshot | null {
  const raw = storage.getItem(ASSISTANT_SESSION_KEY);
  if (raw === null) return null;
  const parsed = parseAssistantSession(raw);
  if (parsed) return parsed;
  storage.removeItem(ASSISTANT_SESSION_KEY);
  throw new Error("Invalid assistant session");
}

function completedForStorage(
  exchanges: readonly AssistantExchange[],
): StoredExchange[] {
  return exchanges
    .filter(
      (exchange): exchange is AssistantExchange & { result: AssistantResult } =>
        exchange.result !== null && exchange.result.state !== "blocked",
    )
    .slice(-ASSISTANT_EXCHANGE_LIMIT)
    .flatMap((exchange) => {
      const question = readString(exchange.question, ASSISTANT_INPUT_LIMIT);
      const result = parseAssistantResult(exchange.result);
      return question && !screenQuestion(question) && result
        ? [{ question, result }]
        : [];
    });
}

/**
 * Save only completed, non-sensitive exchanges. When bytes exceed the fixed
 * cap, remove the oldest whole exchange until the record fits.
 */
export function saveAssistantSession(
  storage: Pick<Storage, "setItem" | "removeItem">,
  exchanges: readonly AssistantExchange[],
  createdAt: number,
  updatedAt = Date.now(),
): void {
  const completed = completedForStorage(exchanges);
  if (completed.length === 0) {
    storage.removeItem(ASSISTANT_SESSION_KEY);
    return;
  }

  let record: StoredSession = {
    version: ASSISTANT_SESSION_VERSION,
    createdAt,
    updatedAt,
    exchanges: completed,
  };
  let serialized = JSON.stringify(record);

  while (
    byteLength(serialized) > ASSISTANT_SESSION_BYTE_LIMIT &&
    record.exchanges.length > 0
  ) {
    record = { ...record, exchanges: record.exchanges.slice(1) };
    serialized = JSON.stringify(record);
  }

  if (record.exchanges.length === 0) {
    storage.removeItem(ASSISTANT_SESSION_KEY);
    return;
  }
  storage.setItem(ASSISTANT_SESSION_KEY, serialized);
}

export function historyFrom(
  exchanges: readonly AssistantExchange[],
): AssistantHistoryTurn[] {
  return exchanges
    .filter(
      (exchange) =>
        exchange.result?.state === "answered" ||
        exchange.result?.state === "not-covered",
    )
    .slice(-ASSISTANT_HISTORY_LIMIT)
    .map((exchange) => ({
      question: exchange.question,
      sources:
        exchange.result?.state === "answered"
          ? exchange.result.citations.map((citation) => citation.label)
          : [],
    }));
}
