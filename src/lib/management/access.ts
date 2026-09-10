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


type StorageEnvironment = PreviewEnvironment & {
  VERCEL_ENV?: string;
  EV_CONVERSATION_STORAGE?: string;
  EV_MANAGEMENT_ORIGIN?: string;
};
/** Deployment selection only. Every data operation still verifies managed Auth/RLS. */
export function productionStorageOrigin(env: StorageEnvironment = process.env): string | null {
  if(env.NODE_ENV!=="production"||env.VERCEL!=="1"||env.VERCEL_ENV!=="production"||env.EV_MANAGEMENT_MODE!=="live"||env.EV_CONVERSATION_STORAGE!=="production")return null;
  try {
    const value=env.EV_MANAGEMENT_ORIGIN??"",origin=new URL(value);
    if(origin.protocol!=="https:"||origin.origin!==value||origin.port||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash||!origin.hostname.includes(".")||/^[0-9.]+$/.test(origin.hostname)||origin.hostname.endsWith(".localhost"))return null;
    return origin.origin;
  } catch {return null;}
}
export function storageAllowed(host: string | null, env: StorageEnvironment = process.env): boolean {
  if(previewAllowed(host,env)&&env.EV_CONVERSATION_STORAGE==="staging")return true;
  const origin=productionStorageOrigin(env);
  return !!origin&&host===new URL(origin).host;
}
export function storageRequestAllowed(request: Request): boolean {
  if(!storageAllowed(request.headers.get("host")))return false;
  return previewAllowed(request.headers.get("host"))||new URL(request.url).origin===productionStorageOrigin();
}
export function storageWriteAllowed(request: Request): boolean {
  if(!storageRequestAllowed(request))return false;
  if(previewAllowed(request.headers.get("host")))return previewWriteAllowed(request);
  const origin=productionStorageOrigin();
  return !!origin&&request.headers.get("origin")===origin&&new URL(request.url).origin===origin&&request.headers.get("content-type")?.split(";")[0].trim()==="application/json";
}
