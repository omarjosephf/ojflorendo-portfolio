export class BoundedJsonError extends Error {
  constructor(readonly kind: "too-large" | "invalid" | "aborted") { super(kind); }
}

/** Bound bytes and read time, including a body whose cancel hook never settles. */
export async function readBoundedJson(
  source: Request | Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<unknown> {
  const reader = source.body?.getReader();
  if (!reader) return null;
  let rejectAbort: (error: Error) => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  const onAbort = () => { rejectAbort(new BoundedJsonError("aborted")); cancel(); };
  signal.addEventListener("abort", onAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (signal.aborted) throw new BoundedJsonError("aborted");
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (signal.aborted) throw new BoundedJsonError("aborted");
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { cancel(); throw new BoundedJsonError("too-large"); }
      chunks.push(value);
    }
    if (size === 0) return null;
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new BoundedJsonError("invalid"); }
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
