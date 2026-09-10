/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { ConversationStorageError, createAssistantPersistenceWriter, createGuestConversationRepository, type AssistantRecord } from "./conversation-repository";
const A="10000000-0000-4000-8000-000000000001", C="20000000-0000-4000-8000-000000000001", R="30000000-0000-4000-8000-000000000001", M="40000000-0000-4000-8000-000000000001";
const config={projectUrl:"https://test-project.supabase.co",publishableKey:"sb_publishable_synthetic"};
const record:AssistantRecord={userId:A,conversationId:C,requestId:R,body:"Sample answer",outcome:"answered",route:"primary",model:"synthetic",retrieved:["services.md"],cited:["services.md"],latencyMs:900,corpusSha256:"a".repeat(64),promptSha256:"b".repeat(64)};
function mock(...responses: Response[]) { const fn=vi.fn<typeof fetch>();responses.forEach((r)=>fn.mockResolvedValueOnce(r));return fn; }
describe("authenticated conversation persistence adapter", () => {
  it("verifies the user with Auth before making any database request", async () => {
    const fetcher=mock(Response.json({id:A}),Response.json(C));
    const repo=await createGuestConversationRepository(config,"synthetic-user-token",fetcher);
    expect(repo.userId).toBe(A);await repo.create(C,"ev");
    expect(fetcher.mock.calls.map(([url])=>url)).toEqual(["https://test-project.supabase.co/auth/v1/user","https://test-project.supabase.co/rest/v1/rpc/ev_create_conversation"]);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({apikey:config.publishableKey,Authorization:"Bearer synthetic-user-token"});
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({p_id:C,p_app:"ev"});
  });
  it.each([401,403])("rejects expired/invalid sessions with status %s before any data request", async (status) => {
    const fetcher=mock(Response.json({error:"Invalid JWT"},{status}));
    await expect(createGuestConversationRepository(config,"expired-token",fetcher)).rejects.toMatchObject({kind:"unauthorized"});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not trust a locally decoded or malformed auth identity", async () => {
    const fetcher=mock(Response.json({user_metadata:{id:A},id:"not-a-uuid"}));
    await expect(createGuestConversationRepository(config,"unverified-token",fetcher)).rejects.toMatchObject({kind:"unauthorized"});
  });
  it.each(["http://test-project.supabase.co","https://attacker.example","https://test-project.supabase.co@evil.example","https://test-project.supabase.co/redirect"])("refuses credential dispatch to an invalid project origin %s", async (projectUrl) => {
    const fetcher=mock();await expect(createGuestConversationRepository({...config,projectUrl},"token",fetcher)).rejects.toBeInstanceOf(ConversationStorageError);expect(fetcher).not.toHaveBeenCalled();
  });
  it("validates returned records and rejects mismatched conversation IDs", async () => {
    const fetcher=mock(Response.json({id:A}),Response.json([{id:M,conversation_id:R,request_id:R,sequence:1,role:"user",body:"Sample",created_at:"2026-09-08T10:00:00Z"}]));
    const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.messages(C)).rejects.toMatchObject({kind:"unavailable"});
  });
  it("bounds list queries and preserves an actual empty list", async () => {
    const fetcher=mock(Response.json({id:A}),Response.json([]));const repo=await createGuestConversationRepository(config,"token",fetcher);
    expect(await repo.list("cited")).toEqual([]);expect(String(fetcher.mock.calls[1][0])).toContain("app=eq.cited");expect(String(fetcher.mock.calls[1][0])).toContain("limit=12");
  });
  it("does not silently turn malformed data into an empty conversation history", async () => {
    const fetcher=mock(Response.json({id:A}),Response.json({unexpected:"data"}));const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.list("ev")).rejects.toMatchObject({kind:"unavailable"});
  });
  it("rejects invalid input before a database call", async () => {
    const fetcher=mock(Response.json({id:A}));const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.appendUser(C,R,"x".repeat(12001))).rejects.toMatchObject({kind:"invalid"});
    await expect(repo.messages("not-uuid&user_id=all")).rejects.toMatchObject({kind:"invalid"});expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("accepts an empty successful void RPC response for feedback", async () => {
    const fetcher=mock(Response.json({id:A}),new Response(null,{status:204}));const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.feedback(M,true)).resolves.toBeUndefined();
  });
  it("deletes only the exact conversation and validates the returned deletion receipt",async()=>{
    const fetcher=mock(Response.json({id:A}),Response.json([{id:C}]),Response.json([]));
    const repo=await createGuestConversationRepository(config,"token",fetcher);
    expect(await repo.remove(C)).toBe(true);expect(await repo.remove(C)).toBe(false);
    expect(fetcher.mock.calls[1][0]).toBe(`https://test-project.supabase.co/rest/v1/ev_conversations?id=eq.${C}&select=id`);
    expect(fetcher.mock.calls[1][1]).toMatchObject({method:"DELETE",headers:{Prefer:"return=representation",Authorization:"Bearer token"}});
  });
  it("does not claim deletion when the server returns a different record",async()=>{
    const fetcher=mock(Response.json({id:A}),Response.json([{id:R}]));
    const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.remove(C)).rejects.toMatchObject({kind:"unavailable"});
  });
  it.each([["22000","conflict"],["54000","limit"]])("maps database code %s without leaking upstream details", async (code,kind) => {
    const fetcher=mock(Response.json({id:A}),Response.json({code,message:"private details"},{status:400}));const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.appendUser(C,R,"Sample question")).rejects.toMatchObject({kind});
  });
  it("reports an interrupted save as unavailable without logging tokens", async () => {
    const fetcher=mock(Response.json({id:A}));fetcher.mockRejectedValueOnce(new Error("Authorization: private-token"));
    const repo=await createGuestConversationRepository(config,"token",fetcher);
    await expect(repo.appendUser(C,R,"Sample question")).rejects.toThrow("Your reply has not been saved");
  });
});
describe("server-only assistant storage", () => {
  it("uses modern secret keys only in the apikey header and preserves retry identity", async () => {
    const fetcher=mock(Response.json(M),Response.json(M));const writer=createAssistantPersistenceWriter(config,"sb_secret_synthetic",fetcher);
    expect(await writer(record)).toBe(M);expect(await writer(record)).toBe(M);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({apikey:"sb_secret_synthetic","Content-Type":"application/json"});
    expect(fetcher.mock.calls[0][1]?.body).toEqual(fetcher.mock.calls[1][1]?.body);
    expect(fetcher.mock.calls.every(([url])=>url==="https://test-project.supabase.co/rest/v1/rpc/ev_append_assistant_message")).toBe(true);
  });
  it("rejects malformed assistant records before any write", async () => {
    const fetcher=mock();const writer=createAssistantPersistenceWriter(config,"sb_secret_synthetic",fetcher);
    await expect(writer({...record,corpusSha256:"wrong"})).rejects.toMatchObject({kind:"invalid"});expect(fetcher).not.toHaveBeenCalled();
  });
});
