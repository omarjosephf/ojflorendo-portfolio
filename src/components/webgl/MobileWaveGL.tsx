"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

import { useSceneActive } from "@/components/three/hooks";
import {
  BAND_HIGH,
  BAND_LOW,
  CAMERA,
  CAMERA_POSITION,
  CAMERA_TARGET,
  COMPACT,
  PLANE_Z,
  buildGrid,
  fadeFarOf,
  halfDepthOf,
  halfWidthOf,
  horizontalScale,
} from "@/components/three/wave-geometry";
import {
  RAW_FRAGMENT_PRELUDE,
  RAW_VERTEX_PRELUDE,
  fragmentShader,
  vertexShader,
} from "@/components/three/wave-shaders";
import {
  createProgram,
  lookAt,
  modelView,
  perspective,
  rgb,
} from "@/components/webgl/gl";

/**
 * Backing-store cap. The shader sizes points in physical pixels through
 * `uPixelRatio`, so this controls sharpness rather than layout. 2 stays legible
 * on the 3x screens phones report, without the ninefold fill of a full 3x
 * buffer.
 */
const MAX_DPR = 2;

/** Matching the desktop scene's uniforms exactly — it is meant to be the same water. */
const AMPLITUDE = 1.35;
const OPACITY = 0.32;
const FADE_NEAR = 10;
const COLOUR_CREST = rgb("#2dd4bf");
const COLOUR_TROUGH = rgb("#38bdf8");

/**
 * The particle wave on phones, rendered without three.js.
 *
 * ADR-0003 keeps phones off the shared three.js chunk: 234 KiB transferred,
 * 896 KB parsed, ~1123 ms of script evaluation on a throttled mobile CPU. That
 * decision stands. The objection was always the library's cost and never WebGL
 * itself, so this runs the *same GLSL as the desktop scene* through a context
 * opened by hand, in a few kilobytes.
 *
 * The geometry comes from the same helpers the desktop scene uses, which
 * matters for more than tidiness. `horizontalScale()` stretches the plane so it
 * reaches past the frustum at every depth. A Canvas-2D attempt (ADR-0008,
 * withdrawn) used a narrower plane of its own and rendered as a fan tapering to
 * a point, covering barely a third of the screen width at mid-depth. Reusing
 * these helpers makes that failure structurally impossible.
 *
 * There is no pointer ripple: phones do not hover, and a touch-driven ripple
 * would be a new interaction surface rather than a background.
 */
export function MobileWaveGL() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref: wrapperRef, active } = useSceneActive<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  // Mirrored into a ref so the render loop can read it without the effect
  // depending on it, which would tear the context down on every scroll.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      depth: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const program = createProgram(
      gl,
      RAW_VERTEX_PRELUDE + vertexShader,
      RAW_FRAGMENT_PRELUDE + fragmentShader,
    );
    if (!program) return;

    const config = COMPACT;
    const positions = buildGrid(config.columns, config.rows, config.spacing);
    const count = positions.length / 3;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    gl.useProgram(program);
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      projection: at("projectionMatrix"),
      modelView: at("modelViewMatrix"),
      time: at("uTime"),
      pointer: at("uPointer"),
      pointerStrength: at("uPointerStrength"),
      size: at("uSize"),
      pixelRatio: at("uPixelRatio"),
      amplitude: at("uAmplitude"),
      halfDepth: at("uHalfDepth"),
      halfWidth: at("uHalfWidth"),
      colourCrest: at("uColorCrest"),
      colourTrough: at("uColorTrough"),
      opacity: at("uOpacity"),
      fadeNear: at("uFadeNear"),
      fadeFar: at("uFadeFar"),
      viewportHeight: at("uViewportHeightPx"),
      bandLow: at("uBandLow"),
      bandHigh: at("uBandHigh"),
    };

    // Values that never change for the life of the scene.
    gl.uniform2f(u.pointer, 0, 0);
    gl.uniform1f(u.pointerStrength, 0);
    gl.uniform1f(u.size, config.size);
    gl.uniform1f(u.amplitude, AMPLITUDE);
    gl.uniform1f(u.halfDepth, halfDepthOf(config));
    gl.uniform1f(u.halfWidth, halfWidthOf(config));
    gl.uniform3fv(u.colourCrest, COLOUR_CREST);
    gl.uniform3fv(u.colourTrough, COLOUR_TROUGH);
    gl.uniform1f(u.opacity, OPACITY);
    gl.uniform1f(u.fadeNear, FADE_NEAR);
    gl.uniform1f(u.fadeFar, fadeFarOf(config));
    gl.uniform1f(u.bandLow, BAND_LOW);
    gl.uniform1f(u.bandHigh, BAND_HIGH);

    // Normal, non-additive blending with no depth write, matching the desktop
    // material. Additive would make every point a small light source that
    // blooms where points overlap, which is the hardest thing to read past.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.clearColor(0, 0, 0, 0);

    const view = lookAt(CAMERA_POSITION, CAMERA_TARGET);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const aspect = width / Math.max(height, 1);
      gl.uniformMatrix4fv(
        u.projection,
        false,
        perspective(
          (CAMERA.fov * Math.PI) / 180,
          aspect,
          CAMERA.near,
          CAMERA.far,
        ),
      );
      // Re-fit the field to the new aspect, so rotating the phone never exposes
      // a lateral edge.
      gl.uniformMatrix4fv(
        u.modelView,
        false,
        modelView(view, horizontalScale(config, aspect), PLANE_Z),
      );
      gl.uniform1f(u.pixelRatio, dpr);
      gl.uniform1f(u.viewportHeight, canvas.height);
    };

    const draw = (seconds: number) => {
      gl.uniform1f(u.time, seconds);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
    };

    resize();
    window.addEventListener("resize", resize);

    // Mobile browsers drop WebGL contexts under memory pressure. Preventing the
    // default keeps the canvas restorable; with no listener at all it would
    // stay blank for the rest of the page's life.
    const onLost = (event: Event) => event.preventDefault();
    const onRestored = () => resize();
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    const detach = () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };

    if (reducedMotion) {
      // Keep the picture and drop the movement: one frame at a fixed point in
      // the cycle, then nothing.
      draw(0);
      return detach;
    }

    const minimumDelta = 1000 / config.fps;
    let frame = 0;
    let lastDraw = 0;
    let lastTick = 0;
    let elapsed = 0;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!activeRef.current) {
        // Hold the clock still while hidden, so returning to the tab resumes
        // the wave rather than jumping it forward.
        lastTick = 0;
        return;
      }
      if (now - lastDraw < minimumDelta) return;
      lastDraw = now;

      // Advance on wall-clock time so speed never depends on frame rate. The
      // clamp exists only to stop a backgrounded tab jumping the wave forward.
      const seconds = now / 1000;
      if (lastTick === 0) lastTick = seconds;
      elapsed += Math.min(seconds - lastTick, 0.25);
      lastTick = seconds;
      draw(elapsed);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      detach();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [reducedMotion]);

  return (
    <div ref={wrapperRef} className="site-wave" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
