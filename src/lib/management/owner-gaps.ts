import {ConversationStorageError,isConversationId} from "./conversation-repository";
export const gapDiagnoses=["unclassified","missing_content","retrieval_miss","provider_failure","policy_boundary"] as const;
export const gapStatuses=["new","investigating","drafted","closed"] as const;
export type GapDiagnosis=typeof gapDiagnoses[number];
export type GapStatus=typeof gapStatuses[number];
export type GapReviewSave={messageId:string;requestId:string;revision:number;diagnosis:GapDiagnosis;status:GapStatus;note:string;draftId:string|null};
export type LiveGap={message_id:string;conversation_id:string;created_at:string;question:string;question_shortened:boolean;answer:string;answer_shortened:boolean;observed:string;retrieved:string[];cited:string[];diagnosis:GapDiagnosis;status:GapStatus;note:string;draft_id:string|null;revision:number};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const text=(v:unknown,max:number):v is string=>typeof v==="string"&&v.length<=max;
const revision=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=2147483647;
const diagnosis=(v:unknown):v is GapDiagnosis=>gapDiagnoses.includes(v as GapDiagnosis);
const status=(v:unknown):v is GapStatus=>gapStatuses.includes(v as GapStatus);
export function parseGapReview(v:unknown):GapReviewSave{
 if(!object(v)||!isConversationId(v.messageId)||!isConversationId(v.requestId)||(!revision(v.revision)||v.revision===2147483647)||!diagnosis(v.diagnosis)||!status(v.status)||!text(v.note,1000)||!(v.draftId===null||isConversationId(v.draftId))||(v.status==="drafted"&&v.draftId===null))throw new ConversationStorageError("invalid");
 return {messageId:v.messageId,requestId:v.requestId,revision:v.revision,diagnosis:v.diagnosis,status:v.status,note:v.note,draftId:v.draftId};
}
export function ownerGapOperations(call:(token:string,path:string,body?:unknown)=>Promise<unknown>){
 return {
  async gaps(token:string):Promise<LiveGap[]>{
   const rows=await call(token,"/rest/v1/rpc/ev_owner_gaps",{});
   const sources=(v:unknown)=>Array.isArray(v)&&v.length<=20&&v.every(s=>text(s,200));
   if(!Array.isArray(rows)||rows.length>100||!rows.every(v=>object(v)&&isConversationId(v.message_id)&&isConversationId(v.conversation_id)&&text(v.created_at,50)&&Number.isFinite(Date.parse(v.created_at))&&text(v.question,500)&&text(v.answer,1500)&&typeof v.question_shortened==="boolean"&&typeof v.answer_shortened==="boolean"&&["negative_feedback","answered","missing_content","retrieval_miss","provider_failure","policy_boundary","not_covered","not-covered","unavailable","unknown"].includes(String(v.observed))&&sources(v.retrieved)&&sources(v.cited)&&diagnosis(v.diagnosis)&&status(v.status)&&text(v.note,1000)&&(v.draft_id===null||isConversationId(v.draft_id))&&revision(v.revision)))throw new ConversationStorageError("unavailable");
   return rows as LiveGap[];
  },
  async reviewGap(token:string,input:unknown){
   const v=parseGapReview(input);
   const receipt=await call(token,"/rest/v1/rpc/ev_review_gap",{p_message_id:v.messageId,p_request_id:v.requestId,p_expected_revision:v.revision,p_diagnosis:v.diagnosis,p_status:v.status,p_note:v.note,p_draft_id:v.draftId});
   if(!object(receipt)||receipt.messageId!==v.messageId||receipt.revision!==v.revision+1)throw new ConversationStorageError("unavailable");
   return {messageId:v.messageId,revision:v.revision+1};
  },
 };
}
