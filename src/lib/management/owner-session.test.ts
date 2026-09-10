/** @vitest-environment node */
import { describe,it,expect,vi } from "vitest";
import { ownerAuth,ownerCookieHeaders } from "./owner-session";
const config={projectUrl:"https://test-project.supabase.co",publishableKey:"sb_publishable_test"};
const id="10000000-0000-4000-8000-000000000001", factor="20000000-0000-4000-8000-000000000001";
const user={id,is_anonymous:false,factors:[{id:factor,factor_type:"totp",status:"verified"}]};
const session={access_token:"synthetic.access",refresh_token:"synthetic-refresh",expires_in:3600};
function mock(...data:unknown[]){const f=vi.fn();for(const d of data)f.mockResolvedValueOnce(d instanceof Response?d:Response.json(d));return f;}
const request=(cookie:string)=>new Request("http://localhost/api/management/owner",{headers:{cookie}});
describe("owner managed session and live reads",()=>{
  it("keeps separate HttpOnly owner cookies scoped to management APIs",()=>{
    const cookies=ownerCookieHeaders(session,true);expect(cookies).toHaveLength(2);
    expect(cookies.every(c=>c.includes("Path=/api/management/;")&&c.includes("HttpOnly")&&c.includes("SameSite=Strict")&&c.includes("Secure"))).toBe(true);
    expect(cookies.join(" ")).not.toContain("ev-staging-");expect(ownerCookieHeaders(null,false).every(c=>c.includes("Max-Age=0"))).toBe(true);
  });
  it("requires verified Auth and trusted owner RPC before admitting a password login",async()=>{
    const f=mock(session,user,{owner:true,assured:false});
    const result=await ownerAuth(config,AbortSignal.timeout(5000),f).signIn("owner@example.test","synthetic-password");
    expect(result.state).toEqual({owner:true,assured:false,factorId:factor});
    expect(f.mock.calls.map(c=>String(c[0]))).toEqual([`${config.projectUrl}/auth/v1/token?grant_type=password`,`${config.projectUrl}/auth/v1/user`,`${config.projectUrl}/rest/v1/rpc/ev_owner_session_state`]);
    expect(f.mock.calls.every(c=>c[1].redirect==="error"&&c[1].cache==="no-store")).toBe(true);
  });
  it("rejects an anonymous principal even with owner-like metadata",async()=>{
    const f=mock({...user,is_anonymous:true,user_metadata:{role:"owner"}});
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).state("token")).rejects.toMatchObject({kind:"unauthorized"});expect(f).toHaveBeenCalledTimes(1);
  });
  it("revokes a newly created login if the trusted owner check rejects it",async()=>{
    const f=mock(session,user,{owner:false,assured:false},new Response(null,{status:204}));
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).signIn("visitor@example.test","synthetic-password")).rejects.toMatchObject({kind:"unauthorized"});
    expect(f.mock.calls.at(-1)?.[0]).toContain("/logout?scope=local");
  });
  it("does not read transcripts with owner AAL1",async()=>{
    const f=mock(user,{owner:true,assured:false});
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).messages("token",id)).rejects.toMatchObject({kind:"unauthorized"});
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("validates pagination before sending any database filter",async()=>{
    const f=mock(user,{owner:true,assured:true});
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).conversations("token","injected&filter")).rejects.toMatchObject({kind:"invalid"});expect(f).toHaveBeenCalledTimes(2);
  });
  it("paginates with a bounded timestamp and ID and excludes client-controlled sort syntax",async()=>{
    const rows=Array.from({length:25},(_,i)=>({id:`30000000-0000-4000-8000-${String(i).padStart(12,"0")}`,user_id:id,app:"ev",created_at:"2026-09-09T00:00:00+00:00",expires_at:"2026-10-09T00:00:00+00:00"}));
    const f=mock(user,{owner:true,assured:true},rows,user,{owner:true,assured:true},[]);
    const auth=ownerAuth(config,AbortSignal.timeout(5000),f),page=await auth.conversations("token");expect(page.conversations).toHaveLength(25);expect(page.next).toBeTypeOf("string");
    expect((await auth.conversations("token",page.next!)).next).toBeNull();expect(f.mock.calls.at(-1)?.[0]).toContain("&or=(created_at.lt.2026-09-09T00%3A00%3A00%2B00%3A00,and(");
  });
  it("refreshes an expired token through one bounded attempt",async()=>{
    const f=mock(Response.json({}, {status:403}),session,user,{owner:true,assured:true});
    const result=await ownerAuth(config,AbortSignal.timeout(5000),f).existing(request("ev-owner-access=old; ev-owner-refresh=refresh"));
    expect(result.session).toEqual(session);expect(f.mock.calls.filter(c=>String(c[0]).includes("grant_type=refresh_token"))).toHaveLength(1);
  });
  it("does not refresh after an uncertain network failure",async()=>{
    const f=vi.fn().mockRejectedValue(new Error("Network failed"));
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).existing(request("ev-owner-access=old; ev-owner-refresh=refresh"))).rejects.toMatchObject({kind:"unavailable"});expect(f).toHaveBeenCalledTimes(1);
  });
  it("does not treat a successful factor verification response as authorization without the database check",async()=>{
    const f=mock(user,{owner:true,assured:false},{id},session,user,{owner:true,assured:false});
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).verify("token",factor,"123456")).rejects.toMatchObject({kind:"unauthorized"});
  });
  it("accepts the measured large enrollment envelope but returns only the setup key and factor ID",async()=>{
    const pending={...user,factors:[{id:factor,factor_type:"totp",status:"unverified",friendly_name:"E.V owner"}]};
    const f=mock(pending,{owner:true,assured:false},pending,{}, {id:factor,totp:{secret:"A".repeat(32),qr_code:"x".repeat(520000)}});
    const result=await ownerAuth(config,AbortSignal.timeout(5000),f).enroll("token");
    expect(result).toEqual({factorId:factor,secret:"A".repeat(32)});
    expect(f.mock.calls[3][1].method).toBe("DELETE");expect(f.mock.calls[3][0]).toBe(`${config.projectUrl}/auth/v1/factors/${factor}`);
  });
  it("continues to reject an enrollment response over one megabyte",async()=>{
    const f=mock({...user,factors:[]},{owner:true,assured:false},{...user,factors:[]},{id:factor,totp:{secret:"A".repeat(32),qr_code:"x".repeat(1000000)}});
    await expect(ownerAuth(config,AbortSignal.timeout(5000),f).enroll("token")).rejects.toMatchObject({kind:"unavailable"});
  });

});

it("joins bounded diagnostic events only after current owner assurance",async()=>{
 const message={id,conversation_id:id,request_id:id,sequence:1,role:"assistant",body:"Synthetic saved response",created_at:"2026-09-09T00:00:00Z"};
 const event={message_id:id,outcome:"not_covered",route:"none",model:null,retrieved:[],cited:[],latency_ms:3,corpus_sha256:"a".repeat(64),prompt_sha256:"b".repeat(64)};
 const f=mock(user,{owner:true,assured:true},user,[message],[event]);
 const messages=await ownerAuth(config,AbortSignal.timeout(5000),f).messages("token",id);
 expect(messages[0].event?.outcome).toBe("not_covered");expect(f.mock.calls.at(-1)?.[0]).toContain(`message_id=in.(${id})`);
 expect(f.mock.calls.at(-1)?.[1].headers.Authorization).toBe("Bearer token");
});
