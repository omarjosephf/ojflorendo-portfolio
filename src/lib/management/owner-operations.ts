import { ConversationStorageError, isConversationId } from "./conversation-repository";
export type LiveDraft = { id:string; title:string; body:string; provenance:string; status:"draft"|"ready_for_review"; revision:number; updated_at:string };
export type DraftSummary = Omit<LiveDraft,"body"|"provenance">;
export type DraftSave = { id:string; requestId:string; revision:number; title:string; body:string; provenance:string; status:"draft"|"ready_for_review" };
export type DraftReceipt = {id:string;revision:number};
export type DraftHistory = {revision:number;status:string;saved_at:string;actor_id:string;input_sha256:string};
export type OwnerReport = {days:7|30;asOf:string;from:string;truncated:boolean;questions:number;conversations:number;replies:number;events:number;feedback:number;helpful:number;topQuestions:{question:string;shortened:boolean;count:number}[];sources:{source:string;citations:number}[];outcomes:Record<string,number>};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const str=(v:unknown,max:number):v is string=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
const count=(v:unknown,max=1000):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const date=(v:unknown):v is string=>typeof v==="string"&&Number.isFinite(Date.parse(v));
const status=(v:unknown):v is LiveDraft["status"]=>v==="draft"||v==="ready_for_review";
export function parseDraftSave(v:unknown):DraftSave {
  if(!object(v)||!isConversationId(v.id)||!isConversationId(v.requestId)||!count(v.revision,2147483646)||!str(v.title,160)||!str(v.body,20000)||!str(v.provenance,1000)||!status(v.status))throw new ConversationStorageError("invalid");
  return {id:v.id,requestId:v.requestId,revision:v.revision,title:v.title,body:v.body,provenance:v.provenance,status:v.status};
}
function summary(v:unknown):v is DraftSummary {
  return object(v)&&isConversationId(v.id)&&str(v.title,160)&&status(v.status)&&count(v.revision,2147483647)&&v.revision>0&&date(v.updated_at);
}
function unavailable():never{throw new ConversationStorageError("unavailable");}
export function ownerOperations(call:(token:string,path:string,body?:unknown)=>Promise<unknown>){
  return {
    async report(token:string,days:7|30):Promise<OwnerReport>{
      if(days!==7&&days!==30)throw new ConversationStorageError("invalid");
      const v=await call(token,"/rest/v1/rpc/ev_owner_report",{p_days:days});
      if(!object(v)||v.days!==days||!date(v.asOf)||!date(v.from)||typeof v.truncated!=="boolean"||!count(v.questions)||!count(v.conversations)||!count(v.replies)||!count(v.events)||!count(v.feedback)||!count(v.helpful)||v.conversations>v.questions||v.replies>v.questions||v.events>v.replies||v.feedback>v.replies||v.helpful>v.feedback||!Array.isArray(v.topQuestions)||v.topQuestions.length>20||!v.topQuestions.every(q=>object(q)&&str(q.question,500)&&typeof q.shortened==="boolean"&&count(q.count)&&q.count>0)||!Array.isArray(v.sources)||v.sources.length>20||!v.sources.every(s=>object(s)&&str(s.source,300)&&count(s.citations)&&s.citations>0)||!object(v.outcomes)||!Object.entries(v.outcomes).every(([k,n])=>["answered","missing_content","retrieval_miss","provider_failure","policy_boundary","not_covered"].includes(k)&&count(n)))return unavailable();
      return v as OwnerReport;
    },
    async drafts(token:string):Promise<DraftSummary[]>{
      const v=await call(token,"/rest/v1/ev_knowledge_drafts?select=id,title,status,revision,updated_at&order=updated_at.desc,id.desc&limit=100");
      if(!Array.isArray(v)||v.length>100||!v.every(summary))return unavailable();return v;
    },
    async draft(token:string,id:string):Promise<LiveDraft>{
      if(!isConversationId(id))throw new ConversationStorageError("invalid");
      const v=await call(token,`/rest/v1/ev_knowledge_drafts?id=eq.${id}&select=id,title,body,provenance,status,revision,updated_at&limit=1`);
      if(!Array.isArray(v)||v.length!==1||!summary(v[0])||!object(v[0])||!("body" in v[0])||!("provenance" in v[0])||!str(v[0].body,20000)||!str(v[0].provenance,1000))return unavailable();return v[0] as LiveDraft;
    },
    async saveDraft(token:string,input:unknown):Promise<DraftReceipt>{
      const d=parseDraftSave(input);
      const v=await call(token,"/rest/v1/rpc/ev_save_draft",{p_id:d.id,p_request_id:d.requestId,p_expected_revision:d.revision,p_title:d.title,p_body:d.body,p_provenance:d.provenance,p_status:d.status});
      if(!object(v)||v.id!==d.id||!count(v.revision,2147483647)||v.revision!==d.revision+1)return unavailable();
      return {id:v.id,revision:v.revision};
    },
    async history(token:string,id:string):Promise<DraftHistory[]>{
      if(!isConversationId(id))throw new ConversationStorageError("invalid");
      const v=await call(token,"/rest/v1/rpc/ev_draft_history",{p_id:id});
      if(!Array.isArray(v)||v.length>20||!v.every(r=>object(r)&&count(r.revision,2147483647)&&r.revision>0&&status(r.status)&&date(r.saved_at)&&isConversationId(r.actor_id)&&typeof r.input_sha256==="string"&&/^[a-f0-9]{64}$/.test(r.input_sha256)))return unavailable();
      return v as DraftHistory[];
    },
  };
}


