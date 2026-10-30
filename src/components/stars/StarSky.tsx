"use client";

import { useEffect, useRef } from "react";
import { createProgram, isSoftwareRenderer } from "@/components/webgl/gl";
import {
  DIM_SELECTOR,
  FRAGMENT_SHADER,
  STAR_BUDGET,
  RIVER_SPEED,
  STRIDE,
  VERTEX_SHADER,
  armLength,
  armPoint,
  armTipDirection,
  buildStars,
  countsFor,
  galaxyFor,
  strandLanes,
  strandPhase,
  streamShare,
} from "@/components/stars/star-field";

type EngineState = "running" | "still" | "paused" | "off";

/** The home hero, at whose foot the galaxy sits by default. */
const HOME_ANCHOR = "#top";

export interface StarSkyPlacement {
  /** CSS selector of the element at whose foot the galaxy sits. */
  anchor?: string;
  /** CSS selector of the text blocks the stars dim behind. */
  dimSelector?: string;
}

/** The time the still frame shows: the galaxy and river at a settled moment. */
const STILL_TIME = 42;

/**
 * The decorative star sky behind the home page and the blog front page
 * (ADR-0030, ADR-0027). One fixed canvas, hidden from assistive technology
 * and from the pointer. It draws at most
 * STAR_BUDGET.fpsCap frames a second, stops while the tab is hidden, and with
 * reduced motion draws a single still frame that only redraws when the page
 * scrolls or resizes. If WebGL is unavailable it stays black, like the page.
 *
 * `data-engine` reports the state for the browser tests.
 *
 * `anchor` names the element at whose foot the galaxy sits, and `dimSelector`
 * the text blocks the stars dim behind. Both default to the home page's values.
 */
