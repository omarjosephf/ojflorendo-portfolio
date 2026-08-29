import { resolveCorpusSource } from "@/data/assistant-corpus";
import type { AssistantCitation, AssistantResult } from "./types";

/**
 * The server-to-server call to the assistant service.
 *
 * Server-only. Nothing here may be imported by a client component: it reads the
 * backend URL and the shared secret, and both must stay out of the browser
 * bundle. Keeping the call on this side is also what avoids a CSP change — the
 * browser only ever talks to this origin.
 *
 * Everything the backend returns is treated as untrusted. It is a service OJ
 * runs, but it is also the output of a language model, and the difference
 * between "our service" and "safe to render" is the whole point of validating
 * here rather than assuming.
 */

/**
 * How long to wait before giving up.
 *
 * The backend scales to zero, so a cold request pays machine boot plus ~1.8s of
 * measured startup on top of the model call. 20s is generous enough not to
 * abort a legitimate cold start and short enough that a hung request becomes an
 * honest "unavailable" rather than a spinner the visitor stares at.
 */
const REQUEST_TIMEOUT_MS = 20_000;

export interface AssistantServiceConfig {
  readonly url: string;
  readonly secret: string;
}

/**
 * Read and validate configuration.
 *
 * Returns `null` when the assistant is not configured, which is a supported
 * state rather than an error: it is how the feature is switched off, and how
 * every local checkout behaves by default. The route then reports `unavailable`
 * without attempting a call.
 *
 * Fails closed on a *partial* configuration. A URL with no secret would call the
 * service unauthenticated, which either fails or — worse, if the service were
 * ever misconfigured to allow it — succeeds while spending OJ's budget for
 * anyone who found the endpoint.
 */
export function readServiceConfig(
  env: NodeJS.ProcessEnv = process.env,
): AssistantServiceConfig | null {
  const url = env.ASSISTANT_SERVICE_URL?.trim();
  const secret = env.ASSISTANT_SERVICE_SECRET?.trim();

  if (!url && !secret) return null;

  if (!url || !secret) {
    // Loud, because the assistant is silently switched off until it is fixed,
    // and the cause is a single missing variable. No value is logged.
    console.error(
      "[assistant] MISCONFIGURED — the assistant is disabled. Set both " +
        "ASSISTANT_SERVICE_URL and ASSISTANT_SERVICE_SECRET, or neither.",
      {
        category: "assistant_misconfigured",
        hasUrl: Boolean(url),
        hasSecret: Boolean(secret),
      },
    );
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.error("[assistant] ASSISTANT_SERVICE_URL is not a valid URL", {
      category: "assistant_misconfigured",
    });
    return null;
  }

  // HTTPS only in production. The request carries a shared secret; sending it
  // in clear text would hand it to anything on the path. `localhost` is allowed
  // over HTTP so the integration can be exercised locally without a certificate.
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocal) {
    console.error("[assistant] ASSISTANT_SERVICE_URL must use HTTPS", {
      category: "assistant_misconfigured",
    });
    return null;
  }

  return { url: parsed.origin, secret };
}

/** Shape the backend promises. Validated rather than trusted. */
interface BackendResponse {
  answer: string;
  citations: { quote: string; source: string }[];
  grounded: boolean;
  refused: boolean;
}

function isBackendResponse(value: unknown): value is BackendResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;

  if (typeof body.answer !== "string") return false;
  if (typeof body.grounded !== "boolean") return false;
  if (typeof body.refused !== "boolean") return false;
  if (!Array.isArray(body.citations)) return false;

  return body.citations.every((citation) => {
    if (typeof citation !== "object" || citation === null) return false;
    const entry = citation as Record<string, unknown>;
    return typeof entry.quote === "string" && typeof entry.source === "string";
  });
}

/**
 * Map backend citations onto the corpus allowlist.
 *
 * The source string is **never** used to build a URL. It is looked up, and a
 * source with no entry keeps its text but loses its link. A citation the
 * allowlist does not recognise is a bug worth seeing rather than a link worth
 * following.
 *
 * Duplicates collapse in first-use order: a model that cites the same document
 * three times should produce one source, not three.
 */
function mapCitations(
  citations: readonly { quote: string; source: string }[],
): AssistantCitation[] {
  const seen = new Set<string>();
  const mapped: AssistantCitation[] = [];

  for (const { quote, source } of citations) {
    const resolved = resolveCorpusSource(source);
    const key = resolved?.path ?? source;
    if (seen.has(key)) continue;
    seen.add(key);

    mapped.push({
      quote,
      // Falls back to the raw source text only as a label, never as a link.
      label: resolved?.label ?? source,
      href: resolved?.publicUrl ?? null,
    });
  }

  return mapped;
}

/**
 * Ask the assistant service one question.
 *
 * Never throws: every failure resolves to `unavailable`. A route handler that
 * has to reason about exception types on the paid path is a route handler that
 * eventually renders a stack trace to somebody.
 */
export async function askAssistantService(
  question: string,
  config: AssistantServiceConfig,
): Promise<AssistantResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.url}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The backend requires this. It is why only this site can spend the
        // instance's budget, and it never reaches the browser.
        "X-Assistant-Secret": config.secret,
      },
      body: JSON.stringify({ question }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      // 503 is the daily allowance; 401/403 a secret problem; 5xx an outage.
      // The visitor is told the same thing for all of them — the difference is
      // operator information and is recorded in the log category only.
      console.warn("[assistant] backend returned an error status", {
        category: "assistant_backend_error",
        status: response.status,
      });
      return { state: "unavailable" };
    }

    const body: unknown = await response.json();
    if (!isBackendResponse(body)) {
      console.error("[assistant] backend response failed validation", {
        category: "assistant_invalid_response",
      });
      return { state: "unavailable" };
    }

    // `grounded` means: an answer, with evidence behind it. Both halves are
    // required. A refusal that cites the passage showing the corpus scope is
    // still a refusal, and unsupported prose is still unsupported — neither may
    // be presented as a sourced answer.
    if (body.refused || !body.grounded) {
      return { state: "not-covered", answer: body.answer };
    }

    const citations = mapCitations(body.citations);
    if (citations.length === 0) {
      // Claimed grounded with nothing to show. Contradictory, so it is not
      // rendered as an answer.
      console.error("[assistant] backend claimed grounded with no citations", {
        category: "assistant_invalid_response",
      });
      return { state: "not-covered", answer: body.answer };
    }

    return { state: "answered", answer: body.answer, citations };
  } catch (error) {
    // Timeout, DNS failure, connection refused, malformed JSON. The thrown
    // value is deliberately never touched: it can carry the request URL and
    // headers, and those must not reach a log.
    const aborted = error instanceof Error && error.name === "AbortError";
    console.warn("[assistant] backend request failed", {
      category: aborted ? "assistant_timeout" : "assistant_unreachable",
    });
    return { state: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
