/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
const C="20000000-0000-4000-8000-000000000001",U="10000000-0000-4000-8000-000000000001";
function request(value:unknown,headers:Record<string,string>={}) {return new Request("http://localhost:3215/api/conversations",{method:"POST",headers:{host:"localhost:3215",origin:"http://localhost:3215","content-type":"application/json",authorization:"Bearer synthetic-token",...headers},body:JSON.stringify(value)});}
beforeEach(()=>{vi.stubEnv("NODE_ENV","development");vi.stubEnv("EV_MANAGEMENT_MODE","preview");vi.stubEnv("EV_CONVERSATION_STORAGE","staging");vi.stubEnv("VERCEL","");vi.stubEnv("SUPABASE_URL","https://test-project.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("staging conversation API",()=>{
  it("requires verified identity and returns the actual deletion result",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:U})).mockResolvedValueOnce(Response.json([{id:C}]));vi.stubGlobal("fetch",fetcher);
    const response=await POST(request({action:"delete",conversationId:C}));
    expect(await response.json()).toEqual({deleted:true});expect(fetcher.mock.calls[1][1].method).toBe("DELETE");
  });
  it("rejects oversized request streams before authentication",async()=>{
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    expect((await POST(request({action:"append_user",body:"x".repeat(100001)}))).status).toBe(413);expect(fetcher).not.toHaveBeenCalled();
  });
  it("honors cancellation before parsing or authenticating",async()=>{
    const controller=new AbortController();controller.abort();const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    const req=new Request(request({action:"create",id:C,app:"ev"}),{signal:controller.signal});
    expect((await POST(req)).status).toBe(408);expect(fetcher).not.toHaveBeenCalled();
  });
  it("is disabled in production even when both flags are set",async()=>{
    vi.stubEnv("NODE_ENV","production");const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    expect((await GET(request(null))).status).toBe(404);expect((await POST(request({action:"create",id:C,app:"ev"}))).status).toBe(404);expect(fetcher).not.toHaveBeenCalled();
  });
  it("is off by default",async()=>{vi.stubEnv("EV_CONVERSATION_STORAGE","");expect((await GET(request(null))).status).toBe(404);});
  it("requires a bearer session before any Auth or database request",async()=>{
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);expect((await GET(request(null,{authorization:""}))).status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not accept browser-authored assistant messages or forged ownership",async()=>{
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    expect((await POST(request({action:"append_assistant",conversationId:C,body:"Forged reply",userId:U}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
  });
  it("denies foreign writes before authentication",async()=>{
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);expect((await POST(request({action:"create",id:C,app:"ev"},{origin:"https://evil.example"}))).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
  });
  it("passes a verified user token to the scoped RPC and ignores supplied ownership",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:U})).mockResolvedValueOnce(Response.json(C));vi.stubGlobal("fetch",fetcher);
    const response=await POST(request({action:"create",id:C,app:"ev",userId:"someone-else"}));expect(response.status).toBe(200);expect(await response.json()).toEqual({id:C,saved:true});
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({p_id:C,p_app:"ev"});expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("never reports a failed storage request as saved",async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({id:U})).mockRejectedValueOnce(new Error("private token"));vi.stubGlobal("fetch",fetcher);
    const response=await POST(request({action:"create",id:C,app:"ev"}));expect(response.status).toBe(503);const text=await response.text();expect(text).toContain('"saved":false');expect(text).not.toContain("private token");
  });
});
