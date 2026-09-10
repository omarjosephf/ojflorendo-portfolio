import { readFile, mkdir, rename, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import { isConversationId, ConversationStorageError, type StorageConfig } from "./conversation-repository";
import { ownerAuth } from "./owner-session";
import { readBoundedJson } from "./bounded-json";
type Setup={version:1;userId:string;email:string;expiresAt:string};
const file=()=>resolve(process.cwd(),".ev-preview/owner-setup.json");
/** Machine-local, explicitly armed setup. Never available on a hosted/production app. */
export async function ownerSetup(path=file()):Promise<Setup|null>{
  if(process.env.EV_MANAGEMENT_TEST_STORE==="1")return null;
  try{
    const raw=await readFile(path,"utf8");if(raw.length>2048)return null;
    const v=JSON.parse(raw);
    if(v.version!==1||!isConversationId(v.userId)||typeof v.email!=="string"||v.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)||typeof v.expiresAt!=="string"||!Number.isFinite(Date.parse(v.expiresAt))||Date.parse(v.expiresAt)<=Date.now()||Date.parse(v.expiresAt)>Date.now()+86400000)return null;
    return v;
  }catch{return null;}
}
export async function initializeOwner(config:StorageConfig,serviceKey:string,password:string,signal:AbortSignal,fetcher:typeof fetch=fetch,path=file()){
  if(typeof window!=="undefined"||process.env.NODE_ENV!=="development"||process.env.EV_MANAGEMENT_MODE!=="preview"||process.env.VERCEL||!serviceKey.startsWith("sb_secret_"))throw new ConversationStorageError("unavailable");
  if(password.length<14||password.length>128)throw new ConversationStorageError("invalid");
  const auth=ownerAuth(config,signal,fetcher); // validates the pinned HTTPS Auth origin
  const lock=`${path}.lock`;
  try{await mkdir(lock);}catch{throw new ConversationStorageError("conflict");}
  const setup=await ownerSetup(path);
  if(!setup){await rmdir(lock);throw new ConversationStorageError("unauthorized");}
  // After dispatch, uncertainty leaves the lock in place. Never reset another
  // password automatically. The owner can try normal sign-in with their password.
  const res=await fetcher(`${new URL(config.projectUrl).origin}/auth/v1/admin/users/${setup.userId}`,{method:"PUT",headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},body:JSON.stringify({password}),cache:"no-store",redirect:"error",signal});
  if(!res.ok)throw new ConversationStorageError("unavailable");
  const data=await readBoundedJson(res,200000,signal);
  if(!data||typeof data!=="object"||!("id"in data)||data.id!==setup.userId)throw new ConversationStorageError("unavailable");
  const result=await auth.signIn(setup.email,password);
  await rename(path,`${path}.${setup.userId}.completed`);await rmdir(lock);
  return result;
}
