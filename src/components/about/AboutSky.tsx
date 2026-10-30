"use client";

import { useEffect, useRef } from "react";
import { createProgramAsync, isSoftwareRenderer, lookAt, perspective } from "@/components/webgl/gl";
import {
  FOV,
  JOURNEY_BUDGET,
  JOURNEY_FRAGMENT,
  JOURNEY_VERTEX,
  KIND,
  POINT_STRIDE,
  READING_LINE,
  STAGE_ANCHORS,
  STREAK_FRAGMENT,
  STREAK_VERTEX,
  buildJourney,
  buildProgressFor,
  cameraZFor,
  journeyCountsFor,
  nameFrame,
  sampleMaskSteps,
  yawFor,
} from "@/components/about/journey-scene";

type EngineState = "running" | "still" | "paused" | "off";
const STILL_TIME = 30;
/** On the root: "on" while the stars draw the name, "text" when the h1 must paint it. */
export const NAME_FLAG = "data-journey-name";

/** CSS font-stretch keywords, for a canvas, which takes only keywords. */
const STRETCH_KEYWORDS: ReadonlyArray<readonly [number, string]> = [
  [50, "ultra-condensed"], [62.5, "extra-condensed"], [75, "condensed"], [87.5, "semi-condensed"], [100, "normal"],
  [112.5, "semi-expanded"], [125, "expanded"], [150, "extra-expanded"], [200, "ultra-expanded"],
];
function stretchKeyword(value: string): string {
  const percent = Number.parseFloat(value);
  if (!Number.isFinite(percent)) return value || "normal";
  return STRETCH_KEYWORDS.reduce((best, entry) => (Math.abs(entry[0] - percent) < Math.abs(best[0] - percent) ? entry : best))[1];
}

/**
 * Renders the name exactly as the page's h1 would (its own family, weight,
 * width, tracking and line height) and picks evenly spread points on it.
 */
