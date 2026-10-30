/**
 * The small amount of WebGL plumbing three.js was providing for the wave.
 *
 * Deliberately not a library: the phone wave needs one shader program, one
 * static buffer and two matrices. Pulling in a maths package to supply forty
 * lines of matrix code would reintroduce exactly the kind of bundle weight
 * ADR-0003 removed.
 *
 * Matrices are column-major `Float32Array(16)`, the layout `uniformMatrix4fv`
 * expects, so they can be handed to WebGL without transposing.
 */

export type Mat4 = Float32Array;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Deliberately silent in production: a decorative background that fails to
    // compile must degrade to the CSS glow, never surface an error to a
    // visitor or to the console of a page that is otherwise fine.
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Compiles and links a program, or returns null so the caller can fall back. */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  // The shaders are linked into the program and no longer needed on their own.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** KHR_parallel_shader_compile's query: true once a compile or link has finished. */
const COMPLETION_STATUS_KHR = 0x91b1;

/**
 * Like createProgram, but where the browser offers KHR_parallel_shader_compile
 * the GPU compiles and links in the background and this waits a frame at a
 * time, instead of blocking the page until the link finishes (tens of
 * milliseconds for a large shader on a cold cache). Resolves null on failure.
 */
export async function createProgramAsync(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): Promise<WebGLProgram | null> {
  if (!gl.getExtension("KHR_parallel_shader_compile")) return createProgram(gl, vertexSource, fragmentSource);
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.shaderSource(vertex, vertexSource);
  gl.compileShader(vertex);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  while (!gl.isContextLost() && !gl.getProgramParameter(program, COMPLETION_STATUS_KHR)) {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 16));
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.isContextLost() || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** Standard OpenGL perspective projection. `fovY` is in radians. */
export function perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const range = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * range;
  m[11] = -1;
  m[14] = 2 * far * near * range;
  return m;
}

/** View matrix for a camera at `eye` looking at `target`, Y-up. */
export function lookAt(
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number] = [0, 1, 0],
): Mat4 {
  const z = normalise([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const x = normalise(cross(up, z));
  const y = cross(z, x);

  const m = new Float32Array(16);
  m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0;
  m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0;
  m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
  m[12] = -dot(x, eye);
  m[13] = -dot(y, eye);
  m[14] = -dot(z, eye);
  m[15] = 1;
  return m;
}

/**
 * View matrix times the wave's model matrix, which is only a horizontal stretch
 * and a push back to the plane's z. Built directly rather than through a
 * general multiply: the model matrix is diagonal plus a translation, so the
 * product is four multiplies and an add.
 */
export function modelView(view: Mat4, xScale: number, planeZ: number): Mat4 {
  const m = new Float32Array(view);
  // Scale the x basis vector.
  m[0] = view[0] * xScale;
  m[1] = view[1] * xScale;
  m[2] = view[2] * xScale;
  m[3] = view[3] * xScale;
  // Translate along the model's z, which is the view's third column.
  m[12] = view[8] * planeZ + view[12];
  m[13] = view[9] * planeZ + view[13];
  m[14] = view[10] * planeZ + view[14];
  m[15] = view[11] * planeZ + view[15];
  return m;
}

function cross(
  a: readonly [number, number, number] | number[],
  b: readonly [number, number, number] | number[],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(
  a: readonly [number, number, number] | number[],
  b: readonly [number, number, number] | number[],
): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalise(v: [number, number, number]): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * True when WebGL is drawn on the CPU (SwiftShader, llvmpipe, Microsoft Basic
 * Render): virtual machines, remote desktops and machines whose GPU driver is
 * blocked. The decorative star scenes do not draw there at all: compiling and
 * drawing them on the CPU costs far more than a decoration is worth.
 */
export function isSoftwareRenderer(gl: WebGLRenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|software|basic render/i.test(renderer);
}

/**
 * Whether this browser draws WebGL on a GPU: false without WebGL or on a
 * software (CPU) renderer (ADR-0030 D5). Cheap enough to ask before load, so
 * a page can choose its fallback early; the probe's context is released.
 */
export function hasHardwareWebGL(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return false;
    const hardware = !isSoftwareRenderer(gl);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return hardware;
  } catch {
    return false;
  }
}

/** Parses `#rrggbb` into the 0..1 triple the shader's `vec3` uniforms expect. */
export function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", ""), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}
