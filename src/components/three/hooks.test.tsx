import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPACT_QUERY, useSceneEnabled } from "./hooks";

/**
 * Pins the phone/desktop split for the decorative WebGL scenes. The three.js
 * chunk is the single largest cost on the page, so silently re-enabling it on
 * phones would undo the mobile Lighthouse Performance target.
 */
function mockViewport({ compact }: { compact: boolean }) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === COMPACT_QUERY ? compact : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
}

/** jsdom has no WebGL; make the capability check succeed so only width varies. */
function mockWebGLAvailable() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as unknown as RenderingContext,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useSceneEnabled", () => {
  it("does not mount a WebGL scene on a phone-sized viewport", async () => {
    mockViewport({ compact: true });
    mockWebGLAvailable();

    const { result } = renderHook(() => useSceneEnabled());

    // Give the deferred frame a chance to run; it must never flip to true.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBe(false);
  });

  it("mounts a WebGL scene above the phone breakpoint", async () => {
    mockViewport({ compact: false });
    mockWebGLAvailable();

    const { result } = renderHook(() => useSceneEnabled());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays off above the breakpoint when WebGL is unavailable", async () => {
    mockViewport({ compact: false });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { result } = renderHook(() => useSceneEnabled());

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBe(false);
  });
});
