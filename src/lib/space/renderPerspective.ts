import { homographyFromUnitSquare, project, type Quad } from './homography';

/**
 * Canvas 2D can only apply affine transforms, so a projective warp is drawn by
 * subdividing the source into a grid of triangles and giving each one its own
 * affine approximation. Error per triangle falls off with the square of the
 * subdivision count; 16 is visually seamless at editor sizes.
 */
const SUBDIVISIONS = 16;

export type FrameStyle =
  | 'none'
  | 'thin'
  | 'black'
  | 'white'
  | 'oak'
  | 'natural-oak'
  | 'walnut'
  | 'gold'
  | 'silver'
  | 'thin-metal';

export type FrameSpec = {
  /** Border thickness as a fraction of the artwork's shorter edge. */
  ratio: number;
  /** Base colour of the moulding face. */
  color: string;
  /** How reflective the profile reads: scales the light/shadow across the bevel. */
  sheen?: number;
  /** Procedural surface baked into each moulding side (along its length). */
  texture?: 'wood' | 'metal';
};

type Poly = [number, number][];

/** Traces a polygon path (does not fill/stroke). */
function tracePoly(ctx: CanvasRenderingContext2D, pts: Poly) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/**
 * Layered low-alpha streaks running ALONG a moulding side, clipped to it.
 * `horizontal` sides (top/bottom) get streaks across x; vertical sides across y.
 * Wood reads as irregular grain; metal as fine brushed lines plus a specular band.
 */
