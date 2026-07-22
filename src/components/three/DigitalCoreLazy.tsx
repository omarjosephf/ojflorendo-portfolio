"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DigitalCoreFallback } from "@/components/three/DigitalCoreFallback";

// Load the heavy 3D bundle only on the client, after the hero text is painted.
const DigitalCore = dynamic(
  () => import("@/components/three/DigitalCore").then((m) => m.DigitalCore),
  { ssr: false },
);

/** Detect WebGL support once; fall back to the CSS core when unavailable. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Hero visual: the CSS "Digital Core" is always rendered as an attractive
 * underlay (and permanent fallback). The WebGL scene is layered on top only when
 * supported, so the hero remains useful with no JS/WebGL and never shifts layout.
 */
export function DigitalCoreLazy() {
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    // Defer to the next frame so the hero paints first and we never call
    // setState synchronously inside the effect body.
    const id = requestAnimationFrame(() => setWebgl(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <DigitalCoreFallback className="absolute inset-0" />
      {webgl ? <DigitalCore /> : null}
    </div>
  );
}
