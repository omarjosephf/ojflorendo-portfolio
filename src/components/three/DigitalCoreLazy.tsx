"use client";

import dynamic from "next/dynamic";
import { DigitalCoreFallback } from "@/components/three/DigitalCoreFallback";
import { useSceneEnabled } from "@/components/three/hooks";

// Load the heavy 3D bundle only on the client, after the hero text is painted.
const DigitalCore = dynamic(
  () => import("@/components/three/DigitalCore").then((m) => m.DigitalCore),
  { ssr: false },
);

/**
 * Hero visual: the CSS "Digital Core" is always rendered as an attractive
 * underlay (and permanent fallback). The WebGL scene is layered on top only when
 * supported and not on a phone, so the hero remains useful with no JS/WebGL and
 * never shifts layout.
 */
export function DigitalCoreLazy() {
  const enabled = useSceneEnabled();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <DigitalCoreFallback className="absolute inset-0" />
      {enabled ? <DigitalCore /> : null}
    </div>
  );
}
