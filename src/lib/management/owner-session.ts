import { validAuthCaptchaToken } from "./auth-captcha";
import { ConversationStorageError, isConversationId, createGuestConversationRepository, type StorageConfig, type SavedConversation } from "./conversation-repository";
import { guestCookieHeaders, readGuestCookie, GUEST_ACCESS_COOKIE, GUEST_REFRESH_COOKIE } from "./guest-session";
import { readBoundedJson } from "./bounded-json";
import { parseAnswerEvent, type AnswerEvent } from "@/lib/assistant/answer-event";
import type { SavedMessage } from "./conversation-repository";
import { ownerGapOperations } from "./owner-gaps";
import { ownerOperations } from "./owner-operations";
import type { Session } from "@supabase/supabase-js";
export type OwnerSession = Pick<Session,"access_token"|"refresh_token"|"expires_in">;
export const OWNER_ACCESS_COOKIE = "ev-owner-access";
export const OWNER_REFRESH_COOKIE = "ev-owner-refresh";
export type OwnerState = { owner: boolean; assured: boolean; factorId: string | null };
export type OwnerMessage = SavedMessage & {event?:AnswerEvent};
export type OwnerConversation = SavedConversation & { user_id: string };
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function ownerCookieHeaders(session: Pick<Session,"access_token"|"refresh_token"|"expires_in"> | null, secure: boolean) {
  return guestCookieHeaders(session,secure).map(c => c.replace(GUEST_ACCESS_COOKIE,OWNER_ACCESS_COOKIE).replace(GUEST_REFRESH_COOKIE,OWNER_REFRESH_COOKIE).replace("Path=/api/;","Path=/api/management/;"));
}
export function ownerCookies(request: Request) { return { access: readGuestCookie(request,OWNER_ACCESS_COOKIE), refresh: readGuestCookie(request,OWNER_REFRESH_COOKIE) }; }
export function ownerAuth(config: StorageConfig, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (typeof window !== "undefined") throw new ConversationStorageError("unavailable");
  const url = new URL(config.projectUrl);
  if (url.protocol!=="https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname!=="/" || url.search || url.hash || !config.publishableKey.startsWith("sb_publishable_")) throw new ConversationStorageError("unavailable");
  async function call(path: string, token?: string, body?: unknown, method?: "DELETE") {
    if (signal.aborted) throw new ConversationStorageError("unavailable");
    let res: Response;
    try { res=await fetcher(url.origin+path,{method:method ?? (body===undefined?"GET":"POST"),headers:{apikey:config.publishableKey,...(token?{Authorization:`Bearer ${token}`} : {}),"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),signal,cache:"no-store",redirect:"error"}); }
    catch { throw new ConversationStorageError("unavailable"); }
    if(!res.ok) throw new ConversationStorageError([400,401,403,422].includes(res.status)?"unauthorized":res.status===409?"conflict":res.status===429?"limit":"unavailable");
    if(res.status===204) return null;
    // Supabase enrollment includes a large SVG QR payload (518475 bytes measured).
    // Bound that one response separately; return only the setup key and factor ID.
    try { return await readBoundedJson(res,path === "/auth/v1/factors" && method!=="DELETE" ? 1000000 : (path.startsWith("/rest/v1/ev_answer_events?")||path==="/rest/v1/rpc/ev_owner_gaps") ? 1500000 : 200000,signal); }
    catch { throw new ConversationStorageError("unavailable"); }
  }
  function session(data:unknown): OwnerSession {
    if(!object(data)||typeof data.access_token!=="string"||typeof data.refresh_token!=="string"||typeof data.expires_in!=="number") throw new ConversationStorageError("unavailable");
    const value={access_token:data.access_token,refresh_token:data.refresh_token,expires_in:data.expires_in};
    ownerCookieHeaders(value,false); return value;
  }
  async function state(token: string): Promise<OwnerState> {
    const user=await call("/auth/v1/user",token);
    if(!object(user)||!isConversationId(user.id)||user.is_anonymous!==false) throw new ConversationStorageError("unauthorized");
    const role=await call("/rest/v1/rpc/ev_owner_session_state",token,{});
    if(!object(role)||role.owner!==true||typeof role.assured!=="boolean") throw new ConversationStorageError("unauthorized");
    const factors=Array.isArray(user.factors)?user.factors:[];
    const factor=factors.find(f=>object(f)&&f.factor_type==="totp"&&f.status==="verified"&&isConversationId(f.id));
    return { owner:true,assured:role.assured,factorId:factor?.id ?? null };
  }
  async function requireAssured(token: string) { if(!(await state(token)).assured) throw new ConversationStorageError("unauthorized"); }
  return {
    ...ownerGapOperations(async(token,path,body)=>{await requireAssured(token);return call(path,token,body);}),
    ...ownerOperations(async(token,path,body)=>{await requireAssured(token);return call(path,token,body);}),
    state,
    async signIn(email:string,password:string,captchaToken?:string) {
      if(captchaToken!==undefined&&!validAuthCaptchaToken(captchaToken))throw new ConversationStorageError("invalid");
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<8||password.length>1024) throw new ConversationStorageError("invalid");
      const s=session(await call("/auth/v1/token?grant_type=password",undefined,{email,password,...(captchaToken?{gotrue_meta_security:{captcha_token:captchaToken}}:{})}));
      try { return {session:s,state:await state(s.access_token)}; }
      catch(error) { try { await call("/auth/v1/logout?scope=local",s.access_token,{}); } catch {} throw error; }
    },
    async existing(request:Request) {
      const cookie=ownerCookies(request);
      if(cookie.access) {
        try { return {token:cookie.access,state:await state(cookie.access),session:undefined}; }
        catch(error) { if(!(error instanceof ConversationStorageError)||error.kind!=="unauthorized") throw error; }
      }
      if(!cookie.refresh) throw new ConversationStorageError("unauthorized");
      const s=session(await call("/auth/v1/token?grant_type=refresh_token",undefined,{refresh_token:cookie.refresh}));
      return {token:s.access_token,state:await state(s.access_token),session:s};
    },
    async enroll(token:string) {
      if((await state(token)).factorId) throw new ConversationStorageError("conflict");
      const user=await call("/auth/v1/user",token);
      const pending=object(user)&&Array.isArray(user.factors)?user.factors.filter(f=>object(f)&&f.factor_type==="totp"&&f.status==="unverified"&&f.friendly_name==="E.V owner"&&isConversationId(f.id)):[];
      if(pending.length>1)throw new ConversationStorageError("unavailable");
      // A refresh can lose the setup key. Replace only this flow's unverified
      // factor; an existing verified authenticator is never removed here.
      if(pending[0])await call(`/auth/v1/factors/${pending[0].id}`,token,undefined,"DELETE");
      const result=await call("/auth/v1/factors",token,{factor_type:"totp",friendly_name:"E.V owner"});
      if(!object(result)||!isConversationId(result.id)||!object(result.totp)||typeof result.totp.secret!=="string"||!/^[A-Z2-7]{16,128}$/.test(result.totp.secret)) throw new ConversationStorageError("unavailable");
      return {factorId:result.id,secret:result.totp.secret};
    },
    async verify(token:string,factorId:string,code:string) {
      await state(token);
      if(!isConversationId(factorId)||!/^\d{6}$/.test(code)) throw new ConversationStorageError("invalid");
      const challenge=await call(`/auth/v1/factors/${factorId}/challenge`,token,{});
      if(!object(challenge)||!isConversationId(challenge.id)) throw new ConversationStorageError("unavailable");
      const s=session(await call(`/auth/v1/factors/${factorId}/verify`,token,{challenge_id:challenge.id,code}));
      await requireAssured(s.access_token); return s;
    },
    async disconnect(token:string) { await call("/auth/v1/logout?scope=local",token,{}); },
    async conversations(token:string,after?:string) {
      await requireAssured(token);
      let cursor="";
      if(after) {
        if(after.length>160||!/^[a-zA-Z0-9_-]+$/.test(after)) throw new ConversationStorageError("invalid");
        let value:unknown;try {value=JSON.parse(Buffer.from(after,"base64url").toString("utf8"));}catch{throw new ConversationStorageError("invalid");}
        if(!object(value)||!isConversationId(value.id)||typeof value.at!=="string"||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-][0-9:]+)$/.test(value.at)||!Number.isFinite(Date.parse(value.at))) throw new ConversationStorageError("invalid");
        cursor=`&or=(created_at.lt.${encodeURIComponent(value.at)},and(created_at.eq.${encodeURIComponent(value.at)},id.lt.${value.id}))`;
      }
      const rows=await call(`/rest/v1/ev_conversations?app=eq.ev&select=id,app,user_id,created_at,expires_at&order=created_at.desc,id.desc&limit=25${cursor}`,token);
      if(!Array.isArray(rows)||rows.length>25||!rows.every(r=>object(r)&&isConversationId(r.id)&&isConversationId(r.user_id)&&r.app==="ev"&&typeof r.created_at==="string"&&Number.isFinite(Date.parse(r.created_at))&&typeof r.expires_at==="string"&&Number.isFinite(Date.parse(r.expires_at)))) throw new ConversationStorageError("unavailable");
      const last=rows.at(-1);return {conversations:rows as OwnerConversation[],next:rows.length===25?Buffer.from(JSON.stringify({id:last.id,at:last.created_at})).toString("base64url"):null};
    },
    async messages(token:string,id:string) {
      await requireAssured(token);
      const messages=await (await createGuestConversationRepository(config,token,fetcher,signal)).messages(id);
      const ids=messages.filter(m=>m.role==="assistant").map(m=>m.id);
      if(!ids.length)return messages as OwnerMessage[];
      const rows=await call(`/rest/v1/ev_answer_events?message_id=in.(${ids.join(",")})&select=message_id,outcome,route,model,retrieved,cited,latency_ms,corpus_sha256,prompt_sha256&limit=160`,token);
      if(!Array.isArray(rows)||rows.length>ids.length)throw new ConversationStorageError("unavailable");
      const events=new Map<string,AnswerEvent>();
      for(const row of rows){
        if(!object(row)||typeof row.message_id!=="string"||!ids.includes(row.message_id)||events.has(row.message_id))throw new ConversationStorageError("unavailable");
        const event=parseAnswerEvent({version:1,outcome:row.outcome,route:row.route,model:row.model,retrieved:row.retrieved,cited:row.cited,latencyMs:row.latency_ms,corpusSha256:row.corpus_sha256,promptSha256:row.prompt_sha256});
        // Historical records may have manual diagnoses from the older writer.
        if(event)events.set(row.message_id,event);
      }
      return messages.map(m=>({...m,...(events.has(m.id)?{event:events.get(m.id)}:{})})) as OwnerMessage[];
    },
  };
}
