import { homographyBetween, type Quad } from '@/lib/space/homography';

/**
 * CSS `matrix3d` that warps a `srcW × srcH` element so its corners land on `dst`
 * (reference-pixel coordinates), giving a true perspective map onto a frame.
 *
 * Built from the same projective homography the Space editor uses: H maps the
 * source rectangle's corners to the destination quad; its 3×3 is embedded into
 * the column-major 4×4 `matrix3d` (z untouched).
 */
export function matrix3dForQuad(srcW: number, srcH: number, dst: Quad): string | null {
  const src: Quad = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];
  const h = homographyBetween(src, dst);
  if (!h) return null;

  // H (row-major) = [h0 h1 h2; h3 h4 h5; h6 h7 h8]
  // matrix3d columns: x-coeffs, y-coeffs, z, constant.
  return `matrix3d(${h[0]},${h[3]},0,${h[6]}, ${h[1]},${h[4]},0,${h[7]}, 0,0,1,0, ${h[2]},${h[5]},0,${h[8]})`;
}

/** Axis-aligned bounding size of a quad — used as the source box (keeps aspect sane). */
export function quadBounds(quad: Quad): { width: number; height: number } {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
