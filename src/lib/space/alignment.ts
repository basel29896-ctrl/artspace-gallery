import {
  homographyBetween,
  homographyFromUnitSquare,
  project,
  quadCentroid,
  UNIT_QUAD,
  type Point,
  type Quad,
} from './homography';

/**
 * Alignment aids computed on the WALL PLANE, not in screen space.
 *
 * All placements are assumed coplanar (same wall). We rectify using a non-moving
 * anchor placement's quad as the plane's projective frame, map every piece's key
 * points into that frame's unit coordinates, and snap there — so "level tops" and
 * "equal gaps" hold on the wall even under perspective, where screen-space
 * spacing would be wrong. The snap is then mapped back to a screen translation.
 */

const SNAP_TOP = 0.035; // unit-v threshold for top-edge levelling
const SNAP_GAP = 0.04; // unit-u threshold for equal-gap centring

type Placed = { id: string; quad: Quad };

function topMid(quad: Quad): Point {
  return { x: (quad[0].x + quad[1].x) / 2, y: (quad[0].y + quad[1].y) / 2 };
}

function translateQuad(quad: Quad, dx: number, dy: number): Quad {
  return quad.map((p) => ({ x: p.x + dx, y: p.y + dy })) as Quad;
}

export type SnapResult = { quad: Quad; guides: number[][] };

/**
 * Snaps `candidate` (the selected placement mid-drag) to its neighbours on the
 * wall plane, returning the adjusted quad and any guide lines to draw (each a
 * flat [x0,y0,x1,y1] in screen coordinates).
 */
export function snapPlacement({
  candidate,
  selectedId,
  placements,
}: {
  candidate: Quad;
  selectedId: string;
  placements: Placed[];
}): SnapResult {
  const others = placements.filter((p) => p.id !== selectedId);
  if (others.length === 0) return { quad: candidate, guides: [] };

  // A stable, non-selected placement frames the wall plane.
  const anchor = others[0];
  const toUnit = homographyBetween(anchor.quad, UNIT_QUAD);
  const toScreen = homographyFromUnitSquare(anchor.quad);
  if (!toUnit || !toScreen) return { quad: candidate, guides: [] };

  const unitOf = (p: Point) => project(toUnit, p.x, p.y);

  const selTopUnit = unitOf(topMid(candidate));
  const selCentroidScreen = quadCentroid(candidate);
  const selCentroidUnit = unitOf(selCentroidScreen);
  if (![selTopUnit.x, selCentroidUnit.x].every(Number.isFinite)) {
    return { quad: candidate, guides: [] };
  }

  const guides: number[][] = [];
  let dv = 0;
  let du = 0;

  // Top-edge levelling: match the nearest neighbour top within threshold.
  let bestTop = SNAP_TOP;
  for (const other of others) {
    const otherTopV = unitOf(topMid(other.quad)).y;
    const diff = otherTopV - selTopUnit.y;
    if (Math.abs(diff) < bestTop) {
      bestTop = Math.abs(diff);
      dv = diff;
    }
  }
  if (dv !== 0) {
    const v = selTopUnit.y + dv;
    const a = project(toScreen, -0.3, v);
    const b = project(toScreen, 1.3, v);
    if (Number.isFinite(a.x) && Number.isFinite(b.x)) guides.push([a.x, a.y, b.x, b.y]);
  }

  // Equal horizontal gaps: if the selection sits between two neighbours in u,
  // pull its centre to the midpoint so the two gaps match.
  const us = others.map((o) => unitOf(quadCentroid(o.quad)).x).sort((m, n) => m - n);
  const left = [...us].filter((u) => u < selCentroidUnit.x).pop();
  const right = us.find((u) => u > selCentroidUnit.x);
  if (left !== undefined && right !== undefined) {
    const mid = (left + right) / 2;
    if (Math.abs(mid - selCentroidUnit.x) < SNAP_GAP) {
      du = mid - selCentroidUnit.x;
      const a = project(toScreen, mid, -0.3);
      const b = project(toScreen, mid, 1.3);
      if (Number.isFinite(a.x) && Number.isFinite(b.x)) guides.push([a.x, a.y, b.x, b.y]);
    }
  }

  if (du === 0 && dv === 0) return { quad: candidate, guides };

  // Map the unit-space target back to a screen translation of the whole quad.
  const target = project(
    toScreen,
    selCentroidUnit.x + du,
    selCentroidUnit.y + dv,
  );
  if (!Number.isFinite(target.x)) return { quad: candidate, guides };

  return {
    quad: translateQuad(candidate, target.x - selCentroidScreen.x, target.y - selCentroidScreen.y),
    guides,
  };
}
