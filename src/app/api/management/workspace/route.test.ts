/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { emptyWorkspace } from "@/lib/management/fixtures";
import { LocalWorkspaceStore, WorkspaceConflict } from "@/lib/management/local-store";
function request(body: unknown, extra: Record<string,string> = {}) {
  return new Request("http://localhost:3215/api/management/workspace", { method:"POST", headers:{host:"localhost:3215",origin:"http://localhost:3215","content-type":"application/json",...extra}, body:JSON.stringify(body) });
}
const mutation = { revision:0,action:"save_draft",draft:{id:"sample",title:"Test",body:"Synthetic fact",provenance:"Test",gapKey:null,status:"draft"} };
beforeEach(() => { vi.stubEnv("NODE_ENV","development"); vi.stubEnv("EV_MANAGEMENT_MODE","preview"); vi.stubEnv("VERCEL",""); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("management API boundary", () => {
  it.each(["production","test"])("denies both methods in %s before reading or writing", async (mode) => {
    vi.stubEnv("NODE_ENV",mode);
    const read=vi.spyOn(LocalWorkspaceStore.prototype,"read"), write=vi.spyOn(LocalWorkspaceStore.prototype,"mutate");
    expect((await GET(request(mutation))).status).toBe(404); expect((await POST(request(mutation))).status).toBe(404);
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it.each(["https://attacker.example","http://localhost:9999","null",""])("denies foreign or missing origin %s", async (origin) => {
    const write=vi.spyOn(LocalWorkspaceStore.prototype,"mutate");
    expect((await POST(request(mutation,{origin}))).status).toBe(403); expect(write).not.toHaveBeenCalled();
  });
  it("denies non-JSON requests", async () => { expect((await POST(request(mutation,{"content-type":"text/plain"}))).status).toBe(403); });
  it("returns no-store data only when the private guard passes", async () => {
    vi.spyOn(LocalWorkspaceStore.prototype,"read").mockResolvedValue(emptyWorkspace());
    const response=await GET(request(null)); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual(emptyWorkspace());
  });
  it("reports corrupt data without overwriting it", async () => {
    vi.spyOn(LocalWorkspaceStore.prototype,"read").mockRejectedValue(new Error("private path"));
    const write=vi.spyOn(LocalWorkspaceStore.prototype,"mutate");
    const response=await GET(request(null)); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private path"); expect(write).not.toHaveBeenCalled();
  });
  it("rejects oversized payloads and invalid schema before mutation", async () => {
    const write=vi.spyOn(LocalWorkspaceStore.prototype,"mutate");
    expect((await POST(request("x".repeat(100001)))).status).toBe(413);
    expect((await POST(request({}))).status).toBe(400); expect(write).not.toHaveBeenCalled();
  });
  it("returns a save conflict instead of claiming success", async () => {
    vi.spyOn(LocalWorkspaceStore.prototype,"mutate").mockRejectedValue(new WorkspaceConflict());
    const response=await POST(request(mutation)); expect(response.status).toBe(409); expect(await response.text()).toContain("preserved");
  });
  it("redacts internal write errors and reports not saved", async () => {
    vi.spyOn(LocalWorkspaceStore.prototype,"mutate").mockRejectedValue(new Error("sensitive filesystem path"));
    const response=await POST(request(mutation)); expect(response.status).toBe(503); const body=await response.text();
    expect(body).toContain("Not saved"); expect(body).not.toContain("sensitive");
  });
});
