import type { AnswerEvent } from "@/lib/assistant/answer-event";
import { createHash } from "node:crypto";
import { storageRequestAllowed, storageWriteAllowed } from "@/lib/management/access";
import { ConversationStorageError, createGenerationRepository, createGuestConversationRepository, isConversationId } from "@/lib/management/conversation-repository";
import { answerReceipts } from "@/lib/management/answer-receipt";
import { GUEST_ACCESS_COOKIE, readGuestCookie } from "@/lib/management/guest-session";
import { BoundedJsonError, readBoundedJson } from "@/lib/management/bounded-json";
import { askAssistantService, readServiceConfig } from "@/lib/assistant/service";
import { screenQuestion } from "@/lib/assistant/guard";
import type { AssistantHistoryTurn, AssistantResult } from "@/lib/assistant/types";
import { createRateLimiter } from "@/lib/rate-limit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const limiter=createRateLimiter({limit:8,windowMs:60000});
function json(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow",Vary:"Cookie"}});}
export async function POST(request:Request){
  if(!storageRequestAllowed(request))return json({error:"Not found"},404);
  if(!storageWriteAllowed(request))return json({error:"Same-origin JSON request required"},403);
  const offered=request.headers.get("x-ev-deadline-ms");
  const requestBudget=offered&&/^\d{1,5}$/.test(offered)?Math.max(1,Math.min(9000,Number(offered))):9000;
  const started=performance.now(),signal=AbortSignal.any([request.signal,AbortSignal.timeout(requestBudget)]);
  try{
    const data=await readBoundedJson(request,100000,signal);
    if(!data||typeof data!=="object"||Array.isArray(data))return json({error:"Invalid request"},400);
    const value=data as Record<string,unknown>;
    const token=readGuestCookie(request,GUEST_ACCESS_COOKIE);
    if(!token)throw new ConversationStorageError("unauthorized");
    const config={projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""};
    const receipts=answerReceipts(process.env.EV_CONVERSATION_RECEIPT_SECRET??"");
    if(value.action==="save"){
      const guest=await createGuestConversationRepository(config,token,fetch,signal);
      const receipt=receipts.verify(value.receipt,guest.userId);
      const generation=createGenerationRepository(config,process.env.SUPABASE_SECRET_KEY??"",signal);
      await generation.complete(guest.userId,receipt.conversationId,receipt.requestId,receipt.inputSha256,receipt.result,receipt.event??null);
      return json({saved:true});
    }
    if(value.action!=="ask"||!isConversationId(value.conversationId)||!isConversationId(value.requestId)||typeof value.question!=="string"||!value.question.trim()||value.question.length>280)return json({error:"Invalid question"},400);
    const question=value.question.trim();
    const blocked=screenQuestion(question);if(blocked)return json({result:blocked,saved:false});
    const history:AssistantHistoryTurn[]=[];
    if(Array.isArray(value.history))for(const entry of value.history.slice(-4)){
      if(!entry||typeof entry!=="object"||typeof entry.question!=="string"||entry.question.length>280||screenQuestion(entry.question))continue;
      history.push({question:entry.question.trim(),sources:Array.isArray(entry.sources)?entry.sources.filter((s:unknown):s is string=>typeof s==="string"&&s.length<=80).slice(0,8):[]});
    }
    const guest=await createGuestConversationRepository(config,token,fetch,signal);
    if(!limiter.check(guest.userId))return json({error:"Please wait before asking again.",saved:false},429);
    const generation=createGenerationRepository(config,process.env.SUPABASE_SECRET_KEY??"",signal);
    const inputSha256=createHash("sha256").update(JSON.stringify({question,history})).digest("hex");
    await guest.appendUser(value.conversationId,value.requestId,question);
    const claim=await generation.claim(guest.userId,value.conversationId,value.requestId,inputSha256);
    if(!claim.claimed){
      if(claim.result)return json({result:claim.result,saved:true,replayed:true});
      return json({error:"This question already started. No second model request was made. Check saved chats for its reply.",saved:false,pending:true},409);
    }
    const serviceConfig=readServiceConfig();
    let event:AnswerEvent|null=null;
    const result:AssistantResult=serviceConfig?await askAssistantService(question,serviceConfig,history,{signal,onEvent:observed=>{event=observed;},deadlineMs:Math.max(1,requestBudget-500-(performance.now()-started))}):{state:"unavailable"};
    const receipt=receipts.sign({userId:guest.userId,conversationId:value.conversationId,requestId:value.requestId,inputSha256,result,...(event?{event}:{})});
    try{
      await generation.complete(guest.userId,value.conversationId,value.requestId,inputSha256,result,event);
      return json({result,saved:true});
    }catch{
      return json({result,saved:false,receipt,error:"Your reply is visible but was not confirmed as saved. Retry saving without asking the model again."});
    }
  }catch(error){
    if(error instanceof ConversationStorageError)return json({error:error.message,saved:false},{unauthorized:401,invalid:400,conflict:409,limit:429,unavailable:503}[error.kind]);
    return json({error:"This request could not be completed. No automatic model retry was made.",saved:false},error instanceof BoundedJsonError?400:503);
  }
}
