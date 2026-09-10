import { parseAnswerEvent, eventMatchesResult, type AnswerEvent } from "@/lib/assistant/answer-event";
/** Server-side persistence adapter. It never invokes an answering or embedding model.
 * Managed Auth verifies the bearer token before visitor-scoped REST requests.
 * Keep the service-key writer in server request handlers, never in a client component.
 */
import { parseAssistantResult } from "@/lib/assistant/client-state";
import type { AssistantResult } from "@/lib/assistant/types";
import { readBoundedJson } from "./bounded-json";

export type StorageConfig = { projectUrl: string; publishableKey: string };
export class ConversationStorageError extends Error {
  constructor(readonly kind: "unauthorized" | "invalid" | "conflict" | "limit" | "unavailable") {
    super({ unauthorized:"Your guest session is unavailable. Reconnect before saving.", invalid:"Invalid conversation data.", conflict:"This save conflicts with an existing message.", limit:"The conversation storage limit has been reached.", unavailable:"Conversation storage is unavailable. Your reply has not been saved." }[kind]);
  }
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const sha = /^[a-f0-9]{64}$/;
export function isConversationId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
function requireId(value: string) { if (!isConversationId(value)) throw new ConversationStorageError("invalid"); }
function validText(value: unknown, max: number): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max && !value.includes("\0"); }
function object(value: unknown): value is Record<string,unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function origin(config: StorageConfig) {
  try {
    const url = new URL(config.projectUrl);
    if (url.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.search || url.hash || url.pathname !== "/" || !validText(config.publishableKey,5000)) throw new Error();
    return url.origin;
  } catch { throw new ConversationStorageError("unavailable"); }
}
function transport(config: StorageConfig, token: string | null, fetcher: typeof fetch, parentSignal?: AbortSignal) {
  const base = origin(config);
  if (token !== null && !validText(token,16_000)) throw new ConversationStorageError("unauthorized");
  return async (path: string, body?: unknown, method?: "DELETE") => {
    let response: Response;
    const signal=parentSignal?AbortSignal.any([parentSignal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000);
    try { response=await fetcher(base+path,{ method:method??(body===undefined?"GET":"POST"),headers:{apikey:config.publishableKey,...(token ? {Authorization:`Bearer ${token}`} : {}),"Content-Type":"application/json",...(method==="DELETE"?{Prefer:"return=representation"}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",redirect:"error",signal}); }
    catch { throw new ConversationStorageError("unavailable"); }
    if(response.status===401 || response.status===403) throw new ConversationStorageError("unauthorized");
    let data:unknown;
    try { data=await readBoundedJson(response,3_000_000,signal); }
    catch { throw new ConversationStorageError("unavailable"); }
    if(!response.ok) {
      const code=object(data)?data.code:null;
      throw new ConversationStorageError(code==="22000"?"conflict":code==="54000"||response.status===429?"limit":"unavailable");
    }
    return data;
  };
}
export type SavedConversation = { id: string; app:"ev"|"cited"; created_at:string; expires_at:string };
export type SavedMessage = { id:string; conversation_id:string; request_id:string; sequence:number; role:"user"|"assistant"; body:string; created_at:string; result?:AssistantResult };

export async function createGuestConversationRepository(config: StorageConfig, accessToken:string, fetcher: typeof fetch=fetch, signal?:AbortSignal) {
  if (typeof window !== "undefined" || !config.publishableKey.startsWith("sb_publishable_")) throw new ConversationStorageError("unavailable");
  const request=transport(config,accessToken,fetcher,signal);
  const identity=await request("/auth/v1/user");
  if(!object(identity)||!isConversationId(identity.id)) throw new ConversationStorageError("unauthorized");
  const userId=identity.id;
  return {
    userId,
    async list(app:"ev"|"cited"): Promise<SavedConversation[]> {
      if(!["ev","cited"].includes(app)) throw new ConversationStorageError("invalid");
      const data=await request(`/rest/v1/ev_conversations?app=eq.${app}&select=id,app,created_at,expires_at&order=created_at.desc&limit=12`);
      if(!Array.isArray(data)||data.length>12||!data.every((r)=>object(r)&&isConversationId(r.id)&&r.app===app&&typeof r.created_at==="string"&&Number.isFinite(Date.parse(r.created_at))&&typeof r.expires_at==="string"&&Number.isFinite(Date.parse(r.expires_at)))) throw new ConversationStorageError("unavailable");
      return data as SavedConversation[];
    },
    async create(id:string,app:"ev"|"cited"="ev"): Promise<string> {
      requireId(id); if(!["ev","cited"].includes(app)) throw new ConversationStorageError("invalid");
      const result=await request("/rest/v1/rpc/ev_create_conversation",{p_id:id,p_app:app});
      if(result!==id) throw new ConversationStorageError("unavailable"); return id;
    },
    async messages(conversationId:string): Promise<SavedMessage[]> {
      requireId(conversationId);
      const data=await request(`/rest/v1/ev_messages?conversation_id=eq.${conversationId}&select=id,conversation_id,request_id,sequence,role,body,created_at,ev_message_results(payload)&order=sequence.asc&limit=160`);
      if(!Array.isArray(data)||data.length>160||!data.every((r,i)=>object(r)&&isConversationId(r.id)&&r.conversation_id===conversationId&&isConversationId(r.request_id)&&Number.isSafeInteger(r.sequence)&&(r.sequence as number)>0&&(i===0||(r.sequence as number)>data[i-1].sequence)&&["user","assistant"].includes(String(r.role))&&validText(r.body,12000)&&typeof r.created_at==="string"&&Number.isFinite(Date.parse(r.created_at)))) throw new ConversationStorageError("unavailable");
      return data.map(row=>{
        const {ev_message_results:stored,...message}=row;
        if(stored===undefined||stored===null) return message as SavedMessage;
        const result=object(stored)?parseAssistantResult(stored.payload):null;
        if(!result||result.state==="blocked"||row.role!=="assistant") throw new ConversationStorageError("unavailable");
        return {...message,result} as SavedMessage;
      });
    },
    async appendUser(conversationId:string,requestId:string,body:string): Promise<string> {
      requireId(conversationId);requireId(requestId);if(!validText(body,12000)) throw new ConversationStorageError("invalid");
      const result=await request("/rest/v1/rpc/ev_append_user_message",{p_conversation_id:conversationId,p_request_id:requestId,p_body:body});
      if(!isConversationId(result)) throw new ConversationStorageError("unavailable");return result;
    },
    async feedback(messageId:string,helpful:boolean): Promise<void> {
      requireId(messageId); if(typeof helpful!=="boolean") throw new ConversationStorageError("invalid");
      await request("/rest/v1/rpc/ev_set_feedback",{p_message_id:messageId,p_helpful:helpful});
    },
    async remove(conversationId:string): Promise<boolean> {
      requireId(conversationId);
      const data=await request(`/rest/v1/ev_conversations?id=eq.${conversationId}&select=id`,undefined,"DELETE");
      if(!Array.isArray(data)||data.length>1||!data.every(r=>object(r)&&r.id===conversationId)) throw new ConversationStorageError("unavailable");
      return data.length===1;
    },
  };
}
export type AssistantRecord = {
  userId:string; conversationId:string; requestId:string; body:string;
  outcome:"answered"|"missing_content"|"retrieval_miss"|"provider_failure"|"policy_boundary";
  route:"primary"|"fallback"|"none"; model:string|null; retrieved:string[]; cited:string[];
  latencyMs:number|null; corpusSha256:string; promptSha256:string;
};
export function createAssistantPersistenceWriter(config: StorageConfig, serviceKey:string, fetcher: typeof fetch=fetch) {
  if (typeof window !== "undefined" || !serviceKey.startsWith("sb_secret_")) throw new ConversationStorageError("unavailable");
  const request=transport({ ...config,publishableKey:serviceKey },null,fetcher);
  return async (record:AssistantRecord):Promise<string> => {
    requireId(record.userId);requireId(record.conversationId);requireId(record.requestId);
    if(!validText(record.body,12000)||!sha.test(record.corpusSha256)||!sha.test(record.promptSha256)||
      !["answered","missing_content","retrieval_miss","provider_failure","policy_boundary"].includes(record.outcome)||!["primary","fallback","none"].includes(record.route)||
      !(record.model===null||validText(record.model,100))||!(record.latencyMs===null||(Number.isSafeInteger(record.latencyMs)&&record.latencyMs>=0&&record.latencyMs<=600000))||
      ![record.retrieved,record.cited].every((a)=>Array.isArray(a)&&a.length<=20&&a.every((s)=>validText(s,200)))) throw new ConversationStorageError("invalid");
    const result=await request("/rest/v1/rpc/ev_append_assistant_message",{
      p_user_id:record.userId,p_conversation_id:record.conversationId,p_request_id:record.requestId,p_body:record.body,p_outcome:record.outcome,
      p_route:record.route,p_model:record.model,p_retrieved:record.retrieved,p_cited:record.cited,p_latency_ms:record.latencyMs,
      p_corpus_sha256:record.corpusSha256,p_prompt_sha256:record.promptSha256,
    });
    if(!isConversationId(result)) throw new ConversationStorageError("unavailable");return result;
  };
}

/** Durable admission is independent of saving: a lost or unfinished claim is never reissued. */
export function createGenerationRepository(config:StorageConfig,serviceKey:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
  if(typeof window!=="undefined"||!serviceKey.startsWith("sb_secret_")) throw new ConversationStorageError("unavailable");
  const request=transport({...config,publishableKey:serviceKey},null,fetcher,signal);
  function args(userId:string,conversationId:string,requestId:string,inputSha256:string){
    requireId(userId);requireId(conversationId);requireId(requestId);if(!sha.test(inputSha256)) throw new ConversationStorageError("invalid");
    return {p_user_id:userId,p_conversation_id:conversationId,p_request_id:requestId,p_input_sha256:inputSha256};
  }
  return {
    async claim(userId:string,conversationId:string,requestId:string,inputSha256:string){
      const value=await request("/rest/v1/rpc/ev_claim_generation",args(userId,conversationId,requestId,inputSha256));
      if(!object(value)||typeof value.claimed!=="boolean") throw new ConversationStorageError("unavailable");
      const result=value.result===null?null:parseAssistantResult(value.result);
      if((value.result!==null&&!result)||result?.state==="blocked"||(value.claimed&&result!==null)) throw new ConversationStorageError("unavailable");
      return {claimed:value.claimed,result};
    },
    async complete(userId:string,conversationId:string,requestId:string,inputSha256:string,result:AssistantResult,event:AnswerEvent|null=null){
      if(result.state==="blocked"||!parseAssistantResult(result)) throw new ConversationStorageError("invalid");
      if(event!==null&&(!parseAnswerEvent(event)||!eventMatchesResult(event,result))) throw new ConversationStorageError("invalid");
      const id=await request(event ? "/rest/v1/rpc/ev_complete_generation_event" : "/rest/v1/rpc/ev_complete_generation",{...args(userId,conversationId,requestId,inputSha256),p_result:result,...(event?{p_event:event}:{})});
      if(!isConversationId(id)) throw new ConversationStorageError("unavailable");return id;
    },
  };
}
