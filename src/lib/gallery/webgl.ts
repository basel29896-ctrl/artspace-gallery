/**
 * Feature-detects WebGL2 with a WebGL1 fallback. Must run client-side only —
 * there is no canvas during SSR.
 */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');

    if (!gl) return false;

    // Software rasterizers technically report support but render the room at a
    // few frames per second; treat them as unsupported.
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = String(
        (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '',
      ).toLowerCase();
      if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
