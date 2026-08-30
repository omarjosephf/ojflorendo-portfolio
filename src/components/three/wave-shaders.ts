/**
 * GLSL for the particle wave, shared by both renderers.
 *
 * The desktop scene runs it through three.js; phones run the identical source
 * through a bespoke WebGL renderer (ADR-0009). One copy, so the two can never
 * drift apart — they are meant to be the same water.
 *
 * The source is written for three.js, which injects `position`,
 * `modelViewMatrix` and `projectionMatrix` and a default precision. A raw
 * context gets none of that, so it prepends the preludes below.
 */

/**
 * All wave motion happens on the GPU: the vertex shader displaces a flat point
 * grid from a single `uTime` uniform, so the per-frame CPU cost is a handful of
 * uniform writes regardless of particle count, and the geometry is uploaded once.
 */
export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uAmplitude;
  uniform float uHalfDepth;
  uniform float uHalfWidth;

  varying float vHeight;
  varying float vDepth;
  varying float vGlow;
  varying float vEdge;

  void main() {
    vec3 pos = position;

    // Three crossing sine waves at unrelated speeds, so the surface drifts and
    // never visibly loops.
    float wave =
        sin(pos.x * 0.32 + uTime * 0.50) * 0.55
      + sin(pos.z * 0.24 + uTime * 0.36) * 0.45
      + sin((pos.x + pos.z) * 0.16 - uTime * 0.28) * 0.40;

    // A localised ripple that follows the pointer and decays with distance.
    float pointerDistance = distance(pos.xz, uPointer);
    float falloff = exp(-pointerDistance * 0.09);
    wave += sin(pointerDistance * 0.45 - uTime * 2.2) * falloff * uPointerStrength * 0.6;

    // Settle the wave flat towards the horizon. Distant water reads as calm
    // anyway, and at this shallow viewing angle un-settled far crests project
    // into hard vertical streaks.
    float nearness = clamp((pos.z + uHalfDepth) / (2.0 * uHalfDepth), 0.0, 1.0);
    pos.y = wave * uAmplitude * smoothstep(0.0, 0.55, nearness);

    vHeight = wave;
    vGlow = falloff * uPointerStrength;
    // Safety net for aspect ratios wider than the field was stretched to: the
    // lateral edges dissolve rather than ending in a straight line.
    vEdge = 1.0 - smoothstep(0.82, 1.0, abs(pos.x) / uHalfWidth);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z;

    gl_Position = projectionMatrix * mvPosition;
    // Perspective-correct sizing, capped so the nearest row cannot bloom into
    // large blobs. Scaled by DPR because gl_PointSize is in physical pixels and
    // would otherwise shrink on high-density screens.
    gl_PointSize = min(uSize * (30.0 / max(vDepth, 2.0)), 7.0) * uPixelRatio;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform vec3 uColorCrest;
  uniform vec3 uColorTrough;
  uniform float uOpacity;
  uniform float uFadeNear;
  uniform float uFadeFar;
  uniform float uViewportHeightPx;
  uniform float uBandLow;
  uniform float uBandHigh;

  varying float vHeight;
  varying float vDepth;
  varying float vGlow;
  varying float vEdge;

  void main() {
    // Soft round points. The falloff is deliberately wide and gradual: small
    // hard-edged bright dots on a dark field are exactly what starbursts and
    // smears for readers with astigmatism.
    vec2 offset = gl_PointCoord - 0.5;
    float radial = dot(offset, offset);
    if (radial > 0.25) discard;
    float alpha = smoothstep(0.25, 0.06, radial) * 0.85;

    vec3 color = mix(uColorTrough, uColorCrest, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    color += uColorCrest * vGlow * 0.15;

    // Dissolve towards the horizon so the grid has no visible far edge.
    float fade = 1.0 - smoothstep(uFadeNear, uFadeFar, vDepth);

    // Confine the water to the lower half of the viewport, like a shoreline
    // seen from the beach. Done in screen space rather than by moving the
    // camera, so the band lands identically on any viewport shape — and it
    // leaves the upper half, where most reading happens, completely clear.
    float ny = gl_FragCoord.y / max(uViewportHeightPx, 1.0);
    float band = 1.0 - smoothstep(uBandLow, uBandHigh, ny);

    gl_FragColor = vec4(
      color,
      alpha * uOpacity * fade * vEdge * band * (1.0 + vGlow * 0.25)
    );
  }
`;

/**
 * Declarations three.js injects and a raw WebGL context does not.
 *
 * `highp` in the fragment shader is deliberate: `uTime` accumulates for the
 * life of the page, and at `mediump` the sines visibly quantise after a few
 * minutes.
 */
export const RAW_VERTEX_PRELUDE = /* glsl */ `
  attribute vec3 position;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
`;

export const RAW_FRAGMENT_PRELUDE = /* glsl */ `
  precision highp float;
`;
