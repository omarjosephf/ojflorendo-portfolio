import { parseAnswerEvent, eventMatchesResult, type AnswerEvent } from "./answer-event";
import assistantPolicy from "../../../content/assistant-policy.json";
import { assistantCorpusSources } from "@/data/assistant-corpus";
import {
  ASSISTANT_HISTORY_LIMIT,
  ASSISTANT_INPUT_LIMIT,
  ASSISTANT_POLICY_IDS,
  ASSISTANT_PROXY_TIMEOUT_MS,
  ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT,
  isAssistantModelRoute,
  type AssistantCitation,
  type AssistantHistoryTurn,
  type AssistantModelRoute,
  type AssistantPolicyId,
  type AssistantResult,
} from "./types";

const ANSWER_LIMIT = 4_000;
const CITATION_LIMIT = 8;
const CITATION_QUOTE_LIMIT = 1_000;
const SOURCE_ID_LIMIT = 200;
const EVIDENCE_ID_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_LABEL_LIMIT = 80;
const SOURCE_LABELS_PER_TURN_LIMIT = 8;

export interface AssistantServiceConfig {
  readonly url: string;
  readonly secret: string;
}

export interface AssistantServiceRequestOptions {
  readonly signal?: AbortSignal;
  /** Server-only sink; diagnostics never become part of AssistantResult. */
  readonly onEvent?: (event: AnswerEvent) => void;
  /** Remaining proxy budget, never permission to exceed the nine-second cap. */
  readonly deadlineMs?: number;
}

function logConfigurationError(): void {
  console.error("[assistant] service configuration rejected", {
    category: "assistant_misconfigured",
  });
}

/** Read a complete, transport-safe backend configuration or fail closed. */
export function readServiceConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): AssistantServiceConfig | null {
  const url = env.ASSISTANT_SERVICE_URL?.trim();
  const secret = env.ASSISTANT_SERVICE_SECRET?.trim();

  if (!url && !secret) return null;
  if (!url || !secret) {
    logConfigurationError();
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    logConfigurationError();
    return null;
  }

  const isExactLocalHost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const isAllowedProtocol =
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" && isExactLocalHost);

  if (
    !isAllowedProtocol ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    logConfigurationError();
    return null;
  }

  return { url: parsed.origin, secret };
}

interface BackendCitation {
  readonly source_id: string;
  readonly evidence_id: string;
  readonly quote: string;
}