export function StarSky({ anchor = HOME_ANCHOR, dimSelector = DIM_SELECTOR }: StarSkyPlacement = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setState = (state: EngineState) => canvas.setAttribute("data-engine", state);

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      setState("off");
      return;
    }
    // A CPU (software) renderer gets the plain black page, as without WebGL:
    // checked before compiling anything, because compiling is the costly part.
    if (isSoftwareRenderer(gl)) {
      canvas.setAttribute("data-renderer", "software");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      setState("off");
      return;
    }
    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
      setState("off");
      return;
    }
    gl.useProgram(program);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uniforms = {
      view: u("u_view"),
      scroll: u("u_scroll"),
      time: u("u_time"),
      doc: u("u_doc"),
      galaxy: u("u_galaxy"),
      tip0: u("u_tip0"),
      tip1: u("u_tip1"),
      lane: u("u_lane"),
      strand: u("u_strand"),
      armFlow: u("u_armFlow"),
      share: u("u_share"),
      dpr: u("u_dpr"),
      bright: u("u_bright"),
      rects: u("u_rects"),
      rectCount: u("u_rectCount"),
    };
    const aA = gl.getAttribLocation(program, "a_a");
    const aB = gl.getAttribLocation(program, "a_b");
    const buffer = gl.createBuffer();

    let starCount = 0;
    let compact: boolean | null = null;
    const upload = (width: number) => {
      const nextCompact = width < STAR_BUDGET.compactBelow;
      if (nextCompact === compact) return;
      compact = nextCompact;
      const data = buildStars(countsFor(width));
      starCount = data.length / STRIDE;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const bytes = STRIDE * 4;
      gl.enableVertexAttribArray(aA);
      gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, bytes, 0);
      gl.enableVertexAttribArray(aB);
      gl.vertexAttribPointer(aB, 4, gl.FLOAT, false, bytes, 16);
    };

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 1);
    gl.uniform1f(uniforms.bright, STAR_BUDGET.brightness);

    const rects = new Float32Array(STAR_BUDGET.maxDimRects * 4);
    let width = 1;
    let height = 1;

    const measure = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        STAR_BUDGET.dprCap,
        Math.sqrt(STAR_BUDGET.maxPixels / (width * height)),
      );
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      upload(width);

      const scrollY = window.scrollY;
      const hero = document.querySelector(anchor)?.getBoundingClientRect();
      const galaxy = galaxyFor(width, (hero?.top ?? 0) + scrollY, hero?.height ?? height);
      const blocks = Array.from(document.querySelectorAll(dimSelector)).slice(0, STAR_BUDGET.maxDimRects);
      rects.fill(0);
      blocks.forEach((element, index) => {
        const box = element.getBoundingClientRect();
        rects.set([box.left - 16, box.top + scrollY - 16, box.width + 32, box.height + 32], index * 4);
      });

      gl.uniform2f(uniforms.view, width, height);
      gl.uniform1f(uniforms.dpr, dpr);
      gl.uniform1f(uniforms.doc, document.documentElement.scrollHeight);
      gl.uniform3f(uniforms.galaxy, ...galaxy);
      // Each stream starts at its arm's tip, leaving in the arm's direction.
      gl.uniform4f(uniforms.tip0, ...armPoint(0, 1, galaxy), ...armTipDirection(0, galaxy));
      gl.uniform4f(uniforms.tip1, ...armPoint(1, 1, galaxy), ...armTipDirection(1, galaxy));
      const lanes = strandLanes(width);
      gl.uniform4f(uniforms.lane, lanes.centre, lanes.swing, strandPhase(width, galaxy), lanes.sweep);
      gl.uniform2f(uniforms.strand, lanes.bend, lanes.halfWidth);
      gl.uniform1f(uniforms.armFlow, RIVER_SPEED / armLength(galaxy));
      gl.uniform1f(uniforms.share, streamShare(width, document.documentElement.scrollHeight, galaxy));
      gl.uniform4fv(uniforms.rects, rects);
      gl.uniform1i(uniforms.rectCount, blocks.length);
    };

    const draw = (seconds: number) => {
      gl.uniform1f(uniforms.time, seconds);
      gl.uniform1f(uniforms.scroll, window.scrollY);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, starCount);
      if (!canvas.hasAttribute("data-ready")) canvas.setAttribute("data-ready", "");
    };

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frameGap = 1000 / STAR_BUDGET.fpsCap;
    const stillOnly = () => reduceQuery.matches;
    const start = performance.now();
    let raf = 0;
    let lastFrame = 0;
    let stillQueued = 0;
    let lost = false;

    const loop = (now: number) => {
      raf = window.requestAnimationFrame(loop);
      if (now - lastFrame < frameGap - 1) return;
      lastFrame = now;
      draw((now - start) / 1000);
    };

    const drawStill = () => {
      stillQueued = 0;
      draw(STILL_TIME);
    };
    const queueStill = () => {
      if (!stillQueued) stillQueued = window.requestAnimationFrame(drawStill);
    };

    const stop = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const schedule = () => {
      stop();
      if (lost) return setState("off");
      if (stillOnly()) {
        setState("still");
        queueStill();
        return;
      }
      if (document.hidden) return setState("paused");
      setState("running");
      raf = window.requestAnimationFrame(loop);
    };

    const onScroll = () => {
      if (stillOnly()) queueStill();
    };

    let resizeQueued = 0;
    const onResize = () => {
      if (resizeQueued) return;
      resizeQueued = window.requestAnimationFrame(() => {
        resizeQueued = 0;
        measure();
        if (stillOnly() || document.hidden) queueStill();
      });
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      schedule();
    };

    measure();
    schedule();
    void document.fonts?.ready.then(onResize);

    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduceQuery.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      stop();
      if (stillQueued) window.cancelAnimationFrame(stillQueued);
      if (resizeQueued) window.cancelAnimationFrame(resizeQueued);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", schedule);
      reduceQuery.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [anchor, dimSelector]);

  return <canvas ref={canvasRef} className="jf-sky" aria-hidden="true" data-engine="off" />;
}
