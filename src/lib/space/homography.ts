export type Point = { x: number; y: number };
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

/**
 * 3x3 projective transform, row-major:
 *   [ m0 m1 m2 ]
 *   [ m3 m4 m5 ]
 *   [ m6 m7  1 ]
 */
export type Homography = number[];

/**
 * Solves A·x = b by Gaussian elimination with partial pivoting.
 * Returns null when the system is singular (degenerate quad).
 */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // Work on copies — callers reuse their inputs.
  const m = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;

    [m[col], m[pivot]] = [m[pivot], m[col]];

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row][col] / m[col][col];
      if (factor === 0) continue;
      for (let k = col; k <= n; k += 1) {
        m[row][k] -= factor * m[col][k];
      }
    }
  }

  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Homography mapping the unit square (0,0)-(1,1) onto `quad`.
 *
 * Each corner contributes two equations. With m8 fixed at 1 that is 8 unknowns
 * from 8 equations — exactly determined, no least-squares needed.
 */
export function homographyFromUnitSquare(quad: Quad): Homography | null {
  const src: Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const { x: u, y: v } = src[i];
    const { x, y } = quad[i];

    // x = (m0·u + m1·v + m2) / (m6·u + m7·v + 1)
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    // y = (m3·u + m4·v + m5) / (m6·u + m7·v + 1)
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const solution = solve(A, b);
  if (!solution) return null;
  if (solution.some((value) => !Number.isFinite(value))) return null;

  return [...solution, 1];
}

/** Maps a point in unit-square space through the homography. */
export function project(h: Homography, u: number, v: number): Point {
  const denominator = h[6] * u + h[7] * v + 1;
  // A near-zero denominator means the point projects to infinity — the quad has
  // folded through the horizon. Callers treat this as an invalid configuration.
  if (Math.abs(denominator) < 1e-9) return { x: NaN, y: NaN };

  return {
    x: (h[0] * u + h[1] * v + h[2]) / denominator,
    y: (h[3] * u + h[4] * v + h[5]) / denominator,
  };
}

function cross(o: Point, a: Point, b: Point) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * True when the quad is a simple (non-self-intersecting) convex polygon wound
 * consistently. A dragged corner can easily produce a bow-tie, which renders as
 * garbage — the editor uses this to reject the drag rather than draw nonsense.
 */
export function isConvexQuad(quad: Quad): boolean {
  let positive = 0;
  let negative = 0;

  for (let i = 0; i < 4; i += 1) {
    const value = cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
    if (value > 1e-9) positive += 1;
    if (value < -1e-9) negative += 1;
  }

  // All turns must share a sign; any mix means a reflex corner or a crossing.
  return positive === 4 || negative === 4;
}

/** Minimum edge length, used to stop a quad collapsing to a line. */
export function minEdgeLength(quad: Quad): number {
  let min = Infinity;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    min = Math.min(min, Math.hypot(b.x - a.x, b.y - a.y));
  }
  return min;
}

/**
 * Even-odd ray cast. Used to decide whether a pointer press landed on the
 * artwork, since the quad is arbitrary (and possibly non-rectangular) once the
 * corners have been dragged into perspective.
 */
export function pointInQuad(quad: Quad, point: Point): boolean {
  let inside = false;

  for (let i = 0, j = 3; i < 4; j = i, i += 1) {
    const a = quad[i];
    const b = quad[j];
    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;

    const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < x) inside = !inside;
  }

  return inside;
}

/** Average of the four corners. */
export function quadCentroid(quad: Quad): Point {
  return {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4,
  };
}
