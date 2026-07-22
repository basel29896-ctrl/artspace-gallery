import {
  homographyBetween,
  project,
  quadWidthPx,
  scaleQuadAboutCentroid,
  UNIT_QUAD,
  type Point,
  type Quad,
} from './homography';

/**
 * True-to-scale placement is derived from a single reference segment the user
 * draws over a known-length object on the wall.
 *
 * Simplifying assumptions (documented, and adequate for a visualisation tool —
 * not metrology):
 *
 *  1. The reference lies on the SAME wall plane as the artwork. We reuse the
 *     artwork quad's homography as the plane's projective frame, so a screen
 *     point is read as a position WITHIN that plane rather than in raw pixels —
 *     this is what makes the measurement perspective-correct.
 *  2. The artwork is a true rectangle whose aspect equals the displayed image's
 *     aspect. With that, one reference segment is enough to solve the plane's
 *     metric scale (otherwise a single segment underdetermines an anisotropic
 *     plane).
 *  3. The calibrated scale (pixels per cm at the artwork's depth) is treated as
 *     roughly constant across the visible wall. Moving a piece far across a
 *     steeply angled wall will drift; re-calibrate near the target spot.
 */
export type Calibration = {
  /** Screen pixels per real centimetre, measured on the wall plane. */
  pxPerCm: number;
};

type CalibrateInput = {
  quad: Quad;
  refA: Point;
  refB: Point;
  refCm: number;
  /** Artwork aspect ratio, width / height (from the displayed image). */
  aspect: number;
};

/**
 * Derives the wall-plane scale from the artwork quad and the reference segment.
 * Returns null when the geometry is degenerate or inputs are non-positive.
 */
export function calibrateFromReference({
  quad,
  refA,
  refB,
  refCm,
  aspect,
}: CalibrateInput): Calibration | null {
  if (!(refCm > 0) || !(aspect > 0)) return null;

  // screen → unit-square: read both endpoints as positions inside the plane.
  const toUnit = homographyBetween(quad, UNIT_QUAD);
  if (!toUnit) return null;

  const ua = project(toUnit, refA.x, refA.y);
  const ub = project(toUnit, refB.x, refB.y);
  if (!Number.isFinite(ua.x) || !Number.isFinite(ub.x)) return null;

  const du = ub.x - ua.x; // fraction of the artwork's width
  const dv = ub.y - ua.y; // fraction of the artwork's height

  // Physical width the artwork is CURRENTLY drawn at. The reference length in
  // plane-metric terms is Wcur·sqrt(du² + (dv/aspect)²), since a full unit of v
  // spans height = width/aspect.
  const denom = Math.sqrt(du * du + (dv / aspect) * (dv / aspect));
  if (!(denom > 1e-6)) return null;

  const currentWidthCm = refCm / denom;
  const screenW = quadWidthPx(quad);
  if (!(screenW > 0) || !(currentWidthCm > 0)) return null;

  return { pxPerCm: screenW / currentWidthCm };
}

/**
 * Rescales the quad about its centroid so the artwork's on-wall width equals
 * `targetWidthCm`, keeping its current position and perspective. Height follows
 * from the quad's shape (the displayed image aspect).
 */
export function resizeQuadToWidthCm(
  quad: Quad,
  targetWidthCm: number,
  calibration: Calibration,
): Quad {
  const targetScreenW = targetWidthCm * calibration.pxPerCm;
  const currentScreenW = quadWidthPx(quad);
  if (!(currentScreenW > 0) || !(targetScreenW > 0)) return quad;
  return scaleQuadAboutCentroid(quad, targetScreenW / currentScreenW);
}
