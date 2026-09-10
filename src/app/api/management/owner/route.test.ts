/** @vitest-environment node */
import { beforeEach,afterEach,it,expect,vi } from "vitest";
import {GET,POST} from "./route";
function req(body?:unknown,origin="http://localhost:3215",cookie="") {return new Request("http://localhost:3215/api/management/owner",{method:body===undefined?"GET":"POST",headers:{host:"localhost:3215",origin,"Content-Type":"application/json",cookie},body:body===undefined?undefined:JSON.stringify(body)});}
beforeEach(()=>{vi.stubEnv("NODE_ENV","development");vi.stubEnv("EV_MANAGEMENT_TEST_STORE","1");vi.stubEnv("EV_MANAGEMENT_MODE","preview");vi.stubEnv("EV_CONVERSATION_STORAGE","staging");vi.stubEnv("VERCEL","");vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","");vi.stubEnv("SUPABASE_URL","https://test-project.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("denies production and creates no identity on passive reads",async()=>{const f=vi.fn();vi.stubGlobal("fetch",f);expect(await(await GET(req())).json()).toEqual({status:"signed_out",authCaptcha:{required:false,siteKey:null}});vi.stubEnv("NODE_ENV","production");expect((await GET(req())).status).toBe(404);expect((await POST(req({action:"sign_in"}))).status).toBe(404);expect(f).not.toHaveBeenCalled();});
it("rejects foreign-origin and oversized writes before contacting Auth",async()=>{const f=vi.fn();vi.stubGlobal("fetch",f);expect((await POST(req({action:"enroll"},"https://foreign.example"))).status).toBe(403);expect((await POST(req({action:"sign_in",email:"x".repeat(5000)}))).status).toBe(400);expect(f).not.toHaveBeenCalled();});
it("never returns session credentials in a successful login body",async()=>{const f=vi.fn().mockResolvedValueOnce(Response.json({access_token:"synthetic.token",refresh_token:"synthetic-refresh",expires_in:3600})).mockResolvedValueOnce(Response.json({id:"10000000-0000-4000-8000-000000000001",is_anonymous:false})).mockResolvedValueOnce(Response.json({owner:true,assured:false}));vi.stubGlobal("fetch",f);const r=await POST(req({action:"sign_in",email:"owner@example.test",password:"synthetic-password"}));expect(r.status).toBe(200);expect(await r.json()).toEqual({status:"mfa_required",factorId:null});expect(r.headers.getSetCookie()).toHaveLength(2);expect(r.headers.get("cache-control")).toContain("no-store");});
it("does not clear owner cookies when revocation is uncertain",async()=>{const f=vi.fn().mockResolvedValueOnce(Response.json({id:"10000000-0000-4000-8000-000000000001",is_anonymous:false})).mockResolvedValueOnce(Response.json({owner:true,assured:true})).mockRejectedValueOnce(new Error("Network failure"));vi.stubGlobal("fetch",f);const r=await POST(req({action:"sign_out"},undefined,"ev-owner-access=token"));expect(r.status).toBe(503);expect(r.headers.getSetCookie()).toHaveLength(0);});

it("passes a single-use CAPTCHA to owner password Auth and still requires MFA",async()=>{
  vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","0xTEST_AUTH_KEY");
  const f=vi.fn().mockResolvedValueOnce(Response.json({access_token:"synthetic.token",refresh_token:"synthetic-refresh",expires_in:3600})).mockResolvedValueOnce(Response.json({id:"10000000-0000-4000-8000-000000000001",is_anonymous:false})).mockResolvedValueOnce(Response.json({owner:true,assured:false}));vi.stubGlobal("fetch",f);
  expect((await(await GET(req())).json()).authCaptcha).toEqual({required:true,siteKey:"0xTEST_AUTH_KEY"});
  const result=await POST(req({action:"sign_in",email:"owner@example.test",password:"synthetic-password",captchaToken:"synthetic-owner-token"}));
  expect(result.status).toBe(200);expect(await result.json()).toEqual({status:"mfa_required",factorId:null});expect(f).toHaveBeenCalledTimes(3);
  expect(JSON.parse(f.mock.calls[0][1].body).gotrue_meta_security).toEqual({captcha_token:"synthetic-owner-token"});
});
it("rejects missing owner verification and malformed configuration before password dispatch",async()=>{
  const f=vi.fn();vi.stubGlobal("fetch",f);vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","0xTEST_AUTH_KEY");
  expect((await POST(req({action:"sign_in",email:"owner@example.test",password:"synthetic-password"}))).status).toBe(400);
  vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","bad key");
  expect((await POST(req({action:"sign_in",email:"owner@example.test",password:"synthetic-password",captchaToken:"synthetic-token"}))).status).toBe(503);
  expect(f).not.toHaveBeenCalled();
});
it("blocks the one-time password bootstrap before mutation when CAPTCHA is armed",async()=>{
  const f=vi.fn();vi.stubGlobal("fetch",f);vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","0xTEST_AUTH_KEY");
  expect((await POST(req({action:"initialize",password:"synthetic-long-password"}))).status).toBe(409);expect(f).not.toHaveBeenCalled();
});