type BackendResponse =
  | {
      readonly version: 3;
      readonly state: "answered";
      readonly answer: string;
      readonly citations: readonly BackendCitation[];
      readonly model_route: AssistantModelRoute;
    }
  | {
      readonly version: 3;
      readonly state: "not-covered";
      readonly policy: string;
      readonly model_route: AssistantModelRoute | null;
    }
  | { readonly version: 3; readonly state: "unavailable" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isPolicyId(value: string): value is AssistantPolicyId {
  return (ASSISTANT_POLICY_IDS as readonly string[]).includes(value);
}

function policyText(policy: AssistantPolicyId): string {
  const configured = (assistantPolicy.responses as Record<string, unknown>)[policy];
  if (
    assistantPolicy.version === "portfolio-policy-v3" &&
    typeof configured === "string" &&
    configured.trim().length > 0 &&
    configured.length <= ANSWER_LIMIT
  ) {
    return configured.trim();
  }

  // This exact application-owned text remains safe if the checked-in policy
  // artifact is accidentally malformed.
  return "I can't answer that from the information I have. You can contact OJ directly.";
}

function unsupported(modelRoute: AssistantModelRoute): AssistantResult {
  return { state: "not-covered", answer: policyText("unsupported"), modelRoute };
}

function invalidAnsweredResponse(modelRoute: AssistantModelRoute): BackendResponse {
  return { version: 3, state: "answered", answer: "", citations: [], model_route: modelRoute };
}

function readBackendResponse(value: unknown): BackendResponse | null {
  if (!isRecord(value) || value.version !== 3) return null;

  if (value.state === "unavailable") {
    if (!hasOnlyKeys(value, ["version", "state"])) return null;
    return { version: 3, state: "unavailable" };
  }

  if (value.state === "not-covered") {
    if (!hasOnlyKeys(value, ["version", "state", "policy", "model_route"])) {
      return null;
    }
    if (value.model_route !== null && !isAssistantModelRoute(value.model_route)) return null;
    if (typeof value.policy !== "string" || value.policy.length > 64) return null;
    return { version: 3, state: "not-covered", policy: value.policy, model_route: value.model_route };
  }

  if (value.state !== "answered") return null;
  if (!hasOnlyKeys(value, ["version", "state", "answer", "citations", "model_route"])) {
    return null;
  }
  if (!isAssistantModelRoute(value.model_route)) return null;
  const modelRoute = value.model_route;
  if (
    typeof value.answer !== "string" ||
    value.answer.length > ANSWER_LIMIT ||
    value.answer.trim().length === 0 ||
    !Array.isArray(value.citations) ||
    value.citations.length < 1 ||
    value.citations.length > CITATION_LIMIT
  ) {
    return invalidAnsweredResponse(modelRoute);
  }

  const citations: BackendCitation[] = [];
  for (const valueCitation of value.citations) {
    if (!isRecord(valueCitation)) return invalidAnsweredResponse(modelRoute);
    if (!hasOnlyKeys(valueCitation, ["source_id", "evidence_id", "quote"])) {
      return invalidAnsweredResponse(modelRoute);
    }
    const { source_id: sourceId, evidence_id: evidenceId, quote } = valueCitation;
    if (
      typeof sourceId !== "string" ||
      sourceId.length < 1 ||
      sourceId.length > SOURCE_ID_LIMIT ||
      typeof evidenceId !== "string" ||
      !EVIDENCE_ID_PATTERN.test(evidenceId) ||
      typeof quote !== "string" ||
      quote.length > CITATION_QUOTE_LIMIT ||
      quote.trim().length === 0
    ) {
      return invalidAnsweredResponse(modelRoute);
    }
    citations.push({ source_id: sourceId, evidence_id: evidenceId, quote });
  }

  return {
    version: 3,
    state: "answered",
    answer: value.answer.trim(),
    citations,
    model_route: modelRoute,
  };
}

const corpusByPath = new Map(
  assistantCorpusSources.map((source) => [source.path, source]),
);

function mapCitations(
  citations: readonly BackendCitation[],
): AssistantCitation[] | null {
  const mapped: AssistantCitation[] = [];
  for (const citation of citations) {
    // Exact corpus-relative path match. Backend text never becomes a label or
    // URL and decorated/partial paths are deliberately rejected.
    const source = corpusByPath.get(citation.source_id);
    if (!source) return null;
    mapped.push({
      quote: citation.quote.trim(),
      label: source.label,
      href: source.publicUrl,
      sourceId: citation.source_id,
      evidenceId: citation.evidence_id,
    });
  }
  return mapped;
}

function cancelBody(response: Response): void {
  // Never await an untrusted stream's cancellation hook. Cancellation is best
  // effort and cannot be allowed to extend the request deadline.
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {
    // A nonstandard stream may throw before returning a cancellation promise.
  }
}

function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): void {
  try {
    void reader.cancel().catch(() => undefined);
  } catch {
    // Cancellation remains best effort at an already-failed boundary.
  }
}

/** Read response bytes incrementally so chunked bodies cannot evade the cap. */
async function readBoundedJson(
  response: Response,
  signal: AbortSignal,
): Promise<unknown | null> {
  if (!response.body) return null;

  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    /^\d+$/.test(declaredLength) &&
    Number(declaredLength) > ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT
  ) {
    cancelBody(response);
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const cancelOnAbort = () => {
    cancelReader(reader);
  };
  signal.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    while (true) {
      if (signal.aborted) throw new Error("aborted");
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error("aborted");
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > ASSISTANT_SERVICE_RESPONSE_BYTE_LIMIT) {
        cancelReader(reader);
        return null;
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    if (signal.aborted) throw new Error("aborted");
    return null;
  } finally {
    signal.removeEventListener("abort", cancelOnAbort);
    try {
      reader.releaseLock();
    } catch {
      // A canceled stream may already have released its reader.
    }
  }
}

