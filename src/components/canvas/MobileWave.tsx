"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

import { useSceneActive } from "@/components/three/hooks";
import {
  MOBILE_WAVE,
  buildField,
  waveHeight,
  type WavePoint,
} from "@/components/canvas/wave-field";

/** Crest, mid and trough colours, matching the WebGL wave's palette. */
const COLOURS = ["56,189,248", "45,212,191", "120,200,230"] as const;
/**
 * The WebGL wave multiplies its point alpha (peak 0.85) by `uOpacity: 0.32`,
 * so its brightest point lands near 0.27 and most land far below that. These
 * are that same budget, bucketed. An earlier pass used the 0.85 figure without
 * the 0.32 and was three times too bright — measured at 171 levels of change
 * between frames against the ambient glow's 8, which is exactly the hard bright
 * point on dark that the astigmatism constraint rules out.
 */
const ALPHAS = [0.07, 0.13, 0.2, 0.27] as const;

/**
 * Soft round sprites, pre-rendered once. The falloff is deliberately wide and
 * gradual and the blending is plain source-over: small hard-edged bright dots
 * on a dark field are exactly what starburst for readers with astigmatism, and
 * the WebGL fragment shader avoids them for the same reason.
 */
function buildSprites(size: number): HTMLCanvasElement[] {
  const sprites: HTMLCanvasElement[] = [];
  for (const rgb of COLOURS) {
    for (const alpha of ALPHAS) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2,
      );
      gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
      gradient.addColorStop(0.45, `rgba(${rgb},${alpha * 0.55})`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      sprites.push(canvas)
    }
  }
  return sprites;
}

function paint(
  ctx: CanvasRenderingContext2D,
  points: WavePoint[],
  sprites: HTMLCanvasElement[],
  width: number,
  height: number,
  time: number,
) {
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const offset = waveHeight(p.gx, p.gz, time) * p.amplitude;
    const size = p.size;
    ctx.drawImage(sprites[p.sprite], p.x - size / 2, p.y + offset - size / 2, size, size);
  }
}

/**
 * The phone stand-in for the WebGL particle wave.
 *
 * ADR-0003 keeps three.js off phones: one shared 234 KiB chunk costing ~1123 ms
 * of script evaluation was the whole gap between mobile Lighthouse 65-80 and
 * 90+. That decision is unchanged. This draws a much smaller field of the same
 * water in plain Canvas 2D instead, at a measured budget (see `wave-field.ts`).
 *
 * The backing store is capped at 2x rather than the 3x most phones report:
 * enough that the soft sprites are not visibly upscaled, at a quarter of the
 * fill a full 3x buffer would cost.
 */
export function MobileWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref: wrapperRef, active } = useSceneActive<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  // Mirrored into a ref so the render loop can read it without the effect
  // depending on it, which would tear down and rebuild the field on every
  // scroll in and out of view.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = window.innerWidth;
    const height = Math.round(window.innerHeight * MOBILE_WAVE.bandHeight);

    // Draw in CSS pixels but back the canvas at up to 2x, so the field stays
    // legible on the 3x screens most phones now have. Everything below this
    // line works in CSS pixels and is unaware of the scale.
    const dpr = Math.min(window.devicePixelRatio || 1, MOBILE_WAVE.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    const points = buildField(width, height);
    const sprites = buildSprites(MOBILE_WAVE.spriteSize);

    // Reduced motion keeps the picture and drops the movement: one frame, drawn
    // at a fixed point in the cycle, then nothing.
    if (reducedMotion) {
      paint(ctx, points, sprites, width, height, 0);
      return;
    }

    const minimumDelta = 1000 / MOBILE_WAVE.fps;
    let frame = 0;
    let last = 0;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!activeRef.current || now - last < minimumDelta) return;
      last = now;
      paint(ctx, points, sprites, width, height, now * 0.001);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div ref={wrapperRef} className="site-wave" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="absolute bottom-0 left-0 w-full"
        style={{ height: `${MOBILE_WAVE.bandHeight * 100}%` }}
      />
    </div>
  );
}