function paintGrain(
  ctx: CanvasRenderingContext2D,
  pts: Poly,
  horizontal: boolean,
  inset: number,
  kind: 'wood' | 'metal',
) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  ctx.save();
  tracePoly(ctx, pts);
  ctx.clip();

  // Deterministic pseudo-random so the bake is stable across re-renders.
  let seed = Math.round(x0 * 13 + y0 * 7 + inset) % 997;
  const rand = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  if (kind === 'wood') {
    const count = Math.max(Math.round(inset * 0.9), 10);
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      const dark = rand() > 0.5;
      ctx.strokeStyle = dark
        ? `rgba(45,28,12,${0.05 + rand() * 0.08})`
        : `rgba(240,210,160,${0.04 + rand() * 0.06})`;
      ctx.beginPath();
      if (horizontal) {
        const y = y0 + t * (y1 - y0);
        const wobble = (rand() - 0.5) * inset * 0.12;
        ctx.moveTo(x0, y);
        ctx.bezierCurveTo(x0 + (x1 - x0) / 3, y + wobble, x0 + (2 * (x1 - x0)) / 3, y - wobble, x1, y);
      } else {
        const x = x0 + t * (x1 - x0);
        const wobble = (rand() - 0.5) * inset * 0.12;
        ctx.moveTo(x, y0);
        ctx.bezierCurveTo(x + wobble, y0 + (y1 - y0) / 3, x - wobble, y0 + (2 * (y1 - y0)) / 3, x, y1);
      }
      ctx.stroke();
    }
  } else {
    // Brushed metal: dense fine streaks + a bright specular sweep near the outer edge.
    const count = Math.max(Math.round(inset * 1.4), 16);
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      ctx.strokeStyle = rand() > 0.5
        ? `rgba(255,255,255,${0.03 + rand() * 0.05})`
        : `rgba(0,0,0,${0.03 + rand() * 0.05})`;
      ctx.beginPath();
      if (horizontal) {
        const y = y0 + t * (y1 - y0);
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      } else {
        const x = x0 + t * (x1 - x0);
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      ctx.stroke();
    }
    const spec = ctx.createLinearGradient(x0, y0, horizontal ? x0 : x1, horizontal ? y1 : y0);
    spec.addColorStop(0, 'rgba(255,255,255,0.28)');
    spec.addColorStop(0.25, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    tracePoly(ctx, pts);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Paints a mitered moulding: the border is split into four bevelled sides that
 * meet at 45° seams, each shaded across its depth so the frame reads as a raised,
 * angled profile lit from the top-left. Optional wood/metal grain is baked along
 * each side; a rabbet drops into shadow at the opening and a thin seam seats it
 * against the wall.
 */
function paintMoulding(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  inset: number,
  color: string,
  sheen: number,
  texture?: 'wood' | 'metal',
) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);

  const iL = inset;
  const iT = inset;
  const iR = w - inset;
  const iB = h - inset;

  const hi = Math.min(0.6 * sheen, 0.95);
  const lo = Math.min(0.5 * sheen, 0.85);

  const side = (
    pts: Poly,
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    outer: string,
    inner: string,
    horizontal: boolean,
  ) => {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, outer);
    g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(1, inner);
    ctx.fillStyle = g;
    tracePoly(ctx, pts);
    ctx.fill();
    if (texture) paintGrain(ctx, pts, horizontal, inset, texture);
  };

  // Top / left lit; bottom / right in shadow. Gradient runs outer edge → opening.
  side([[0, 0], [w, 0], [iR, iT], [iL, iT]], 0, 0, 0, iT, `rgba(255,255,255,${hi})`, 'rgba(0,0,0,0.35)', true);
  side([[0, 0], [iL, iT], [iL, iB], [0, h]], 0, 0, iL, 0, `rgba(255,255,255,${hi})`, 'rgba(0,0,0,0.35)', false);
  side([[0, h], [iL, iB], [iR, iB], [w, h]], 0, h, 0, iB, `rgba(0,0,0,${lo})`, 'rgba(0,0,0,0.22)', true);
  side([[w, 0], [w, h], [iR, iB], [iR, iT]], w, 0, iR, 0, `rgba(0,0,0,${lo})`, 'rgba(0,0,0,0.22)', false);

  // Mitered 45° corner seams: outer corner → matching opening corner.
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 1;
  const seams: [number, number, number, number][] = [
    [0, 0, iL, iT],
    [w, 0, iR, iT],
    [w, h, iR, iB],
    [0, h, iL, iB],
  ];
  for (const [x0, y0, x1, y1] of seams) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Inner rabbet: a hard dark step where the frame drops to the opening.
  const lip = Math.max(inset * 0.12, 1.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = lip;
  ctx.strokeRect(iL - lip / 2, iT - lip / 2, w - inset * 2 + lip, h - inset * 2 + lip);

  // Thin outer seam so the moulding has a crisp edge against the wall.
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = Math.max(inset * 0.04, 1);
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export const FRAMES: Record<FrameStyle, FrameSpec | null> = {
  none: null,
  thin: { ratio: 0.02, color: '#17140f', sheen: 0.7 },
  black: { ratio: 0.05, color: '#1a1714', sheen: 0.8 },
  white: { ratio: 0.05, color: '#f0ede6', sheen: 0.55 },
  oak: { ratio: 0.06, color: '#c19a5b', sheen: 0.55, texture: 'wood' },
  'natural-oak': { ratio: 0.065, color: '#cdae74', sheen: 0.5, texture: 'wood' },
  walnut: { ratio: 0.06, color: '#5f3f28', sheen: 0.6, texture: 'wood' },
  gold: { ratio: 0.055, color: '#c9a13f', sheen: 1.3 },
  silver: { ratio: 0.05, color: '#b8bcc0', sheen: 1.2, texture: 'metal' },
  'thin-metal': { ratio: 0.022, color: '#c7cace', sheen: 1.4, texture: 'metal' },
};

function paintFrame(
  ctx: CanvasRenderingContext2D,
  spec: FrameSpec,
  w: number,
  h: number,
  inset: number,
) {
  paintMoulding(ctx, w, h, inset, spec.color, spec.sheen ?? 1, spec.texture);
}

export type RealismSettings = {
  brightness: number; // 0.5 – 1.5
  warmth: number; // -1 (cool) – 1 (warm)
  shadow: boolean;
};

export type MatColor = 'white' | 'ivory' | 'grey' | 'black';

export type MatSettings = {
  /** Mat (passe-partout) width as a fraction of the artwork's shorter edge.
   *  0 disables matting entirely. Controls expose this in cm; the fraction is
   *  the internal representation until the true-cm pipeline is wired through. */
  width: number;
  color: MatColor;
  /** Gallery convention: extra weight along the bottom (mat +20% below). */
  bottomWeighted?: boolean;
};

const MAT_FACE: Record<MatColor, string> = {
  white: '#f7f5f0',
  ivory: '#efe7d6',
  grey: '#b9b4ac',
  black: '#181614',
};

// A cut mat has a slightly darker bevelled edge where the board's core shows
// through at the opening; this is the detail that reads as "matted" rather than
// "padded". Paired with a soft cast shadow onto the artwork below it.
const MAT_BEVEL: Record<MatColor, string> = {
  white: '#d8d2c6',
  ivory: '#d3c6ac',
  grey: '#8f8a82',
  black: '#000000',
};

/**
 * A cut mat's bevel: a 45° chamfer from the mat face down to the artwork plane,
 * shown as four trapezoids around the opening. Lit top/left, shadowed
 * bottom/right, tinted with the board's core colour.
 */
function paintMatBevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  bevel: number,
  core: string,
) {
  const oTL: [number, number] = [x - bevel, y - bevel];
  const oTR: [number, number] = [x + w + bevel, y - bevel];
  const oBR: [number, number] = [x + w + bevel, y + h + bevel];
  const oBL: [number, number] = [x - bevel, y + h + bevel];
  const iTL: [number, number] = [x, y];
  const iTR: [number, number] = [x + w, y];
  const iBR: [number, number] = [x + w, y + h];
  const iBL: [number, number] = [x, y + h];

  const face = (pts: Poly, overlay: string) => {
    ctx.fillStyle = core;
    tracePoly(ctx, pts);
    ctx.fill();
    ctx.fillStyle = overlay;
    tracePoly(ctx, pts);
    ctx.fill();
  };

  face([oTL, oTR, iTR, iTL], 'rgba(255,255,255,0.30)'); // top — lit
  face([oBL, oTL, iTL, iBL], 'rgba(255,255,255,0.18)'); // left — lit
  face([oTR, oBR, iBR, iTR], 'rgba(0,0,0,0.20)'); // right — shadow
  face([oBR, oBL, iBL, iBR], 'rgba(0,0,0,0.30)'); // bottom — shadow
}

