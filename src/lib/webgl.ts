/**
 * WebGL capability detection, shared by every dynamically-loaded 3D scene.
 *
 * Client-only: it touches `document`, so call it from an effect rather than
 * during render. Scenes treat a `false` result as "render the CSS fallback
 * only" — WebGL is never required for content or navigation.
 */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
