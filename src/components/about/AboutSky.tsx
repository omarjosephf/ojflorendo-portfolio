"use client";

import { useEffect, useRef } from "react";
import { createProgram, isSoftwareRenderer, lookAt, perspective } from "@/components/webgl/gl";
import {
  FOV,
  GALAXY_Z,
  JOURNEY_BUDGET,
  JOURNEY_FRAGMENT,
  JOURNEY_VERTEX,
  KIND,
  PLANET_Z,
  POINT_STRIDE,
  STREAK_FRAGMENT,
  STREAK_VERTEX,
  buildJourney,
  buildProgressFor,
  cameraZFor,
  journeyCountsFor,
  nameFrame,
} from "@/components/about/journey-scene";

type EngineState = "running" | "still" | "paused" | "off";
const STILL_TIME = 30;
const NAME_FLAG = "data-journey-name";

/** Renders the name in the page's own typeface and samples its pixels. */
async function sampleName(aspect: number): Promise<Float32Array> {
  const site = document.querySelector(".jf-site");
  const family = site ? getComputedStyle(site).fontFamily : "sans-serif";
  try {
    await document.fonts.load(`850 120px ${family}`);
  } catch {
    // Sample with whatever face is available.
  }
  const frame = nameFrame(aspect);
  const width = 900;
  const height = Math.max(1, Math.round((width * frame.height) / frame.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Float32Array();
  const lines = ["Joseph", "Florendo"];
  let size = height / (lines.length * 0.92);
  const setFont = () => {
    ctx.font = `850 ${size}px ${family}`;
    if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "expanded";
  };
  setFont();
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  if (widest > width * 0.98) {
    size *= (width * 0.98) / widest;
    setFont();
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = size * 0.9;
  const top = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + index * lineHeight));
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const out: number[] = [];
  const step = 3;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (pixels[(y * width + x) * 4 + 3] > 128) out.push(x / width, y / height);
    }
  }
  return new Float32Array(out);
}

/**
 * The About journey's 3D star scene (ADR-0030, About addendum). Same rules as
 * the home sky: decorative, behind the content, at most 30 fps, paused in a
 * hidden tab, one still frame per scroll under reduced motion, black without
 * WebGL. While the scene shows the name in stars, the page's real h1 is
 * visually hidden (it stays in the accessibility tree), so the name never
 * appears twice; without the scene the h1 shows as normal.
 */
