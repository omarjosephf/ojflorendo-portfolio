import { mkdir, open, readFile, rename, rm, rmdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { emptyWorkspace } from "./fixtures";
import { isWorkspaceState } from "./validation";
import type { WorkspaceMutation, WorkspaceState } from "./types";

export class WorkspaceConflict extends Error {}
export class WorkspaceUnavailable extends Error {}
/** Development-only adapter. Its caller must independently enforce preview access. */
export class LocalWorkspaceStore {
  constructor(private readonly directory = path.join(process.cwd(), ".ev-preview", process.env.EV_MANAGEMENT_TEST_STORE === "1" ? "qa" : "workspace")) {}
  async read(): Promise<WorkspaceState> {
    const file = path.join(this.directory, "state.json");
    try {
      const info = await stat(file);
      if (info.size > 3_000_000 || !info.isFile()) throw new WorkspaceUnavailable("Invalid store");
      const value: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!isWorkspaceState(value)) throw new WorkspaceUnavailable("Invalid store");
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyWorkspace();
      throw new WorkspaceUnavailable("Workspace could not be read");
    }
  }
  async mutate(mutation: WorkspaceMutation): Promise<WorkspaceState> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = path.join(this.directory, "write.lock");
    try { await mkdir(lock); } catch { throw new WorkspaceConflict("Another save is in progress"); }
    const temp = path.join(this.directory, `${randomUUID()}.tmp`);
    try {
      const state = await this.read();
      if (state.revision !== mutation.revision) throw new WorkspaceConflict("This workspace changed. Reload before saving.");
      const updatedAt = new Date().toISOString();
      if (mutation.action === "save_draft") {
        const draft = { ...mutation.draft, updatedAt }, index = state.drafts.findIndex((d) => d.id === draft.id);
        if (index < 0) state.drafts.unshift(draft); else state.drafts[index] = draft;
      } else {
        state.triage[mutation.key] = { status: mutation.status, note: mutation.note, updatedAt };
      }
      state.revision += 1;
      if (!isWorkspaceState(state)) throw new WorkspaceUnavailable("Workspace limit reached");
      const handle = await open(temp, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify(state, null, 2) + "\n", "utf8"); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temp, path.join(this.directory, "state.json"));
      return state;
    } finally {
      await rm(temp, { force: true });
      await rmdir(lock);
    }
  }
}
