/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { guestAuth, guestCookieHeaders, readGuestCookie, GUEST_ACCESS_COOKIE } from "./guest-session";
describe("guest session transport and cookies",()=>{
  it("uses Secure cookies on HTTPS and bounds token lengths",()=>{
    expect(guestCookieHeaders({access_token:"valid.token",refresh_token:"refresh",expires_in:3600},true).every(v=>v.endsWith("; Secure"))).toBe(true);
    expect(()=>guestCookieHeaders({access_token:"x".repeat(3801),refresh_token:"refresh",expires_in:3600},true)).toThrow();
    expect(()=>guestCookieHeaders({access_token:"token; injected=yes",refresh_token:"refresh",expires_in:3600},true)).toThrow();
  });
  it("rejects duplicate and malformed cookie credentials",()=>{
    const request=(cookie:string)=>new Request("http://localhost",{headers:{cookie}});
    expect(readGuestCookie(request("ev-staging-access=a; ev-staging-access=b"),GUEST_ACCESS_COOKIE)).toBeNull();
    expect(readGuestCookie(request("ev-staging-access=encoded%20token"),GUEST_ACCESS_COOKIE)).toBeNull();
    expect(readGuestCookie(request("irrelevant=yes; ev-staging-access=valid.token"),GUEST_ACCESS_COOKIE)).toBe("valid.token");
  });
  it("rejects credential dispatch to an arbitrary host",()=>{
    const fetcher=vi.fn();expect(()=>guestAuth({projectUrl:"https://evil.example",publishableKey:"sb_publishable_test"},new AbortController().signal,fetcher)).toThrow();expect(fetcher).not.toHaveBeenCalled();
  });
});
