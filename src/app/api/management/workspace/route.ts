import { previewAllowed, previewWriteAllowed } from "@/lib/management/access";
import { LocalWorkspaceStore, WorkspaceConflict } from "@/lib/management/local-store";
import { parseMutation } from "@/lib/management/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const responseHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: responseHeaders }); }
export async function GET(request: Request) {
  if (!previewAllowed(request.headers.get("host"))) return json({ error: "Not found" }, 404);
  try { return json(await new LocalWorkspaceStore().read()); }
  catch { return json({ error: "Local workspace is unavailable. Existing data have not been reset." }, 503); }
}
export async function POST(request: Request) {
  if (!previewAllowed(request.headers.get("host"))) return json({ error: "Not found" }, 404);
  if (!previewWriteAllowed(request)) return json({ error: "This save must come from the local preview." }, 403);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "A JSON body is required." }, 400);
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 100_000) { await reader.cancel(); return json({ error: "Draft is too large." }, 413); }
      chunks.push(value);
    }
    const mutation = parseMutation(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!mutation) return json({ error: "Check the title, content and source note before saving." }, 400);
    return json(await new LocalWorkspaceStore().mutate(mutation));
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON." }, 400);
    if (error instanceof WorkspaceConflict) return json({ error: "Another save changed this workspace. Your editor text is preserved. Reload the saved workspace before retrying." }, 409);
    return json({ error: "Not saved. The local workspace is unavailable; your editor text is preserved." }, 503);
  } finally { reader.releaseLock(); }
}
