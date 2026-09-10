/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const user={id:"10000000-0000-4000-8000-000000000001",is_anonymous:true};
const session={access_token:"synthetic.access.token",refresh_token:"synthetic-refresh",expires_in:3600,token_type:"bearer",user};
function req(body?:unknown,cookie="",headers:Record<string,string>={}){return new Request("http://localhost:3215/api/conversation-session",{method:body===undefined?"GET":"POST",headers:{host:"localhost:3215",origin:"http://localhost:3215","content-type":"application/json",cookie,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function mock(...responses:Response[]){const fetcher=vi.fn();for(const r of responses)fetcher.mockResolvedValueOnce(r);vi.stubGlobal("fetch",fetcher);return fetcher;}
beforeEach(()=>{vi.stubEnv("NODE_ENV","development");vi.stubEnv("EV_MANAGEMENT_MODE","preview");vi.stubEnv("EV_CONVERSATION_STORAGE","staging");vi.stubEnv("VERCEL","");vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","0xTEST_AUTH_KEY");vi.stubEnv("SUPABASE_URL","https://test-project.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("managed guest session boundary",()=>{
  it("denies production and never creates sessions on passive reads",async()=>{
    const fetcher=mock();expect(await (await GET(req())).json()).toEqual({status:"disconnected",captchaSiteKey:"0xTEST_AUTH_KEY"});
    vi.stubEnv("NODE_ENV","production");expect((await GET(req())).status).toBe(404);expect((await POST(req({action:"connect",consent:"30-day-storage-v1"}))).status).toBe(404);expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires same-origin JSON and explicit retention consent",async()=>{
    const fetcher=mock();expect((await POST(req({action:"connect"}))).status).toBe(400);
    expect((await POST(req({action:"connect",consent:"30-day-storage-v1"},"",{origin:"https://evil.example"}))).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
  });
  it("creates and verifies a managed anonymous session while hiding tokens from JSON",async()=>{
    const fetcher=mock(Response.json(session),Response.json(user));
    const response=await POST(req({action:"connect",consent:"30-day-storage-v1",captchaToken:"synthetic-fresh-token"},"",{"x-forwarded-for":"test-connect"}));
    expect(response.status).toBe(200);expect(await response.json()).toEqual({status:"connected"});
    expect(JSON.parse(fetcher.mock.calls[0][1].body).gotrue_meta_security).toEqual({captcha_token:"synthetic-fresh-token"});
    const cookies=response.headers.getSetCookie();expect(cookies).toHaveLength(2);
    expect(cookies.every(c=>c.includes("HttpOnly")&&c.includes("SameSite=Strict")&&c.includes("Path=/api/"))).toBe(true);
    expect(cookies[1]).toContain("Max-Age=2592000");expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fetcher.mock.calls.map(c=>String(c[0]))).toEqual(["https://test-project.supabase.co/auth/v1/signup","https://test-project.supabase.co/auth/v1/user"]);
  });
  it("reuses a verified session instead of creating another identity",async()=>{
    vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY","");
    const fetcher=mock(Response.json(user));
    expect((await POST(req({action:"connect",consent:"30-day-storage-v1"},"ev-staging-access=valid.token"))).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refreshes through one managed request, verifies identity, and rotates cookies",async()=>{
    const fetcher=mock(Response.json(session),Response.json(user));
    const response=await GET(req(undefined,"ev-staging-refresh=synthetic-refresh"));expect(response.status).toBe(200);expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(fetcher.mock.calls[0][0]).toBe("https://test-project.supabase.co/auth/v1/token?grant_type=refresh_token");
  });
  it("does not turn a permanent or owner identity into a guest connection",async()=>{
    mock(Response.json({...user,is_anonymous:false}));
    const response=await GET(req(undefined,"ev-staging-access=valid.token"));expect((await response.json()).status).toBe("disconnected");
  });
  it("does not replace a revoked guest with a new anonymous account",async()=>{
    const fetcher=mock(Response.json({msg:"Invalid session"},{status:403}),Response.json({error_code:"refresh_token_not_found"},{status:400}));
    const response=await POST(req({action:"connect",consent:"30-day-storage-v1"},"ev-staging-access=old.token; ev-staging-refresh=old-refresh"));expect(response.status).toBe(401);expect(response.headers.getSetCookie()).toHaveLength(0);expect(fetcher.mock.calls.every(c=>!String(c[0]).endsWith("/signup"))).toBe(true);
  });
  it("revokes before clearing cookies and never clears them after an uncertain network failure",async()=>{
    const fetcher=mock(Response.json(user),new Response(null,{status:204}));
    const response=await POST(req({action:"disconnect"},"ev-staging-access=valid.token"));expect(response.status).toBe(200);expect(response.headers.getSetCookie().every(c=>c.includes("Max-Age=0"))).toBe(true);
    expect(fetcher.mock.calls[1][0]).toBe("https://test-project.supabase.co/auth/v1/logout?scope=local");
    mock(Response.json(user),Response.json({error_code:"failure"},{status:503}));
    const failed=await POST(req({action:"disconnect"},"ev-staging-access=valid.token"));expect(failed.status).toBe(503);expect(failed.headers.getSetCookie()).toHaveLength(0);
  });
});

it("keeps new identity creation closed without configuration or a bounded fresh token",async()=>{
  const fetcher=mock();
  for(const captchaToken of [undefined,""," ","x".repeat(2049),42,{}])expect((await POST(req({action:"connect",consent:"30-day-storage-v1",captchaToken}))).status).toBe(400);
  for(const key of ["","malformed key"]) {vi.stubEnv("EV_AUTH_TURNSTILE_SITE_KEY",key);expect((await POST(req({action:"connect",consent:"30-day-storage-v1",captchaToken:"synthetic"}))).status).toBe(503);}
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not create cookies or retry when managed Auth rejects verification",async()=>{
  const fetcher=mock(Response.json({error_code:"captcha_failed",msg:"Synthetic verification rejection"},{status:422}));
  const result=await POST(req({action:"connect",consent:"30-day-storage-v1",captchaToken:"synthetic-invalid-token"},"",{"x-forwarded-for":"test-captcha-rejection"}));
  expect(result.status).toBe(401);expect(result.headers.getSetCookie()).toHaveLength(0);expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(await result.json())).not.toContain("synthetic-invalid-token");
});
