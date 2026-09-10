/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LocalWorkspaceStore, WorkspaceConflict, WorkspaceUnavailable } from "./local-store";
const base = path.resolve(".ev-preview");
let directory: string;
const draft = { id: "sample-draft", title: "Preview test", body: "Sample content", provenance: "Synthetic test", gapKey: null, status: "draft" as const };
beforeEach(async () => { await mkdir(base, { recursive: true }); directory = await mkdtemp(path.join(base, "test-")); });
afterEach(async () => {
  if (path.dirname(path.resolve(directory)) !== base || !path.basename(directory).startsWith("test-")) throw new Error("Unsafe test cleanup target");
  await rm(directory, { recursive: true, force: true });
});
describe("local durable drafts", () => {
  it("persists across independent store instances and keeps draft updates unique", async () => {
    const store = new LocalWorkspaceStore(directory);
    expect((await store.read()).revision).toBe(0);
    await store.mutate({ revision: 0, action: "save_draft", draft });
    const reloaded = new LocalWorkspaceStore(directory);
    expect((await reloaded.read()).drafts[0].body).toBe("Sample content");
    await reloaded.mutate({ revision: 1, action: "save_draft", draft: { ...draft, body: "Updated content" } });
    const result = await store.read(); expect(result.revision).toBe(2); expect(result.drafts).toHaveLength(1); expect(result.drafts[0].body).toBe("Updated content");
  });
  it("rejects stale writers and preserves the winning draft", async () => {
    const store = new LocalWorkspaceStore(directory);
    await store.mutate({ revision: 0, action: "save_draft", draft });
    await expect(store.mutate({ revision: 0, action: "save_draft", draft: { ...draft, body: "Stale value" } })).rejects.toBeInstanceOf(WorkspaceConflict);
    expect((await store.read()).drafts[0].body).toBe("Sample content");
  });
  it("preserves corrupt data and fails visibly instead of resetting it", async () => {
    const file = path.join(directory, "state.json"); await writeFile(file, "broken json");
    const store = new LocalWorkspaceStore(directory);
    await expect(store.read()).rejects.toBeInstanceOf(WorkspaceUnavailable);
    await expect(store.mutate({ revision: 0, action: "save_draft", draft })).rejects.toBeInstanceOf(WorkspaceUnavailable);
    expect(await readFile(file, "utf8")).toBe("broken json");
  });
  it("fails closed on a held mutation lock and recovers after its verified removal", async () => {
    const lock = path.join(directory, "write.lock"); await mkdir(lock);
    const store = new LocalWorkspaceStore(directory);
    await expect(store.mutate({ revision: 0, action: "save_draft", draft })).rejects.toBeInstanceOf(WorkspaceConflict);
    await rmdir(lock);
    await store.mutate({ revision: 0, action: "triage", key: "a sample question", note: "Check provenance", status: "investigating" });
    expect((await new LocalWorkspaceStore(directory).read()).triage["a sample question"].note).toBe("Check provenance");
  });
  it("allows only one writer when two saves share a revision", async () => {
    const store = new LocalWorkspaceStore(directory);
    const results = await Promise.allSettled([store.mutate({ revision: 0, action: "save_draft", draft }), store.mutate({ revision: 0, action: "save_draft", draft: { ...draft, id: "another" } })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await store.read()).drafts).toHaveLength(1);
  });
});
