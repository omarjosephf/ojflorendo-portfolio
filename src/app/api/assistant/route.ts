import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { askAssistantService, readServiceConfig } from "@/lib/assistant/service";
import { ASSISTANT_INPUT_LIMIT } from "@/lib/assistant/types";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * The assistant trust boundary.
 *
 * Visitor input enters server code here and causes a paid, outbound call. It is
 * the same class of boundary as `POST /api/contact` and deliberately reuses its
 * shape — body cap before parsing, validate, throttle, generic errors, no
 * logging of content.
 *
 * Being same-origin is the load-bearing architectural choice: the browser talks
 * only to this site, so `connect-src 'self'` is untouched, the backend needs no
 * CORS, and neither its URL nor the shared secret reaches the client bundle.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Best-effort in-memory throttle, **per server instance**.
 *
 * Not an edge limiter and not distributed: instances do not share this counter,
 * so the real ceiling is the sum across however many are running. It is a
 * courtesy bound that stops casual hammering, and it is described that way
 * everywhere rather than being credited with more than it does. The controls
 * that actually bound spend are the backend's own daily allowance and, above
 * everything, the provider-side account cap.
 *
 * Lower than the contact form's allowance because each request here costs money.
 */
const limiter = createRateLimiter({ limit: 8, windowMs: 60_000 });

/**
 * Conservative cap on the raw body. The largest valid request is a 280-character
 * question plus JSON overhead — well under 2 KiB — so 8 KiB is ample headroom
 * and still refuses anything designed to be expensive to parse.
 */
const MAX_BODY_BYTES = 8 * 1024;

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Read the body under a hard byte cap, independent of the (absent or spoofable)
 * Content-Length header. Stops reading the moment the cap is passed, so an
 * oversized body is never fully buffered and never parsed.
 */
async function readBoundedBody(
  req: NextRequest,
  maxBytes: number,
): Promise<{ tooLarge: true } | { tooLarge: false; text: string }> {
  const stream = req.body;
  if (!stream) return { tooLarge: false, text: "" };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  reader.releaseLock();

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { tooLarge: false, text: new TextDecoder().decode(merged) };
}

export async function POST(req: NextRequest) {
  const started = Date.now();

  // Checked first, so an unconfigured deployment costs nothing and cannot be
  // probed for whether a backend exists.
  const config = readServiceConfig();
  if (!config) {
    return json({ state: "unavailable" }, 200);
  }

  if (!limiter.check(clientIp(req))) {
    return json({ state: "unavailable" }, 429);
  }

  const bounded = await readBoundedBody(req, MAX_BODY_BYTES);
  if (bounded.tooLarge) {
    return json({ state: "unavailable" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return json({ state: "unavailable" }, 400);
  }

  const question = (body as Record<string, unknown>)?.question;
  if (typeof question !== "string") {
    return json({ state: "unavailable" }, 422);
  }

  // Bounded server-side rather than trusting the client's own limit. Unexpected
  // fields on the body are ignored rather than echoed.
  const trimmed = question.trim().slice(0, ASSISTANT_INPUT_LIMIT);
  if (!trimmed) {
    return json({ state: "unavailable" }, 422);
  }

  const result = await askAssistantService(trimmed, config);

  // Privacy-safe observability only: outcome, status category, latency. The
  // question itself is never logged, here or in the backend — a log is a place
  // data goes to be retained and read by people it was not sent to.
  console.info("[assistant] answered", {
    category: "assistant_result",
    state: result.state,
    latencyMs: Date.now() - started,
  });

  return json(result, 200);
}
