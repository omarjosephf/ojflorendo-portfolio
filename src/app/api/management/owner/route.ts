import { ownerCaptchaConfiguration, validAuthCaptchaToken } from "@/lib/management/auth-captcha";
import { previewAllowed, storageRequestAllowed, storageWriteAllowed } from "@/lib/management/access";
import { ownerAuth, ownerCookies, ownerCookieHeaders, type OwnerSession } from "@/lib/management/owner-session";
import { ConversationStorageError } from "@/lib/management/conversation-repository";
import { readBoundedJson, BoundedJsonError } from "@/lib/management/bounded-json";
import { ownerSetup, initializeOwner } from "@/lib/management/owner-bootstrap";
import { createRateLimiter } from "@/lib/rate-limit";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const attempts=createRateLimiter({limit:8,windowMs:60000});
function enabled(r:Request){return storageRequestAllowed(r);}
function reply(r:Request,data:unknown,status=200,session?:OwnerSession|null){
  const body=data&&typeof data==="object"&&("error" in data||("status" in data&&["signed_out","setup_required"].includes(String(data.status))))?{...data,authCaptcha:ownerCaptchaConfiguration()}:data;
  const res=Response.json(body,{status,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow",Vary:"Cookie"}});
  if(session!==undefined)for(const c of ownerCookieHeaders(session,new URL(r.url).protocol==="https:"))res.headers.append("Set-Cookie",c);
  return res;
}
function failure(r:Request,error:unknown){
  const kind=error instanceof ConversationStorageError?error.kind:error instanceof BoundedJsonError?"invalid":"unavailable";
  return reply(r,{error:kind==="unauthorized"?"Owner sign-in and current authenticator verification are required.":kind==="invalid"?"Check the entered details.":kind==="conflict"?"Setup is already in progress or an authenticator is registered. Try signing in.":kind==="limit"?"Please wait before trying again.":"Owner access is unavailable. Existing records have not been changed."},{unauthorized:401,invalid:400,conflict:409,limit:429,unavailable:503}[kind]);
}
function service(r:Request){return ownerAuth({projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""},AbortSignal.any([r.signal,AbortSignal.timeout(6000)]));}
export async function GET(r:Request){
  if(!enabled(r))return reply(r,{error:"Not found"},404);
  const params=new URL(r.url).searchParams;
  if(!ownerCookies(r).access&&!ownerCookies(r).refresh){const setup=previewAllowed(r.headers.get("host"))?await ownerSetup():null;return reply(r,setup?{status:"setup_required",email:setup.email}:{status:"signed_out"});}
  try{
    const auth=service(r),current=await auth.existing(r);
    const data=params.has("conversation")?{messages:await auth.messages(current.token,params.get("conversation")!)}:params.get("view")==="conversations"?await auth.conversations(current.token,params.get("after")??undefined):{status:current.state.assured?"ready":"mfa_required",factorId:current.state.factorId};
    return reply(r,data,200,current.session);
  }catch(error){return failure(r,error);}
}
export async function POST(r:Request){
  if(!enabled(r))return reply(r,{error:"Not found"},404);
  if(!storageWriteAllowed(r))return reply(r,{error:"Same-origin JSON required"},403);
  try{
    const data=await readBoundedJson(r,4096,AbortSignal.any([r.signal,AbortSignal.timeout(2000)]));
    if(!data||typeof data!=="object"||!("action"in data))return reply(r,{error:"Invalid owner action"},400);
    if(!attempts.check("local-owner"))return reply(r,{error:"Please wait before trying again."},429);
    if(data.action==="initialize"&&"password"in data&&typeof data.password==="string"){
      if(!previewAllowed(r.headers.get("host")))return reply(r,{error:"Not found"},404);
      if(ownerCaptchaConfiguration().required)return reply(r,{error:"Owner setup must be completed before enabling signup protection. Use your existing owner sign-in."},409);
      const result=await initializeOwner({projectUrl:process.env.SUPABASE_URL??"",publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY??""},process.env.SUPABASE_SECRET_KEY??"",data.password,AbortSignal.any([r.signal,AbortSignal.timeout(6000)]));
      return reply(r,{status:result.state.assured?"ready":"mfa_required",factorId:result.state.factorId},200,result.session);
    }
    const auth=service(r);
    if(data.action==="sign_in"&&"email"in data&&"password"in data&&typeof data.email==="string"&&typeof data.password==="string"){
      const configuration=ownerCaptchaConfiguration(),captcha="captchaToken" in data?data.captchaToken:undefined;
      if(configuration.required&&!configuration.siteKey)return reply(r,{error:"Owner verification is temporarily unavailable. Please reload or use the documented recovery process."},503);
      if((configuration.required||captcha!==undefined)&&!validAuthCaptchaToken(captcha))return reply(r,{error:"Complete the verification check before signing in."},400);
      const result=await auth.signIn(data.email,data.password,captcha as string|undefined);return reply(r,{status:result.state.assured?"ready":"mfa_required",factorId:result.state.factorId},200,result.session);
    }
    if(data.action==="sign_out"&&!ownerCookies(r).access&&!ownerCookies(r).refresh)return reply(r,{status:"signed_out"},200,null);
    const current=await auth.existing(r);
    if(data.action==="sign_out"){await auth.disconnect(current.token);return reply(r,{status:"signed_out"},200,null);}
    if(data.action==="enroll")return reply(r,{status:"mfa_required",...await auth.enroll(current.token)},200,current.session);
    if(data.action==="verify"&&"factorId"in data&&"code"in data&&typeof data.factorId==="string"&&typeof data.code==="string")return reply(r,{status:"ready"},200,await auth.verify(current.token,data.factorId,data.code));
    return reply(r,{error:"Invalid owner action"},400);
  }catch(error){return failure(r,error);}
}