export function AboutSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const setState = (state: EngineState) => canvas.setAttribute("data-engine", state);
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (!gl) return setState("off");
    // A CPU (software) renderer gets the plain page, as without WebGL, and the
    // h1 stays painted; checked before compiling, the costly part (ADR-0030).
    if (isSoftwareRenderer(gl)) {
      canvas.setAttribute("data-renderer", "software");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return setState("off");
    }
    const points = createProgram(gl, JOURNEY_VERTEX, JOURNEY_FRAGMENT);
    const streaks = createProgram(gl, STREAK_VERTEX, STREAK_FRAGMENT);
    if (!points || !streaks) return setState("off");
    const countsFor = journeyCountsFor;

    const pu = (name: string) => gl.getUniformLocation(points, name);
    const su = (name: string) => gl.getUniformLocation(streaks, name);
    const U = {
      proj: pu("u_proj"), view: pu("u_view"), time: pu("u_time"), assemble: pu("u_assemble"),
      build: pu("u_build"), planet: pu("u_planet"), galaxy: pu("u_galaxy"), others: pu("u_others"), scale: pu("u_scale"), dpr: pu("u_dpr"),
      bright: pu("u_bright"), warp: pu("u_warp"), camZ: pu("u_camZ"),
    };
    const S = { proj: su("u_proj"), view: su("u_view"), warp: su("u_warp") };
    const attr = {
      target: gl.getAttribLocation(points, "a_target"),
      start: gl.getAttribLocation(points, "a_start"),
      kind: gl.getAttribLocation(points, "a_kind"),
      rand: gl.getAttribLocation(points, "a_rand"),
      pos: gl.getAttribLocation(streaks, "a_pos"),
      tail: gl.getAttribLocation(streaks, "a_tail"),
    };
    const pointBuffer = gl.createBuffer();
    const streakBuffer = gl.createBuffer();
    let pointCount = 0;
    let streakCount = 0;

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 1);

    let width = 1;
    let height = 1;
    let dpr = 1;
    let stageTops: number[] = [];
    let builtFor = "";
    let disposed = false;

    const rebuild = async () => {
      const aspect = width / height;
      const key = `${countsFor(width) === JOURNEY_BUDGET.counts.compact ? "c" : "d"}:${aspect.toFixed(2)}`;
      if (key === builtFor) return;
      builtFor = key;
      const samples = await sampleName(aspect);
      if (disposed) return;
      const data = buildJourney(countsFor(width), aspect, samples);
      pointCount = data.length / POINT_STRIDE;
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const lines: number[] = [];
      for (let i = 0; i < pointCount; i += 1) {
        if (data[i * POINT_STRIDE + 6] !== KIND.tunnel) continue;
        const x = data[i * POINT_STRIDE];
        const y = data[i * POINT_STRIDE + 1];
        const z = data[i * POINT_STRIDE + 2];
        lines.push(x, y, z, 0, x, y, z, 1);
      }
      streakCount = lines.length / 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
      requestDraw();
    };

    const measure = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      dpr = Math.min(
        window.devicePixelRatio || 1,
        JOURNEY_BUDGET.dprCap,
        Math.sqrt(JOURNEY_BUDGET.maxPixels / (width * height)),
      );
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const scrollY = window.scrollY;
      stageTops = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]")).map(
        (element) => element.getBoundingClientRect().top + scrollY,
      );
      void rebuild();
    };

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = performance.now();
    let camZ: number | null = null;
    let warp = 0;
    let lastTime = 0;
    let lastFrame = 0;
    let raf = 0;
    let still = 0;

    const draw = (seconds: number, instant: boolean) => {
      if (!pointCount) return;
      const readingLine = window.scrollY + height * 0.45;
      const target = cameraZFor(readingLine, stageTops);
      const dt = Math.min(0.1, Math.max(0.001, seconds - lastTime));
      lastTime = seconds;
      if (camZ === null || instant) {
        camZ = target;
        warp = 0;
      } else {
        const previous = camZ;
        camZ += (target - camZ) * (1 - Math.exp(-dt * 3.2));
        const speed = Math.abs(camZ - previous) / dt;
        warp += (Math.min(1, speed / 55) - warp) * Math.min(1, dt * 6);
      }
      const compact = width < JOURNEY_BUDGET.compactBelow;
      const sway = Math.sin(camZ * 0.02) * (compact ? 0.6 : 1.5);
      const proj = perspective(FOV, width / height, 0.1, 400);
      const view = lookAt([sway, 0.4, camZ], [sway * 0.4, 0, camZ - 30]);
      const assemble = instant ? 1 : Math.min(1, Math.max(0, (seconds - 0.4) / JOURNEY_BUDGET.assembleSeconds));

      gl.clear(gl.COLOR_BUFFER_BIT);

      if (warp > 0.02 && streakCount) {
        gl.useProgram(streaks);
        gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
        gl.enableVertexAttribArray(attr.pos);
        gl.vertexAttribPointer(attr.pos, 3, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(attr.tail);
        gl.vertexAttribPointer(attr.tail, 1, gl.FLOAT, false, 16, 12);
        gl.uniformMatrix4fv(S.proj, false, proj);
        gl.uniformMatrix4fv(S.view, false, view);
        gl.uniform1f(S.warp, warp);
        gl.drawArrays(gl.LINES, 0, streakCount);
        gl.disableVertexAttribArray(attr.tail);
      }

      gl.useProgram(points);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      const bytes = POINT_STRIDE * 4;
      gl.enableVertexAttribArray(attr.target);
      gl.vertexAttribPointer(attr.target, 3, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(attr.start);
      gl.vertexAttribPointer(attr.start, 3, gl.FLOAT, false, bytes, 12);
      gl.enableVertexAttribArray(attr.kind);
      gl.vertexAttribPointer(attr.kind, 1, gl.FLOAT, false, bytes, 24);
      gl.enableVertexAttribArray(attr.rand);
      gl.vertexAttribPointer(attr.rand, 1, gl.FLOAT, false, bytes, 28);
      gl.uniformMatrix4fv(U.proj, false, proj);
      gl.uniformMatrix4fv(U.view, false, view);
      gl.uniform1f(U.time, seconds);
      gl.uniform1f(U.assemble, assemble);
      gl.uniform1f(U.build, buildProgressFor(camZ));
      gl.uniform3f(U.planet, compact ? 0 : 22, compact ? 8 : 2, PLANET_Z);
      // The ending galaxy keeps to the right of the content column, like the planet.
      gl.uniform3f(U.galaxy, compact ? 0 : 58, compact ? 12 : 8, GALAXY_Z);
      // On phones the text spans the screen, so everything but the name dims.
      gl.uniform1f(U.others, compact ? 0.3 : 1);
      gl.uniform1f(U.scale, height / (2 * Math.tan(FOV / 2)));
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.bright, JOURNEY_BUDGET.brightness * (compact ? 0.8 : 1));
      gl.uniform1f(U.warp, warp);
      gl.uniform1f(U.camZ, camZ);
      gl.drawArrays(gl.POINTS, 0, pointCount);

      if (assemble >= 1 && !root.hasAttribute(NAME_FLAG)) root.setAttribute(NAME_FLAG, "on");
      if (!canvas.hasAttribute("data-ready")) canvas.setAttribute("data-ready", "");
    };

    const frameGap = 1000 / JOURNEY_BUDGET.fpsCap;
    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      if (now - lastFrame < frameGap - 1) return;
      lastFrame = now;
      draw((now - start) / 1000, false);
    };
    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };
    const drawStill = () => {
      still = 0;
      draw(STILL_TIME, true);
    };
    function stillOnly() {
      return reduceQuery.matches;
    }
    function requestDraw() {
      if (stillOnly() && !still) still = window.requestAnimationFrame(drawStill);
    }
    const schedule = () => {
      stop();
      if (stillOnly()) {
        setState("still");
        requestDraw();
        return;
      }
      if (document.hidden) return setState("paused");
      setState("running");
      raf = window.requestAnimationFrame(loop);
    };

    let resizeQueued = 0;
    const onResize = () => {
      if (resizeQueued) return;
      resizeQueued = window.requestAnimationFrame(() => {
        resizeQueued = 0;
        measure();
        requestDraw();
      });
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      stop();
      root.removeAttribute(NAME_FLAG);
      setState("off");
    };

    measure();
    schedule();
    void document.fonts?.ready.then(onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    window.addEventListener("scroll", requestDraw, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduceQuery.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      stop();
      if (still) window.cancelAnimationFrame(still);
      if (resizeQueued) window.cancelAnimationFrame(resizeQueued);
      observer.disconnect();
      window.removeEventListener("scroll", requestDraw);
      document.removeEventListener("visibilitychange", schedule);
      reduceQuery.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextlost", onLost);
      root.removeAttribute(NAME_FLAG);
      gl.deleteBuffer(pointBuffer);
      gl.deleteBuffer(streakBuffer);
      gl.deleteProgram(points);
      gl.deleteProgram(streaks);
    };
  }, []);

  return <canvas ref={canvasRef} className="jf-sky" aria-hidden="true" data-engine="off" />;
}
