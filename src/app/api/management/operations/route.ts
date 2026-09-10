import { storageRequestAllowed, storageWriteAllowed } from "@/lib/management/access";
import { ownerAuth, ownerCookieHeaders, type OwnerSession } from "@/lib/management/owner-session";
import { ConversationStorageError } from "@/lib/management/conversation-repository";
import { readBoundedJson, BoundedJsonError } from "@/lib/management/bounded-json";
import { createRateLimiter } from "@/lib/rate-limit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const writes=createRateLimiter({limit:20,windowMs:60000});
function enabled(r:Request){return storageRequestAllowed(r);}
function reply(r:Request,data:unknown,status=200,session?:OwnerSession){
  const res=Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow",Vary:"Cookie"}});
  if(session)for(const c of ownerCookieHeaders(session,new URL(r.url).protocol==="https:"))res.headers.append("Set-Cookie",c);
  return res;
}
function error(r:Request,e:unknown,session?:OwnerSession){
  const kind=e instanceof ConversationStorageError?e.kind:e instanceof BoundedJsonError?"invalid":"unavailable";
  return reply(r,{error:kind==="unauthorized"?"Owner sign-in and current authenticator verification are required.":kind==="conflict"?"This draft changed or this save request conflicts. Keep your text and load the current revision before saving again.":kind==="invalid"?"Check the draft fields or reporting window.":kind==="limit"?"The request or editorial capacity limit was reached.":"The operation could not be confirmed. Keep your text; retrying the same save will not create a second revision."},{unauthorized:401,conflict:409,invalid:400,limit:429,unavailable:503}[kind],session);
}
function auth(r:Request){return ownerAuth({projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""},AbortSignal.any([r.signal,AbortSignal.timeout(6000)]));}
export async function GET(r:Request){
  if(!enabled(r))return reply(r,{error:"Not found"},404);
  let session:OwnerSession|undefined;
  try{
    const service=auth(r),current=await service.existing(r);session=current.session;
    const p=new URL(r.url).searchParams,view=p.get("view");
    const data=view==="report"?{report:await service.report(current.token,Number(p.get("days")??7) as 7|30)}:view==="drafts"?{drafts:await service.drafts(current.token)}:view==="draft"?{draft:await service.draft(current.token,p.get("id")??"")}:view==="history"?{history:await service.history(current.token,p.get("id")??"")}:null;
    if(!data)return reply(r,{error:"Unknown workspace view"},400,session);
    return reply(r,data,200,session);
  }catch(e){return error(r,e,session);}
}
export async function POST(r:Request){
  if(!enabled(r))return reply(r,{error:"Not found"},404);
  if(!storageWriteAllowed(r))return reply(r,{error:"Same-origin JSON required"},403);
  let session:OwnerSession|undefined;
  try{
    const input=await readBoundedJson(r,128000,AbortSignal.any([r.signal,AbortSignal.timeout(2000)]));
    if(!writes.check("local-owner-editorial"))return reply(r,{error:"Please wait before saving again."},429);
    const service=auth(r),current=await service.existing(r);session=current.session;
    return reply(r,{saved:await service.saveDraft(current.token,input)},200,session);
  }catch(e){return error(r,e,session);}
}