function boundedDeadline(value: number | undefined): number {
  if (value === undefined) return ASSISTANT_PROXY_TIMEOUT_MS;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(ASSISTANT_PROXY_TIMEOUT_MS, Math.max(1, Math.floor(value)));
}

/** Ask the backend under a bounded, abortable, strictly validated wire-v3 contract. */
export async function askAssistantService(
  question: string,
  config: AssistantServiceConfig,
  history: readonly AssistantHistoryTurn[] = [],
  options: AssistantServiceRequestOptions = {},
): Promise<AssistantResult> {
  const deadlineMs = boundedDeadline(options.deadlineMs);
  if (deadlineMs === 0 || options.signal?.aborted) {
    return { state: "unavailable" };
  }

  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, deadlineMs);

  try {
    const response = await fetch(`${config.url}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Assistant-Secret": config.secret,
        "X-Assistant-Deadline-Ms": String(deadlineMs),
        ...(options.onEvent ? { "X-Assistant-Event": "1" } : {}),
      },
      body: JSON.stringify({
        question: question.trim().slice(0, ASSISTANT_INPUT_LIMIT),
        history: history.slice(-ASSISTANT_HISTORY_LIMIT).map((turn) => ({
          question: turn.question.trim().slice(0, ASSISTANT_INPUT_LIMIT),
          sources: turn.sources
            .slice(0, SOURCE_LABELS_PER_TURN_LIMIT)
            .map((source) => source.trim().slice(0, SOURCE_LABEL_LIMIT)),
        })),
      }),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });

    if (!response.ok) {
      cancelBody(response);
      console.warn("[assistant] backend status rejected", {
        category: "assistant_backend_error",
        status: response.status,
      });
      return { state: "unavailable" };
    }

    const raw = await readBoundedJson(response, controller.signal);
    if (controller.signal.aborted) return { state: "unavailable" };
    const body = readBackendResponse(raw);
    if (!body) {
      console.error("[assistant] backend response rejected", {
        category: "assistant_invalid_response",
      });
      return { state: "unavailable" };
    }

    const observed = (result: AssistantResult): AssistantResult => {
      const header = response.headers.get("X-Assistant-Event");
      if (options.onEvent && header && header.length <= 8000 && /^[A-Za-z0-9_-]+$/.test(header)) {
        try {
          const event = parseAnswerEvent(JSON.parse(Buffer.from(header, "base64url").toString("utf8")));
          if (event && eventMatchesResult(event, result) && [...event.retrieved, ...event.cited].every(s => corpusByPath.has(s)) &&
            (body.state !== "not-covered" || (isPolicyId(body.policy) && event.outcome === (body.policy === "unsupported" ? "not_covered" : "policy_boundary")))) options.onEvent(event);
        } catch { /* Missing or invalid diagnostics do not invent an observation. */ }
      }
      return result;
    };
    if (body.state === "unavailable") return { state: "unavailable" };

    if (body.state === "not-covered") {
      const policy = isPolicyId(body.policy) ? body.policy : "unsupported";
      return observed({
        state: "not-covered",
        answer: policyText(policy),
        ...(body.model_route === null ? {} : { modelRoute: body.model_route }),
      });
    }

    const citations = mapCitations(body.citations);
    if (!body.answer || !citations || controller.signal.aborted) {
      console.error("[assistant] unsafe answered response rejected", {
        category: "assistant_invalid_response",
      });
      return unsupported(body.model_route);
    }

    return observed({ state: "answered", answer: body.answer, citations, modelRoute: body.model_route });
  } catch {
    console.warn("[assistant] backend request failed", {
      category: timedOut
        ? "assistant_timeout"
        : controller.signal.aborted
          ? "assistant_request_aborted"
          : "assistant_unreachable",
    });
    return { state: "unavailable" };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
