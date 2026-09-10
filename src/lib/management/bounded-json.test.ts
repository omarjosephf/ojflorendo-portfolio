/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./bounded-json";

describe("bounded management JSON", () => {
  it("aborts a stalled stream even when cancellation never settles", async () => {
    const controller = new AbortController();
    const response = new Response(new ReadableStream({ cancel: () => new Promise(() => undefined) }));
    const pending = expect(readBoundedJson(response, 100, controller.signal)).rejects.toMatchObject({ kind: "aborted" });
    controller.abort();
    await pending;
  });
  it("rejects excessive bytes without waiting for a hostile cancel hook", async () => {
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode('"too long"')); },
      cancel: () => new Promise(() => undefined),
    }));
    await expect(readBoundedJson(response, 3, new AbortController().signal)).rejects.toMatchObject({ kind: "too-large" });
  });
  it("rejects invalid UTF-8 instead of silently altering saved content", async () => {
    await expect(readBoundedJson(new Response(new Uint8Array([34, 255, 34])), 100, new AbortController().signal)).rejects.toMatchObject({ kind: "invalid" });
  });
  it("reads valid JSON and successful empty responses", async () => {
    const signal = new AbortController().signal;
    expect(await readBoundedJson(Response.json({ saved: true }), 100, signal)).toEqual({ saved: true });
    expect(await readBoundedJson(new Response(null, { status: 204 }), 100, signal)).toBeNull();
  });
});