async function sampleName(aspect: number, target: number): Promise<Float32Array> {
  const heading = document.querySelector<HTMLElement>("#about-heading");
  const style = heading ? getComputedStyle(heading) : null;
  const family = style?.fontFamily || "sans-serif";
  const weight = style?.fontWeight || "850";
  const stretch = stretchKeyword(style?.fontStretch ?? "100%");
  const headingSize = Number.parseFloat(style?.fontSize ?? "") || 128;
  const tracking = style && style.letterSpacing !== "normal" ? Number.parseFloat(style.letterSpacing) / headingSize : 0;
  const leading = style ? Number.parseFloat(style.lineHeight) / headingSize : 0.86;
  try {
    await document.fonts.load(`${weight} ${stretch} 120px ${family}`, "JosephFlorendo");
  } catch {
    // Sample with whatever face is available.
  }
  const frame = nameFrame(aspect);
  const width = 700;
  const height = Math.max(1, Math.round((width * frame.height) / frame.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Float32Array();
  const lines = ["Joseph", "Florendo"];
  const lineHeight = Number.isFinite(leading) && leading > 0.5 ? leading : 0.86;
  let size = height / (1 + (lines.length - 1) * lineHeight) / 1.02;
  const context = ctx as Omit<CanvasRenderingContext2D, "fontStretch" | "letterSpacing"> & { fontStretch?: string; letterSpacing?: string };
  const setFont = () => {
    ctx.font = `${weight} ${stretch} ${size}px ${family}`;
    if ("fontStretch" in context) context.fontStretch = stretch;
    if ("letterSpacing" in context) context.letterSpacing = `${tracking * size}px`;
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
  const step = size * lineHeight;
  const top = height / 2 - ((lines.length - 1) * step) / 2;
  lines.forEach((line, index) => ctx.fillText(line, width / 2, top + index * step));
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = pixels[i * 4 + 3] > 128 ? 1 : 0;
  // A pause between passes keeps every task short while the page settles.
  const steps = sampleMaskSteps(mask, width, height, target);
  let pass = steps.next();
  while (!pass.done) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    pass = steps.next();
  }
  return pass.value;
}

/**
 * The About journey's 3D star scene (ADR-0030, About addendum). Same rules as
 * the home sky: decorative, behind the content, paused in a hidden tab, one
 * still frame per scroll under reduced motion, black without WebGL. It runs
 * at up to 60 fps while the camera travels and 30 once it settles. While the
 * stars draw the name, the page's real h1 is visually hidden (it stays in the
 * accessibility tree); whenever the scene can't draw it, the h1 paints it.
 */
export function AboutSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;
    const setState = (state: EngineState) => {
      canvas.setAttribute("data-engine", state);
      if (state === "off") root.setAttribute(NAME_FLAG, "text");
    };
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
    if (!gl) return setState("off");
    // A CPU (software) renderer gets the plain page, as without WebGL, and the
    // h1 paints the name; checked before compiling, the costly part (ADR-0030).
    if (isSoftwareRenderer(gl)) {
      canvas.setAttribute("data-renderer", "software");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return setState("off");
    }
    /** Everything that runs once both shader programs are ready; returns its cleanup. */
    const runScene = (points: WebGLProgram, streaks: WebGLProgram): (() => void) => {

      const pu = (name: string) => gl.getUniformLocation(points, name);
      const su = (name: string) => gl.getUniformLocation(streaks, name);
      const U = {
        proj: pu("u_proj"), view: pu("u_view"), cam: pu("u_cam"), obj: pu("u_obj[0]"), time: pu("u_time"),
        assemble: pu("u_assemble"), build: pu("u_build"), others: pu("u_others"), scale: pu("u_scale"),
        dpr: pu("u_dpr"), bright: pu("u_bright"), warp: pu("u_warp"),
      };
      const S = { proj: su("u_proj"), view: su("u_view"), warp: su("u_warp") };
      const attr = {
        local: gl.getAttribLocation(points, "a_local"),
        center: gl.getAttribLocation(points, "a_center"),
        color: gl.getAttribLocation(points, "a_color"),
        kind: gl.getAttribLocation(points, "a_kind"),
        rand: gl.getAttribLocation(points, "a_rand"),
        size: gl.getAttribLocation(points, "a_size"),
        obj: gl.getAttribLocation(points, "a_obj"),
        pos: gl.getAttribLocation(streaks, "a_pos"),
        tail: gl.getAttribLocation(streaks, "a_tail"),
      };
      const pointBuffer = gl.createBuffer();
      const streakBuffer = gl.createBuffer();
      let pointCount = 0;
      let streakCount = 0;
      let nameDrawn = false;

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
        const counts = journeyCountsFor(width);
        const compact = counts === JOURNEY_BUDGET.counts.compact;
        const key = `${compact ? "c" : "d"}:${aspect.toFixed(2)}`;
        if (key === builtFor) return;
        builtFor = key;
        const samples = await sampleName(aspect, counts.name);
        if (disposed) return;
        const { data, objects } = buildJourney(counts, aspect, samples, { compact });
        nameDrawn = samples.length > 0;
        pointCount = data.length / POINT_STRIDE;
        gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.useProgram(points);
        gl.uniform4fv(U.obj, objects);
        const lines: number[] = [];
        for (let i = 0; i < pointCount; i += 1) {
          if (data[i * POINT_STRIDE + 9] !== KIND.tunnel) continue;
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
        const tops = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]")).map(
          (element) => element.getBoundingClientRect().top + scrollY,
        );
        // The journey starts where the reading line sits at the top of the page
        // and ends where it sits at the bottom.
        if (tops.length) tops[0] = Math.max(tops[0], height * READING_LINE);
        const end = document.documentElement.scrollHeight - height * (1 - READING_LINE);
        tops.push(Math.max(end, (tops[tops.length - 1] ?? 0) + 1));
        stageTops = tops;
        void rebuild();
      };

      const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const start = performance.now();
      let camZ: number | null = null;
      let warp = 0;
      let lastTime = 0;
      let lastFrame = 0;
      let moving = true;
      let raf = 0;
      let still = 0;

      const draw = (seconds: number, instant: boolean) => {
        if (!pointCount) return;
        const target = cameraZFor(window.scrollY + height * READING_LINE, stageTops);
        const dt = Math.min(0.1, Math.max(0.001, seconds - lastTime));
        lastTime = seconds;
        if (camZ === null || instant) {
          camZ = target;
          warp = 0;
        } else {
          const previous = camZ;
          camZ += (target - camZ) * (1 - Math.exp(-dt * 2.8));
          const speed = Math.abs(camZ - previous) / dt;
          warp += (Math.min(1, speed / 70) - warp) * Math.min(1, dt * 5);
        }
        const compact = width < JOURNEY_BUDGET.compactBelow;
        // Dead straight at the name; once under way, a gentle sideways sway and,
        // on wide screens, a turn to the left so the way ahead opens on the right.
        const sway = Math.sin((camZ - STAGE_ANCHORS[0]) * 0.02) * (compact ? 0.6 : 1.5);
        const yaw = yawFor(camZ, compact);
        const proj = perspective(FOV, width / height, 0.1, 400);
        const view = lookAt([sway, 0, camZ], [sway * 0.4 - Math.tan(yaw) * 30, 0, camZ - 30]);
        const assemble = instant ? 1 : Math.min(1, Math.max(0, (seconds - 0.4) / JOURNEY_BUDGET.assembleSeconds));
        moving = Math.abs(target - camZ) > 0.02 || warp > 0.02 || assemble < 1;

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
        const bind = (location: number, size: number, offset: number) => {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, bytes, offset * 4);
        };
        bind(attr.local, 3, 0);
        bind(attr.center, 3, 3);
        bind(attr.color, 3, 6);
        bind(attr.kind, 1, 9);
        bind(attr.rand, 1, 10);
        bind(attr.size, 1, 11);
        bind(attr.obj, 1, 12);
        gl.uniformMatrix4fv(U.proj, false, proj);
        gl.uniformMatrix4fv(U.view, false, view);
        gl.uniform3f(U.cam, sway, 0, camZ);
        gl.uniform1f(U.time, seconds);
        gl.uniform1f(U.assemble, assemble);
        gl.uniform1f(U.build, buildProgressFor(camZ));
        gl.uniform1f(U.others, compact ? JOURNEY_BUDGET.compactOthers : 1);
        gl.uniform1f(U.scale, height / (2 * Math.tan(FOV / 2)));
        gl.uniform1f(U.dpr, dpr);
        gl.uniform1f(U.bright, JOURNEY_BUDGET.brightness * (compact ? 0.85 : 1));
        gl.uniform1f(U.warp, warp);
        gl.drawArrays(gl.POINTS, 0, pointCount);
        gl.disableVertexAttribArray(attr.color);
        gl.disableVertexAttribArray(attr.size);
        gl.disableVertexAttribArray(attr.obj);

        // The h1 never paints the name while the stars draw it, from their first frame.
        const flag = nameDrawn ? "on" : "text";
        if (root.getAttribute(NAME_FLAG) !== flag) root.setAttribute(NAME_FLAG, flag);
        if (!canvas.hasAttribute("data-ready")) canvas.setAttribute("data-ready", "");
      };

      const loop = (now: number) => {
        raf = window.requestAnimationFrame(loop);
        const gap = 1000 / (moving ? JOURNEY_BUDGET.fpsCap : JOURNEY_BUDGET.idleFps);
        if (now - lastFrame < gap - 1) return;
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
        moving = true;
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
    };

    // The GPU compiles the shaders in the background where the browser
    // allows, so the page is never blocked waiting for the link.
    let stopScene: (() => void) | null = null;
    let cancelled = false;
    void Promise.all([
      createProgramAsync(gl, JOURNEY_VERTEX, JOURNEY_FRAGMENT),
      createProgramAsync(gl, STREAK_VERTEX, STREAK_FRAGMENT),
    ]).then(([points, streaks]) => {
      if (cancelled) {
        if (points) gl.deleteProgram(points);
        if (streaks) gl.deleteProgram(streaks);
        return;
      }
      if (!points || !streaks) return setState("off");
      stopScene = runScene(points, streaks);
    });
    return () => {
      cancelled = true;
      stopScene?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="jf-sky" aria-hidden="true" data-engine="off" />;
}
