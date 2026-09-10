/** @vitest-environment node */
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
vi.mock("@/lib/assistant/service",()=>({readServiceConfig:vi.fn(()=>({url:"https://backend.example",secret:"test"})),askAssistantService:vi.fn(async()=>({state:"unavailable"}))}));
import { askAssistantService } from "@/lib/assistant/service";
import { POST } from "./route";
const U="10000000-0000-4000-8000-000000000001",C="20000000-0000-4000-8000-000000000001",R="30000000-0000-4000-8000-000000000001",M="40000000-0000-4000-8000-000000000001";
const body={action:"ask",question:"What services does OJ offer?",conversationId:C,requestId:R,history:[]};
function req(value:unknown=body,headers:Record<string,string>={}){return new Request("http://localhost:3215/api/conversations/ask",{method:"POST",headers:{host:"localhost:3215",origin:"http://localhost:3215","content-type":"application/json",cookie:"ev-staging-access=synthetic.token",...headers},body:JSON.stringify(value)});}
function mock(...responses:Response[]){const fetcher=vi.fn();responses.forEach(r=>fetcher.mockResolvedValueOnce(r));vi.stubGlobal("fetch",fetcher);return fetcher;}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("NODE_ENV","development");vi.stubEnv("EV_MANAGEMENT_MODE","preview");vi.stubEnv("EV_CONVERSATION_STORAGE","staging");vi.stubEnv("VERCEL","");vi.stubEnv("SUPABASE_URL","https://test-project.supabase.co");vi.stubEnv("SUPABASE_PUBLISHABLE_KEY","sb_publishable_test");vi.stubEnv("SUPABASE_SECRET_KEY","sb_secret_test");vi.stubEnv("EV_CONVERSATION_RECEIPT_SECRET","a".repeat(64));});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("durable generation admission and saving",()=>{
  it("denies production and cross-origin requests before any service call",async()=>{
    const fetcher=mock();vi.stubEnv("NODE_ENV","production");expect((await POST(req())).status).toBe(404);vi.stubEnv("NODE_ENV","development");expect((await POST(req(body,{origin:"https://evil.example"}))).status).toBe(403);expect(fetcher).not.toHaveBeenCalled();expect(askAssistantService).not.toHaveBeenCalled();
  });
  it("screens private input before Auth, storage or generation",async()=>{
    const fetcher=mock();const response=await POST(req({...body,question:"My email is person@example.com"}));expect((await response.json()).saved).toBe(false);expect(fetcher).not.toHaveBeenCalled();expect(askAssistantService).not.toHaveBeenCalled();
  });
  it("claims once before generation and saves the resulting answer",async()=>{
    const fetcher=mock(Response.json({id:U}),Response.json(M),Response.json({claimed:true,result:null}),Response.json(M));
    const response=await POST(req());expect(await response.json()).toEqual({result:{state:"unavailable"},saved:true});expect(askAssistantService).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.map(c=>String(c[0]).split("/").at(-1))).toEqual(["user","ev_append_user_message","ev_claim_generation","ev_complete_generation"]);
  });
  it("returns a completed request without another paid dispatch",async()=>{
    mock(Response.json({id:U}),Response.json(M),Response.json({claimed:false,result:{state:"unavailable"}}));
    expect(await (await POST(req())).json()).toEqual({result:{state:"unavailable"},saved:true,replayed:true});expect(askAssistantService).not.toHaveBeenCalled();
  });
  it("never reissues an unfinished or uncertain claim",async()=>{
    mock(Response.json({id:U}),Response.json(M),Response.json({claimed:false,result:null}));expect((await POST(req())).status).toBe(409);expect(askAssistantService).not.toHaveBeenCalled();
    const fetcher=mock(Response.json({id:U}),Response.json(M));fetcher.mockRejectedValueOnce(new Error("uncertain claim"));expect((await POST(req())).status).toBe(503);expect(askAssistantService).not.toHaveBeenCalled();
  });
  it("preserves the reply with a signed receipt when saving fails, then retries saving only",async()=>{
    const fetcher=mock(Response.json({id:U}),Response.json(M),Response.json({claimed:true,result:null}));fetcher.mockRejectedValueOnce(new Error("lost save response"));
    const failed=await (await POST(req())).json();expect(failed).toMatchObject({result:{state:"unavailable"},saved:false});expect(typeof failed.receipt).toBe("string");expect(askAssistantService).toHaveBeenCalledTimes(1);
    const saver=mock(Response.json({id:U}),Response.json(M));const saved=await POST(req({action:"save",receipt:failed.receipt}));expect(await saved.json()).toEqual({saved:true});expect(askAssistantService).toHaveBeenCalledTimes(1);expect(saver.mock.calls).toHaveLength(2);
    mock(Response.json({id:C}));expect((await POST(req({action:"save",receipt:failed.receipt}))).status).toBe(400);expect(askAssistantService).toHaveBeenCalledTimes(1);
  });
});

it("saves trusted diagnostics with the reply and keeps encrypted retries private",async()=>{
 const event={version:1 as const,outcome:"not_covered" as const,route:"primary" as const,model:"synthetic-model",retrieved:["project-cited.md"],cited:[],latencyMs:321,corpusSha256:"a".repeat(64),promptSha256:"b".repeat(64)};
 vi.mocked(askAssistantService).mockImplementationOnce(async(_q,_c,_h,options)=>{options?.onEvent?.(event);return {state:"not-covered",answer:"Synthetic unsupported reply",modelRoute:"primary"};});
 const fetcher=mock(Response.json({id:U}),Response.json(M),Response.json({claimed:true,result:null}));fetcher.mockRejectedValueOnce(new Error("lost save response"));
 const failed=await(await POST(req({...body,requestId:"30000000-0000-4000-8000-000000000099",event:{outcome:"answered"}}))).json();
 expect(failed.saved).toBe(false);expect(failed.result).not.toHaveProperty("event");expect(failed.receipt).toMatch(/^v2\./);
 expect(Buffer.from(failed.receipt.slice(3),"base64url").toString()).not.toContain("synthetic-model");
 expect(JSON.parse(fetcher.mock.calls.at(-1)?.[1].body).p_event).toEqual(event);
 const saver=mock(Response.json({id:U}),Response.json(M));expect(await(await POST(req({action:"save",receipt:failed.receipt}))).json()).toEqual({saved:true});
 expect(saver.mock.calls.at(-1)?.[0]).toContain("ev_complete_generation_event");expect(JSON.parse(saver.mock.calls.at(-1)?.[1].body).p_event).toEqual(event);expect(askAssistantService).toHaveBeenCalledTimes(1);
});
