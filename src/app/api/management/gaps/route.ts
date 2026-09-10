import {storageRequestAllowed,storageWriteAllowed} from "@/lib/management/access";
import {ownerAuth,ownerCookieHeaders,type OwnerSession} from "@/lib/management/owner-session";
import {ConversationStorageError} from "@/lib/management/conversation-repository";
import {readBoundedJson,BoundedJsonError} from "@/lib/management/bounded-json";
import {createRateLimiter} from "@/lib/rate-limit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const writes=createRateLimiter({limit:20,windowMs:60000});
function enabled(r:Request){return storageRequestAllowed(r);}
function reply(r:Request,data:unknown,status=200,session?:OwnerSession){
 const res=Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow",Vary:"Cookie"}});
 if(session)for(const c of ownerCookieHeaders(session,new URL(r.url).protocol==="https:"))res.headers.append("Set-Cookie",c);return res;
}
function failure(r:Request,e:unknown,session?:OwnerSession){
 const kind=e instanceof ConversationStorageError?e.kind:e instanceof BoundedJsonError?"invalid":"unavailable";
 return reply(r,{error:kind==="unauthorized"?"Owner sign-in and current authenticator verification are required.":kind==="conflict"?"This review changed. Keep your note and reload the saved review before applying your edits.":kind==="invalid"?"Check the review fields and linked draft.":"The review could not be confirmed. Keep your note and retry the same save."},{unauthorized:401,conflict:409,invalid:400,limit:429,unavailable:503}[kind],session);
}
function auth(r:Request){return ownerAuth({projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""},AbortSignal.any([r.signal,AbortSignal.timeout(6000)]));}
export async function GET(r:Request){
 if(!enabled(r))return reply(r,{error:"Not found"},404);
 let session:OwnerSession|undefined;
 try{const service=auth(r),current=await service.existing(r);session=current.session;return reply(r,{gaps:await service.gaps(current.token)},200,session);}catch(e){return failure(r,e,session);}
}
export async function POST(r:Request){
 if(!enabled(r))return reply(r,{error:"Not found"},404);
 if(!storageWriteAllowed(r))return reply(r,{error:"Same-origin JSON required"},403);
 let session:OwnerSession|undefined;
 try{
  const input=await readBoundedJson(r,8192,AbortSignal.any([r.signal,AbortSignal.timeout(2000)]));
  if(!writes.check("local-owner-gap-review"))return reply(r,{error:"Please wait before saving again."},429);
  const service=auth(r),current=await service.existing(r);session=current.session;return reply(r,{saved:await service.reviewGap(current.token,input)},200,session);
 }catch(e){return failure(r,e,session);}
}
