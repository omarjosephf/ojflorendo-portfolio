import { storageRequestAllowed, storageWriteAllowed } from "@/lib/management/access";
import { ConversationStorageError, createGuestConversationRepository, isConversationId } from "@/lib/management/conversation-repository";
import { GUEST_ACCESS_COOKIE, readGuestCookie } from "@/lib/management/guest-session";
import { BoundedJsonError, readBoundedJson } from "@/lib/management/bounded-json";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
function json(value:unknown,status=200) { return Response.json(value,{status,headers}); }
function enabled(request:Request) { return storageRequestAllowed(request); }
async function repository(request:Request) {
  const token=request.headers.get("authorization")?.match(/^Bearer ([a-zA-Z0-9._-]{1,16000})$/)?.[1] ?? readGuestCookie(request,GUEST_ACCESS_COOKIE);
  if(!token) throw new ConversationStorageError("unauthorized");
  return createGuestConversationRepository({projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""},token);
}
function failure(error:unknown) {
  if(error instanceof ConversationStorageError) return json({error:error.message,saved:false},{unauthorized:401,invalid:400,conflict:409,limit:429,unavailable:503}[error.kind]);
  return json({error:"Conversation storage is unavailable. Nothing was reported as saved.",saved:false},503);
}
export async function GET(request:Request) {
  if(!enabled(request)) return json({error:"Not found"},404);
  const url=new URL(request.url),id=url.searchParams.get("conversationId"),app=url.searchParams.get("app")??"ev";
  if((id!==null&&!isConversationId(id))||!["ev","cited"].includes(app)) return json({error:"Invalid conversation filter"},400);
  try { const repo=await repository(request); return json(id?{messages:await repo.messages(id)}:{conversations:await repo.list(app as "ev"|"cited")}); }
  catch(error) { return failure(error); }
}
export async function POST(request:Request) {
  if(!enabled(request)) return json({error:"Not found"},404);
  if(!storageWriteAllowed(request)) return json({error:"Same-origin JSON request required"},403);
  try {
    const value=await readBoundedJson(request,100000,AbortSignal.any([request.signal,AbortSignal.timeout(2000)]));
    if(!value||typeof value!=="object"||Array.isArray(value)) return json({error:"Invalid conversation action"},400);
    const data=value as Record<string,unknown>;
    // No caller may submit an assistant answer. Only the server writer accepts one.
    if(data.action==="create"&&isConversationId(data.id)&&(data.app==="ev"||data.app==="cited")) {
      const repo=await repository(request);return json({id:await repo.create(data.id,data.app),saved:true});
    }
    if(data.action==="append_user"&&isConversationId(data.conversationId)&&isConversationId(data.requestId)&&typeof data.body==="string"&&data.body.trim().length>0&&data.body.length<=12000&&!data.body.includes("\0")) {
      const repo=await repository(request);return json({id:await repo.appendUser(data.conversationId,data.requestId,data.body),saved:true});
    }
    if(data.action==="feedback"&&isConversationId(data.messageId)&&typeof data.helpful==="boolean") {
      const repo=await repository(request);await repo.feedback(data.messageId,data.helpful);return json({saved:true});
    }
    if(data.action==="delete"&&isConversationId(data.conversationId)) {
      const repo=await repository(request);return json({deleted:await repo.remove(data.conversationId)});
    }
    return json({error:"Invalid conversation action"},400);
  } catch(error) {
    if(error instanceof BoundedJsonError) return json({error:error.kind==="too-large"?"Message is too large":error.kind==="aborted"?"Request timed out":"Invalid JSON",saved:false},error.kind==="too-large"?413:error.kind==="aborted"?408:400);
    return failure(error);
  }
}
