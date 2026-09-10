import { validAuthCaptchaToken } from "./auth-captcha";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import { readBoundedJson } from "./bounded-json";
import { ConversationStorageError, isConversationId, type StorageConfig } from "./conversation-repository";

export const GUEST_ACCESS_COOKIE = "ev-staging-access";
export const GUEST_REFRESH_COOKIE = "ev-staging-refresh";
export const GUEST_CONSENT_VERSION = "30-day-storage-v1";
const tokenPattern = /^[a-zA-Z0-9._-]+$/;

export function readGuestCookie(request: Request, name: string): string | null {
  const values = (request.headers.get("cookie") ?? "").split(";").map(v => v.trim()).filter(v => v.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return value.length > 0 && value.length <= 3800 && tokenPattern.test(value) ? value : null;
}

export function guestCookieHeaders(session: Pick<Session, "access_token" | "refresh_token" | "expires_in"> | null, secure: boolean): string[] {
  if (session && (![session.access_token, session.refresh_token].every(v => v.length > 0 && v.length <= 3800 && tokenPattern.test(v)) || !Number.isFinite(session.expires_in) || session.expires_in <= 0)) throw new ConversationStorageError("unavailable");
  const attributes = `Path=/api/; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
  return [
    `${GUEST_ACCESS_COOKIE}=${session?.access_token ?? ""}; Max-Age=${session ? Math.min(Math.floor(session.expires_in), 3600) : 0}; ${attributes}`,
    `${GUEST_REFRESH_COOKIE}=${session?.refresh_token ?? ""}; Max-Age=${session ? 30 * 86400 : 0}; ${attributes}`,
  ];
}

/** A server-only managed Auth boundary: no SDK session, key or JWT enters browser JavaScript. */
export function guestAuth(config: StorageConfig, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (typeof window !== "undefined") throw new ConversationStorageError("unavailable");
  let origin: string;
  try {
    const url = new URL(config.projectUrl);
    if (url.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !config.publishableKey.startsWith("sb_publishable_")) throw new Error();
    origin = url.origin;
  } catch { throw new ConversationStorageError("unavailable"); }
  const boundedFetch: typeof fetch = async (input, init) => {
    if (signal.aborted) throw new ConversationStorageError("unavailable");
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== origin || !url.pathname.startsWith("/auth/v1/")) throw new ConversationStorageError("unavailable");
    const response = await fetcher(input, { ...init, signal, redirect: "error", cache: "no-store" });
    if (response.status === 204) return new Response(null, { status: 204 });
    const body = await readBoundedJson(response, 100000, signal);
    return Response.json(body, { status: response.status, headers: { "x-supabase-api-version": "2024-01-01" } });
  };
  const client = createClient(origin, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: boundedFetch } });
  function fail(status?: number): never { throw new ConversationStorageError(status === 401 || status === 403 || status === 400 || status === 422 ? "unauthorized" : status === 429 ? "limit" : "unavailable"); }
  async function verify(token: string) {
    const { data, error } = await client.auth.getUser(token);
    if (error) fail(error.status);
    if (!data.user || !isConversationId(data.user.id) || data.user.is_anonymous !== true) throw new ConversationStorageError("unauthorized");
    return data.user.id;
  }
  return {
    verify,
    async connect(captchaToken: string): Promise<Session> {
      if (!validAuthCaptchaToken(captchaToken)) throw new ConversationStorageError("invalid");
      // Auth verifies the single-use token. Do not consume it with Siteverify here.
      const { data, error } = await client.auth.signInAnonymously({ options: { captchaToken } });
      if (error) fail(error.status);
      if (!data.session) throw new ConversationStorageError("unavailable");
      await verify(data.session.access_token);
      return data.session;
    },
    async refresh(refreshToken: string): Promise<Session> {
      // The SDK's refresh helper retries for up to 30 seconds. This explicit
      // managed Auth call keeps one attempt under the route's shared deadline.
      const response = await boundedFetch(`${origin}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }) });
      if (!response.ok) fail(response.status);
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("access_token" in data) || !("refresh_token" in data) || !("expires_in" in data) || typeof data.access_token !== "string" || typeof data.refresh_token !== "string" || typeof data.expires_in !== "number") throw new ConversationStorageError("unavailable");
      const session = data as Session;
      guestCookieHeaders(session, false);
      await verify(session.access_token);
      return session;
    },
    async disconnect(accessToken: string): Promise<void> {
      const { error } = await client.auth.admin.signOut(accessToken, "local");
      if (error && ![401,403,404].includes(error.status ?? 0)) fail(error.status);
    },
  };
}
