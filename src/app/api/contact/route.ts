import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateContact } from "@/lib/contact/schema";
import { screenContact } from "@/lib/contact/screening";
import { getEmailTransport } from "@/lib/email";
import { createRateLimiter } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort in-memory rate limit (per server instance). This is a v1
// foundation, not a distributed limiter; a shared store would be needed at scale.
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// Conservative cap on the raw request body. The largest valid submission (all
// fields at their limits) is a few KB, so 32 KiB is generous headroom.
const MAX_CONTACT_BODY_BYTES = 32 * 1024;

/**
 * Read the request body while enforcing a hard byte cap — independent of the
 * (absent/spoofable) Content-Length header. Stops reading and reports
 * `tooLarge` as soon as the cap is exceeded; the caller parses JSON only after
 * the body has passed this limit.
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
  if (!limiter.check(clientIp(req))) {
    return json(
      { ok: false, error: "Too many messages. Please try again in a minute." },
      429,
    );
  }

  // Enforce a raw byte limit before parsing (returns 413 if exceeded).
  const bounded = await readBoundedBody(req, MAX_CONTACT_BODY_BYTES);
  if (bounded.tooLarge) {
    return json({ ok: false, message: "Request body is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }

  // Honeypot: real users never fill the hidden `website` field. If present,
  // respond as if accepted (don't tip off bots) but do nothing.
  const website = (body as Record<string, unknown>)?.website;
  if (typeof website === "string" && website.trim() !== "") {
    return json({ ok: true, delivered: false, mode: "mock" }, 200);
  }

  const result = validateContact(body);
  if (!result.ok) {
    return json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors: result.errors,
      },
      422,
    );
  }

  // Bot check. A no-op unless TURNSTILE_SECRET_KEY is configured, and it fails
  // open on any infrastructure problem — see ADR-0005.
  const turnstile = await verifyTurnstile(
    (body as Record<string, unknown>)?.turnstileToken,
    clientIp(req),
  );
  if (turnstile.outcome === "misconfigured") {
    // Loud, because the bot check is silently doing nothing until it is fixed.
    // `errorCodes` is Cloudflare's fixed enum describing OUR request — no secret
    // and no visitor content — and it names the exact fault (ADR-0005).
    console.error(
      "[contact] TURNSTILE MISCONFIGURED — bot protection is NOT active. Check TURNSTILE_SECRET_KEY.",
      { category: "turnstile_misconfigured", errorCodes: turnstile.errorCodes },
    );
  } else if (turnstile.outcome === "unavailable") {
    console.warn("[contact] turnstile unavailable; allowing submission", {
      category: "turnstile_unavailable",
    });
  } else if (turnstile.outcome === "rejected") {
    console.warn("[contact] turnstile rejected the submission", {
      category: "turnstile_rejected",
      errorCodes: turnstile.errorCodes,
    });
  }
  if (!turnstile.ok) {
    return json(
      {
        ok: false,
        error:
          "We couldn't confirm you're human. Please complete the check and try again.",
      },
      403,
    );
  }

  // Plausibility screening. Every check fails open (ADR-0005). Messages are
  // deliberately actionable: the commonest cause of an undeliverable domain is a
  // typo by a real client, and secrecy here would protect nothing.
  const screening = await screenContact(result.data);
  if (!screening.ok) {
    const fieldErrors =
      screening.outcome === "link-flood"
        ? { message: "Please include fewer links in your message." }
        : screening.outcome === "disposable-domain"
          ? { email: "Please use a permanent email address so I can reply." }
          : { email: "We couldn't verify that email domain. Please check it." };

    return json(
      {
        ok: false,
        error: "Please check the highlighted fields and try again.",
        fieldErrors,
      },
      422,
    );
  }

  try {
    const sent = await getEmailTransport().send(result.data);
    if (!sent.ok) {
      // Safe, fixed log line — no secret, submitted content, or provider body.
      console.error("[contact] delivery failed", {
        category: "transport_rejected",
      });
      return json(
        {
          ok: false,
          error:
            "Sorry — your message couldn't be sent right now. Please email me directly.",
        },
        502,
      );
    }
    return json({ ok: true, delivered: sent.delivered, mode: sent.mode }, 200);
  } catch {
    // Generic error only — never touch the thrown error, so no secret, message
    // or stack trace can leak to the log or the client.
    console.error("[contact] delivery failed", {
      category: "transport_exception",
    });
    return json(
      {
        ok: false,
        error:
          "Sorry — something went wrong. Please email me directly instead.",
      },
      500,
    );
  }
}