/**
 * Composites artwork + optional mat + optional frame onto an offscreen canvas at
 * native resolution. Returned separately from the warp so the expensive part is
 * only redone when the artwork, frame, mat, or colour settings change — not on
 * every corner drag.
 *
 * Layout, outside → in: frame border, then mat board, then the artwork.
 */
export function composeFramedArtwork(
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  frame: FrameStyle,
  mat: MatSettings,
  realism: RealismSettings,
): HTMLCanvasElement {
  const shortEdge = Math.min(imageWidth, imageHeight);
  const spec = FRAMES[frame];
  const frameInset = spec ? shortEdge * spec.ratio : 0;
  const matInset = mat.width > 0 ? shortEdge * mat.width : 0;
  // Gallery bottom-weighting: 20% extra mat below the opening only.
  const bottomExtra = matInset > 0 && mat.bottomWeighted ? matInset * 0.2 : 0;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imageWidth + (frameInset + matInset) * 2);
  canvas.height = Math.round(imageHeight + (frameInset + matInset) * 2 + bottomExtra);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Frame fills the whole board; the mat/artwork then cover its interior.
  if (spec) paintFrame(ctx, spec, canvas.width, canvas.height, frameInset);

  const artX = frameInset + matInset;
  const artY = frameInset + matInset;

  // 2. Mat board around the artwork opening.
  if (matInset > 0) {
    ctx.fillStyle = MAT_FACE[mat.color];
    ctx.fillRect(
      frameInset,
      frameInset,
      canvas.width - frameInset * 2,
      canvas.height - frameInset * 2,
    );

    // 45° cut bevel around the opening (lit top/left, dark bottom/right).
    const bevel = Math.max(matInset * 0.09, 2);
    paintMatBevel(ctx, artX, artY, imageWidth, imageHeight, bevel, MAT_BEVEL[mat.color]);

    // Soft inner shadow cast by the mat onto the recessed artwork.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = Math.max(matInset * 0.1, 4);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(matInset * 0.04, 1.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.001)';
    ctx.lineWidth = 1;
    ctx.strokeRect(artX, artY, imageWidth, imageHeight);
    ctx.restore();
  }

  // 3. Artwork.
  ctx.drawImage(image, artX, artY, imageWidth, imageHeight);

  // Colour grading is applied to the artwork area only — a real frame or mat
  // does not change hue with the room's light the way a canvas surface does.
  if (realism.brightness !== 1 || realism.warmth !== 0) {
    const region = ctx.getImageData(
      Math.round(artX),
      Math.round(artY),
      Math.round(imageWidth),
      Math.round(imageHeight),
    );
    const data = region.data;
    const warmR = 1 + realism.warmth * 0.18;
    const warmB = 1 - realism.warmth * 0.18;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * realism.brightness * warmR);
      data[i + 1] = Math.min(255, data[i + 1] * realism.brightness);
      data[i + 2] = Math.min(255, data[i + 2] * realism.brightness * warmB);
    }
    ctx.putImageData(region, Math.round(artX), Math.round(artY));
  }

  return canvas;
}

