type PreviewEnvironment = { NODE_ENV?: string; EV_MANAGEMENT_MODE?: string; VERCEL?: string };
export function previewAllowed(host: string | null, env: PreviewEnvironment = process.env): boolean {
  return env.NODE_ENV === "development" && env.EV_MANAGEMENT_MODE === "preview" && !env.VERCEL &&
    !!host && /^(127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?$/.test(host);
}
export function previewWriteAllowed(request: Request): boolean {
  if (!previewAllowed(request.headers.get("host"))) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && parsed.host === request.headers.get("host") && parsed.origin === origin &&
      request.headers.get("content-type")?.split(";")[0].trim() === "application/json";
  } catch { return false; }
}


/**
 * ADR-0025 separates two switches that used to be one. `EV_ADMIN_MODE=live` opens
 * the owner admin panel; visitor saved chats additionally need
 * `EV_CONVERSATION_STORAGE=production`. The admin switch alone never opens a
 * visitor-storage route.
 */
type LiveEnvironment = PreviewEnvironment & {
  VERCEL_ENV?: string;
  EV_ADMIN_MODE?: string;
  EV_CONVERSATION_STORAGE?: string;
  EV_MANAGEMENT_ORIGIN?: string;
};
type OriginSelector = (env?: LiveEnvironment) => string | null;
/** Deployment selection only. Every data operation still verifies managed Auth/RLS. */
export function productionAdminOrigin(env: LiveEnvironment = process.env): string | null {
  if(env.NODE_ENV!=="production"||env.VERCEL!=="1"||env.VERCEL_ENV!=="production"||env.EV_ADMIN_MODE!=="live")return null;
  try {
    const value=env.EV_MANAGEMENT_ORIGIN??"",origin=new URL(value);
    if(origin.protocol!=="https:"||origin.origin!==value||origin.port||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash||!origin.hostname.includes(".")||/^[0-9.]+$/.test(origin.hostname)||origin.hostname.endsWith(".localhost"))return null;
    return origin.origin;
  } catch {return null;}
}
export function productionStorageOrigin(env: LiveEnvironment = process.env): string | null {
  return env.EV_CONVERSATION_STORAGE==="production"?productionAdminOrigin(env):null;
}
function stagingPreview(host: string | null, env: LiveEnvironment): boolean {
  return previewAllowed(host,env)&&env.EV_CONVERSATION_STORAGE==="staging";
}
function hostAllowed(select: OriginSelector, host: string | null, env: LiveEnvironment): boolean {
  if(stagingPreview(host,env))return true;
  const origin=select(env);
  return !!origin&&host===new URL(origin).host;
}
function requestAllowed(select: OriginSelector, request: Request): boolean {
  if(!hostAllowed(select,request.headers.get("host"),process.env))return false;
  return previewAllowed(request.headers.get("host"))||new URL(request.url).origin===select();
}
function writeAllowed(select: OriginSelector, request: Request): boolean {
  if(!requestAllowed(select,request))return false;
  if(previewAllowed(request.headers.get("host")))return previewWriteAllowed(request);
  const origin=select();
  return !!origin&&request.headers.get("origin")===origin&&new URL(request.url).origin===origin&&request.headers.get("content-type")?.split(";")[0].trim()==="application/json";
}

/** Owner admin panel: `/manage`, `/manage/live` and `/api/management/*` (except the local sample API). */
export function adminAllowed(host: string | null, env: LiveEnvironment = process.env): boolean { return hostAllowed(productionAdminOrigin,host,env); }
export function adminRequestAllowed(request: Request): boolean { return requestAllowed(productionAdminOrigin,request); }
export function adminWriteAllowed(request: Request): boolean { return writeAllowed(productionAdminOrigin,request); }

/** Visitor saved chats: `/api/conversations*`, `/api/conversation-session` and the public assistant's storage option. */
export function visitorStorageAllowed(host: string | null, env: LiveEnvironment = process.env): boolean { return hostAllowed(productionStorageOrigin,host,env); }
export function visitorStorageRequestAllowed(request: Request): boolean { return requestAllowed(productionStorageOrigin,request); }
export function visitorStorageWriteAllowed(request: Request): boolean { return writeAllowed(productionStorageOrigin,request); }
