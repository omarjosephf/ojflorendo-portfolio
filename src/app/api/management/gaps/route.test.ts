/** @vitest-environment node */
import {afterEach,beforeEach,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({existing:vi.fn(),gaps:vi.fn(),reviewGap:vi.fn()}));
vi.mock("@/lib/management/owner-session",()=>({ownerAuth:()=>mocks,ownerCookieHeaders:()=>[]}));
import {GET,POST} from "./route";
import {ConversationStorageError} from "@/lib/management/conversation-repository";
function req(body?:unknown,origin="http://localhost:3215"){return new Request("http://localhost:3215/api/management/gaps",{method:body===undefined?"GET":"POST",headers:{host:"localhost:3215",origin,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv("NODE_ENV","development");vi.stubEnv("VERCEL","");vi.stubEnv("EV_MANAGEMENT_MODE","preview");vi.stubEnv("EV_CONVERSATION_STORAGE","staging");mocks.existing.mockResolvedValue({token:"synthetic"});});
afterEach(()=>vi.unstubAllEnvs());
it("denies production and cross-origin writes before authentication",async()=>{vi.stubEnv("NODE_ENV","production");expect((await GET(req())).status).toBe(404);expect((await POST(req({}))).status).toBe(404);vi.stubEnv("NODE_ENV","development");expect((await POST(req({},"https://evil.example"))).status).toBe(403);expect(mocks.existing).not.toHaveBeenCalled();});
it("returns no-store owner rows and checked save receipts",async()=>{mocks.gaps.mockResolvedValue([]);const read=await GET(req());expect(await read.json()).toEqual({gaps:[]});expect(read.headers.get("Cache-Control")).toContain("no-store");mocks.reviewGap.mockResolvedValue({messageId:"synthetic-id",revision:1});expect((await POST(req({note:"Synthetic note"}))).status).toBe(200);expect(mocks.reviewGap).toHaveBeenCalledWith("synthetic",{note:"Synthetic note"});});
it("returns an explicit conflict and does not retry a write",async()=>{mocks.reviewGap.mockRejectedValue(new ConversationStorageError("conflict"));const res=await POST(req({note:"Synthetic note"}));expect(res.status).toBe(409);expect((await res.json()).error).toContain("Keep your note");expect(mocks.reviewGap).toHaveBeenCalledTimes(1);});
it("rejects oversized input before owner lookup",async()=>{expect((await POST(req({note:"x".repeat(9000)}))).status).toBe(400);expect(mocks.existing).not.toHaveBeenCalled();});