/**
 * Warps `source` so its four corners land exactly on `quad`.
 * Returns false when the quad is degenerate and nothing was drawn.
 */
export function drawPerspective(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  quad: Quad,
): boolean {
  const h = homographyFromUnitSquare(quad);
  if (!h) return false;

  // Precompute the projected grid once; every triangle reuses its neighbours' points.
  const grid: { x: number; y: number }[][] = [];
  for (let row = 0; row <= SUBDIVISIONS; row += 1) {
    const line: { x: number; y: number }[] = [];
    for (let col = 0; col <= SUBDIVISIONS; col += 1) {
      const p = project(h, col / SUBDIVISIONS, row / SUBDIVISIONS);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
      line.push(p);
    }
    grid.push(line);
  }

  const cellW = sourceWidth / SUBDIVISIONS;
  const cellH = sourceHeight / SUBDIVISIONS;

  for (let row = 0; row < SUBDIVISIONS; row += 1) {
    for (let col = 0; col < SUBDIVISIONS; col += 1) {
      const sx = col * cellW;
      const sy = row * cellH;

      const p00 = grid[row][col];
      const p10 = grid[row][col + 1];
      const p01 = grid[row + 1][col];
      const p11 = grid[row + 1][col + 1];

      drawTriangle(ctx, source, sx, sy, sx + cellW, sy, sx, sy + cellH, p00, p10, p01);
      drawTriangle(
        ctx, source,
        sx + cellW, sy, sx + cellW, sy + cellH, sx, sy + cellH,
        p10, p11, p01,
      );
    }
  }

  return true;
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sx0: number, sy0: number,
  sx1: number, sy1: number,
  sx2: number, sy2: number,
  d0: { x: number; y: number },
  d1: { x: number; y: number },
  d2: { x: number; y: number },
) {
  ctx.save();

  // Clip to the destination triangle, expanded by a hair. Without the overdraw,
  // antialiasing leaves visible hairline seams between adjacent cells.
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const bleed = 0.5;
  const expand = (p: { x: number; y: number }) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * bleed, y: p.y + (dy / len) * bleed };
  };
  const e0 = expand(d0);
  const e1 = expand(d1);
  const e2 = expand(d2);

  ctx.beginPath();
  ctx.moveTo(e0.x, e0.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.closePath();
  ctx.clip();

  // Affine matrix taking the source triangle onto the destination triangle.
  const denom = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0);
  if (Math.abs(denom) < 1e-12) {
    ctx.restore();
    return;
  }

  const a = ((d1.x - d0.x) * (sy2 - sy0) - (d2.x - d0.x) * (sy1 - sy0)) / denom;
  const b = ((d1.y - d0.y) * (sy2 - sy0) - (d2.y - d0.y) * (sy1 - sy0)) / denom;
  const c = ((d2.x - d0.x) * (sx1 - sx0) - (d1.x - d0.x) * (sx2 - sx0)) / denom;
  const d = ((d2.y - d0.y) * (sx1 - sx0) - (d1.y - d0.y) * (sx2 - sx0)) / denom;

  ctx.transform(a, b, c, d, d0.x - a * sx0 - c * sy0, d0.y - b * sx0 - d * sy0);
  ctx.drawImage(source, 0, 0);

  ctx.restore();
}
