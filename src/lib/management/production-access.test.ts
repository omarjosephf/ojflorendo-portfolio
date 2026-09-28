/** @vitest-environment node */
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {adminAllowed,adminRequestAllowed,adminWriteAllowed,productionAdminOrigin,productionStorageOrigin,visitorStorageAllowed,visitorStorageRequestAllowed,visitorStorageWriteAllowed,previewAllowed} from "./access";
import * as guest from "@/app/api/conversation-session/route";
import * as conversations from "@/app/api/conversations/route";
import * as ask from "@/app/api/conversations/ask/route";
import * as owner from "@/app/api/management/owner/route";
import * as operations from "@/app/api/management/operations/route";
import * as gaps from "@/app/api/management/gaps/route";
import * as sample from "@/app/api/management/workspace/route";
const origin="https://release.example",id="10000000-0000-4000-8000-000000000001";
const enabled={NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",EV_ADMIN_MODE:"live",EV_CONVERSATION_STORAGE:"production",EV_MANAGEMENT_ORIGIN:origin};
function req(path:string,body?:unknown,headers:Record<string,string>={},urlOrigin=origin){return new Request(urlOrigin+path,{method:body===undefined?"GET":"POST",headers:{host:"release.example",origin,"Content-Type":"application/json",...headers},body:body===undefined?undefined:JSON.stringify(body)});}
beforeEach(()=>{
  for(const [name,value] of Object.entries(enabled))vi.stubEnv(name,value);
  vi.stubEnv("SUPABASE_URL","https://test-project.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");vi.stubEnv("SUPABASE_SECRET_KEY","");vi.stubEnv("ASSISTANT_SERVICE_URL","");vi.stubEnv("ASSISTANT_SERVICE_SECRET","");vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","0xTEST_AUTH_KEY");vi.stubEnv("EV_MANAGEMENT_TEST_STORE","1");vi.stubGlobal("fetch",vi.fn());
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("requires every explicit production selector and the exact configured host",()=>{
  expect(visitorStorageAllowed("release.example",enabled)).toBe(true);expect(previewAllowed("release.example",enabled)).toBe(false);
  for(const key of Object.keys(enabled))expect(visitorStorageAllowed("release.example",{...enabled,[key]:""})).toBe(false);
  for(const host of [null,"localhost:3215","release.example.evil.test","preview.vercel.app","www.release.example","release.example:443"])expect(visitorStorageAllowed(host,enabled)).toBe(false);
  expect(visitorStorageAllowed("release.example",{...enabled,VERCEL_ENV:"preview"})).toBe(false);
  expect(visitorStorageAllowed("release.example",{...enabled,EV_CONVERSATION_STORAGE:"staging"})).toBe(false);
});
it("rejects unsafe or noncanonical configured origins",()=>{
  for(const value of ["http://release.example","https://release.example/","https://release.example/path","https://release.example?x=1","https://release.example#x","https://user:pass@release.example","https://release.example:8443","https://127.0.0.1","https://localhost","https://foo.localhost","not a URL"]){expect(productionStorageOrigin({...enabled,EV_MANAGEMENT_ORIGIN:value})).toBeNull();}
});
it("requires HTTPS request identity and exact Origin for production JSON writes",()=>{
  expect(visitorStorageWriteAllowed(req("/api/conversations",{}))).toBe(true);
  expect(visitorStorageRequestAllowed(req("/api/conversation-session",undefined,{},"http://release.example"))).toBe(false);
  expect(visitorStorageRequestAllowed(req("/api/conversation-session",undefined,{},"https://preview.vercel.app"))).toBe(false);
  for(const value of ["", "null","https://evil.example",origin+"/",origin+":443"])expect(visitorStorageWriteAllowed(req("/api/conversations",{},{origin:value}))).toBe(false);
  expect(visitorStorageWriteAllowed(req("/api/conversations",{},{"Content-Type":"text/plain"}))).toBe(false);
});
it("preserves loopback staging and keeps the sample API inaccessible in production",async()=>{
  expect(visitorStorageAllowed("localhost:3215",{NODE_ENV:"development",EV_MANAGEMENT_MODE:"preview",EV_CONVERSATION_STORAGE:"staging"})).toBe(true);
  expect((await sample.GET(req("/api/management/workspace"))).status).toBe(404);expect((await sample.POST(req("/api/management/workspace",{}))).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
it("allows only passive signed-out information without a principal",async()=>{
  const result=await guest.GET(req("/api/conversation-session"));expect(result.status).toBe(200);expect(await result.json()).toEqual({status:"disconnected",captchaSiteKey:"0xTEST_AUTH_KEY"});expect(result.headers.get("cache-control")).toContain("no-store");expect(result.headers.getSetCookie()).toHaveLength(0);
  const login=await owner.GET(req("/api/management/owner"));expect((await login.json()).status).toBe("signed_out");
  for(const [route,path] of [[conversations,"/api/conversations"],[operations,"/api/management/operations?view=report"],[gaps,"/api/management/gaps"]] as const)expect((await route.GET(req(path))).status).toBe(401);
  expect((await ask.POST(req("/api/conversations/ask",{action:"ask"}))).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
});
it("denies aliases and foreign-origin writes across all live routes before dispatch",async()=>{
  for(const [route,path] of [[guest,"/api/conversation-session"],[conversations,"/api/conversations"],[owner,"/api/management/owner"],[operations,"/api/management/operations"],[gaps,"/api/management/gaps"]] as const){
    expect((await route.GET(req(path,undefined,{host:"preview.vercel.app"}))).status).toBe(404);
    expect((await route.POST(req(path,{}, {origin:"https://foreign.example"}))).status).toBe(403);
  }
  expect((await ask.POST(req("/api/conversations/ask",{},{origin:"https://foreign.example"}))).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it("never exposes password bootstrap on the production owner route",async()=>{
  expect((await owner.POST(req("/api/management/owner",{action:"initialize",password:"synthetic-long-password"}))).status).toBe(404);expect(fetch).not.toHaveBeenCalled();
});
it("creates only Secure HttpOnly cookies after managed verification in production",async()=>{
  const user={id,is_anonymous:true};const session={access_token:"synthetic.access",refresh_token:"synthetic-refresh",expires_in:3600,token_type:"bearer",user};
  const f=vi.fn().mockResolvedValueOnce(Response.json(session)).mockResolvedValueOnce(Response.json(user));vi.stubGlobal("fetch",f);
  const result=await guest.POST(req("/api/conversation-session",{action:"connect",consent:"30-day-storage-v1",captchaToken:"synthetic-token"},{"x-forwarded-for":"synthetic-production-connect"}));
  expect(result.status).toBe(200);expect(await result.json()).toEqual({status:"connected"});expect(result.headers.getSetCookie()).toHaveLength(2);expect(result.headers.getSetCookie().every(c=>c.includes("HttpOnly")&&c.includes("SameSite=Strict")&&c.endsWith("; Secure"))).toBe(true);expect(f).toHaveBeenCalledTimes(2);
});
it("still requires current MFA before any transcript read in enabled production mode",async()=>{
  const user={id,is_anonymous:false};const f=vi.fn();for(const value of [user,{owner:true,assured:false},user,{owner:true,assured:false}])f.mockResolvedValueOnce(Response.json(value));vi.stubGlobal("fetch",f);
  const result=await owner.GET(req("/api/management/owner?conversation="+id,undefined,{cookie:"ev-owner-access=synthetic-owner-token"}));expect(result.status).toBe(401);expect(f).toHaveBeenCalledTimes(4);expect(f.mock.calls.every(call=>!String(call[0]).includes("ev_messages"))).toBe(true);
});
it("reads a transcript only after managed current-owner and MFA checks",async()=>{
  const user={id,is_anonymous:false};const f=vi.fn();for(const value of [user,{owner:true,assured:true},user,{owner:true,assured:true},user,[]])f.mockResolvedValueOnce(Response.json(value));vi.stubGlobal("fetch",f);
  const result=await owner.GET(req("/api/management/owner?conversation="+id,undefined,{cookie:"ev-owner-access=synthetic-owner-token"}));expect(result.status).toBe(200);expect(await result.json()).toEqual({messages:[]});expect(f).toHaveBeenCalledTimes(6);expect(String(f.mock.calls[5][0])).toContain("/rest/v1/ev_messages?");expect(result.headers.get("cache-control")).toContain("no-store");
});

// ADR-0025: the admin switch alone opens the owner panel and nothing a visitor uses.
const adminOnly={NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",EV_ADMIN_MODE:"live",EV_MANAGEMENT_ORIGIN:origin};
function adminOnlyEnvironment(){vi.stubEnv("EV_CONVERSATION_STORAGE","");}
it("opens the admin gate without visitor storage when only the admin switch is set",()=>{
  expect(adminAllowed("release.example",adminOnly)).toBe(true);expect(productionAdminOrigin(adminOnly)).toBe(origin);
  expect(visitorStorageAllowed("release.example",adminOnly)).toBe(false);expect(productionStorageOrigin(adminOnly)).toBeNull();
  for(const key of Object.keys(adminOnly))expect(adminAllowed("release.example",{...adminOnly,[key]:""})).toBe(false);
  for(const host of [null,"localhost:3215","preview.vercel.app","www.release.example"])expect(adminAllowed(host,adminOnly)).toBe(false);
  expect(visitorStorageAllowed("release.example",{...adminOnly,EV_CONVERSATION_STORAGE:"staging"})).toBe(false);
});
it("gives visitor storage no way in without the admin switch",()=>{
  expect(visitorStorageAllowed("release.example",{...enabled,EV_ADMIN_MODE:""})).toBe(false);
  expect(productionStorageOrigin({...enabled,EV_ADMIN_MODE:""})).toBeNull();
});
it("no longer treats the retired EV_MANAGEMENT_MODE=live selector as a production switch",()=>{
  const legacy={NODE_ENV:"production",VERCEL:"1",VERCEL_ENV:"production",EV_MANAGEMENT_MODE:"live",EV_CONVERSATION_STORAGE:"production",EV_MANAGEMENT_ORIGIN:origin};
  expect(adminAllowed("release.example",legacy)).toBe(false);expect(visitorStorageAllowed("release.example",legacy)).toBe(false);
});
it("keeps loopback staging identical for both gates",()=>{
  const staging={NODE_ENV:"development",EV_MANAGEMENT_MODE:"preview",EV_CONVERSATION_STORAGE:"staging"};
  expect(adminAllowed("localhost:3215",staging)).toBe(true);expect(visitorStorageAllowed("localhost:3215",staging)).toBe(true);
  expect(adminAllowed("localhost:3215",{...staging,EV_CONVERSATION_STORAGE:""})).toBe(false);
});
it("applies the same exact-origin and JSON rules to admin requests",()=>{
  adminOnlyEnvironment();
  expect(adminWriteAllowed(req("/api/management/owner",{}))).toBe(true);
  expect(adminRequestAllowed(req("/api/management/owner",undefined,{},"https://preview.vercel.app"))).toBe(false);
  for(const value of ["","null","https://evil.example",origin+"/"])expect(adminWriteAllowed(req("/api/management/owner",{},{origin:value}))).toBe(false);
  expect(adminWriteAllowed(req("/api/management/owner",{},{"Content-Type":"text/plain"}))).toBe(false);
  expect(visitorStorageRequestAllowed(req("/api/conversations"))).toBe(false);expect(visitorStorageWriteAllowed(req("/api/conversations",{}))).toBe(false);
});
it("returns 404 from every visitor-storage route when only the admin switch is set",async()=>{
  adminOnlyEnvironment();
  expect((await guest.GET(req("/api/conversation-session"))).status).toBe(404);
  expect((await guest.POST(req("/api/conversation-session",{action:"connect",consent:"30-day-storage-v1",captchaToken:"synthetic-token"}))).status).toBe(404);
  expect((await conversations.GET(req("/api/conversations"))).status).toBe(404);
  expect((await conversations.POST(req("/api/conversations",{action:"append_assistant"}))).status).toBe(404);
  expect((await ask.POST(req("/api/conversations/ask",{action:"ask"}))).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it("serves the owner routes when only the admin switch is set, still behind sign-in",async()=>{
  adminOnlyEnvironment();
  expect(await (await owner.GET(req("/api/management/owner"))).json()).toMatchObject({status:"signed_out"});
  for(const [route,path] of [[operations,"/api/management/operations?view=report"],[gaps,"/api/management/gaps"]] as const)expect((await route.GET(req(path))).status).toBe(401);
  expect((await owner.GET(req("/api/management/owner?view=rag"))).status).toBe(200);
  expect(await (await owner.GET(req("/api/management/owner?view=rag"))).json()).toMatchObject({status:"signed_out"});
  expect((await sample.GET(req("/api/management/workspace"))).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it("serves the RAG configuration only to the current MFA-verified owner, without chunk text",async()=>{
  adminOnlyEnvironment();const user={id,is_anonymous:false};
  const denied=vi.fn();for(const value of [user,{owner:true,assured:false}])denied.mockResolvedValueOnce(Response.json(value));vi.stubGlobal("fetch",denied);
  const refused=await owner.GET(req("/api/management/owner?view=rag",undefined,{cookie:"ev-owner-access=synthetic-owner-token"}));
  expect(refused.status).toBe(401);expect(await refused.json()).not.toHaveProperty("rag");
  const allowed=vi.fn();for(const value of [user,{owner:true,assured:true}])allowed.mockResolvedValueOnce(Response.json(value));vi.stubGlobal("fetch",allowed);
  const result=await owner.GET(req("/api/management/owner?view=rag",undefined,{cookie:"ev-owner-access=synthetic-owner-token"}));
  expect(result.status).toBe(200);expect(result.headers.get("cache-control")).toContain("no-store");
  const {rag}=await result.json();expect(rag.targetWords).toBe(180);expect(rag.chunks.length).toBeGreaterThan(0);
  expect(rag.chunks.every((chunk:Record<string,unknown>)=>Object.keys(chunk).join()==="tokens")).toBe(true);
  expect(allowed).toHaveBeenCalledTimes(2);
});
