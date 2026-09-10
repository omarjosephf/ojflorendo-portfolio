import { authCaptchaSiteKey, validAuthCaptchaToken } from "@/lib/management/auth-captcha";
import { storageRequestAllowed, storageWriteAllowed } from "@/lib/management/access";
import { ConversationStorageError } from "@/lib/management/conversation-repository";
import { BoundedJsonError, readBoundedJson } from "@/lib/management/bounded-json";
import { GUEST_ACCESS_COOKIE, GUEST_REFRESH_COOKIE, GUEST_CONSENT_VERSION, guestAuth, guestCookieHeaders, readGuestCookie } from "@/lib/management/guest-session";
import { createRateLimiter } from "@/lib/rate-limit";
import type { Session } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Courtesy limit only. Managed Auth's signup protection remains required for public activation.
const connections = createRateLimiter({ limit: 4, windowMs: 60000 });
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", Vary: "Cookie" };
function enabled(request: Request) { return storageRequestAllowed(request); }
function response(value: unknown, request: Request, status = 200, session?: Session | null) {
  const body = value && typeof value === "object" && "status" in value && value.status === "disconnected" ? { ...value, captchaSiteKey: authCaptchaSiteKey() } : value;
  const result = Response.json(body, { status, headers });
  if (session !== undefined) for (const cookie of guestCookieHeaders(session, new URL(request.url).protocol === "https:")) result.headers.append("Set-Cookie", cookie);
  return result;
}
function auth(signal: AbortSignal) {
  return guestAuth({ projectUrl: process.env.SUPABASE_URL ?? "", publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "" }, signal);
}
function failure(error: unknown, request: Request) {
  if (error instanceof ConversationStorageError) return response({ status: error.kind === "unauthorized" ? "disconnected" : "unavailable", error: error.message }, request, { unauthorized: 401, invalid: 400, conflict: 409, limit: 429, unavailable: 503 }[error.kind]);
  return response({ status: "unavailable", error: "Guest connection is unavailable. Your existing chat has not been changed." }, request, error instanceof BoundedJsonError ? 400 : 503);
}
async function existing(request: Request, service: ReturnType<typeof guestAuth>) {
  const access = readGuestCookie(request, GUEST_ACCESS_COOKIE), refresh = readGuestCookie(request, GUEST_REFRESH_COOKIE);
  if (access) {
    try { await service.verify(access); return response({ status: "connected" }, request); }
    catch (error) { if (!(error instanceof ConversationStorageError) || error.kind !== "unauthorized") throw error; }
  }
  if (refresh) return response({ status: "connected" }, request, 200, await service.refresh(refresh));
  return null;
}
export async function GET(request: Request) {
  if (!enabled(request)) return response({ error: "Not found" }, request, 404);
  if (!readGuestCookie(request,GUEST_ACCESS_COOKIE) && !readGuestCookie(request,GUEST_REFRESH_COOKIE)) return response({ status: "disconnected" }, request);
  try { return await existing(request, auth(AbortSignal.any([request.signal,AbortSignal.timeout(5000)]))) ?? response({ status: "disconnected" }, request); }
  catch (error) { return failure(error, request); }
}
export async function POST(request: Request) {
  if (!enabled(request)) return response({ error: "Not found" }, request, 404);
  if (!storageWriteAllowed(request)) return response({ error: "Same-origin JSON request required" }, request, 403);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
  try {
    const data = await readBoundedJson(request, 4096, signal);
    if (!data || typeof data !== "object" || !("action" in data)) return response({ error: "Invalid session action" }, request, 400);
    const service = auth(signal);
    if (data.action === "disconnect") {
      const access = readGuestCookie(request, GUEST_ACCESS_COOKIE);
      const refresh = readGuestCookie(request, GUEST_REFRESH_COOKIE);
      // If access expired, revoke the refreshed session before reporting sign-out.
      let token = access;
      if (token) {
        try { await service.verify(token); }
        catch (error) { if (!(error instanceof ConversationStorageError) || error.kind !== "unauthorized") throw error; token = null; }
      }
      if (!token && refresh) {
        try { token = (await service.refresh(refresh)).access_token; }
        catch (error) { if (!(error instanceof ConversationStorageError) || error.kind !== "unauthorized") throw error; }
      }
      if (token) await service.disconnect(token);
      return response({ status: "disconnected" }, request, 200, null);
    }
    if (data.action !== "connect" || !("consent" in data) || data.consent !== GUEST_CONSENT_VERSION) return response({ error: "Confirm the 30-day storage notice before connecting" }, request, 400);
    const current = await existing(request, service);
    if (current) return current;
    // Reuse/refresh above needs no challenge. A new identity always does.
    if (!authCaptchaSiteKey()) return response({ status: "unavailable", error: "New saved chats are temporarily unavailable. You can keep chatting in this tab." }, request, 503);
    const captcha = "captchaToken" in data ? data.captchaToken : undefined;
    if (!validAuthCaptchaToken(captcha)) return response({ error: "Complete the verification check before starting a saved chat." }, request, 400);
    if (!connections.check(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local")) return response({ status: "unavailable", error: "Please wait before connecting again." }, request, 429);
    return response({ status: "connected" }, request, 200, await service.connect(captcha));
  } catch (error) { return failure(error, request); }
}
