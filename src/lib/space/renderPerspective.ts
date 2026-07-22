import { homographyFromUnitSquare, project, type Quad } from './homography';

/**
 * Canvas 2D can only apply affine transforms, so a projective warp is drawn by
 * subdividing the source into a grid of triangles and giving each one its own
 * affine approximation. Error per triangle falls off with the square of the
 * subdivision count; 16 is visually seamless at editor sizes.
 */
const SUBDIVISIONS = 16;

export type FrameStyle = 'none' | 'black' | 'white' | 'wood' | 'gold';

export type FrameSpec = {
  /** Border thickness as a fraction of the artwork's shorter edge. */
  ratio: number;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, inset: number) => void;
};

/**
 * Paints a moulding profile with real depth: an outer chamfer that catches light
 * on its top-left, a flat face, and an inner rabbet that falls into shadow where
 * the frame steps down to the artwork/mat. This is what separates a framed piece
 * from a coloured border.
 */
function paintMoulding(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  inset: number,
  face: string | CanvasGradient,
  opts: { highlight: string; shadow: string; innerLip: string },
) {
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, w, h);

  const chamfer = Math.max(inset * 0.22, 1);
  // Outer top + left chamfer highlight, bottom + right chamfer shadow.
  ctx.fillStyle = opts.highlight;
  ctx.fillRect(0, 0, w, chamfer);
  ctx.fillRect(0, 0, chamfer, h);
  ctx.fillStyle = opts.shadow;
  ctx.fillRect(0, h - chamfer, w, chamfer);
  ctx.fillRect(w - chamfer, 0, chamfer, h);

  // Inner rabbet: a dark step where the frame drops to the artwork opening.
  const lip = Math.max(inset * 0.16, 1.5);
  ctx.strokeStyle = opts.innerLip;
  ctx.lineWidth = lip;
  ctx.strokeRect(inset - lip / 2, inset - lip / 2, w - inset * 2 + lip, h - inset * 2 + lip);
}

export const FRAMES: Record<FrameStyle, FrameSpec | null> = {
  none: null,
  black: {
    ratio: 0.04,
    paint: (ctx, w, h, inset) =>
      paintMoulding(ctx, w, h, inset, '#1a1714', {
        highlight: 'rgba(255,255,255,0.10)',
        shadow: 'rgba(0,0,0,0.5)',
        innerLip: 'rgba(0,0,0,0.7)',
      }),
  },
  white: {
    ratio: 0.04,
    paint: (ctx, w, h, inset) =>
      paintMoulding(ctx, w, h, inset, '#f3f1ec', {
        highlight: 'rgba(255,255,255,0.75)',
        shadow: 'rgba(120,112,100,0.4)',
        innerLip: 'rgba(90,84,74,0.45)',
      }),
  },
  wood: {
    ratio: 0.055,
    paint: (ctx, w, h, inset) => {
      const grain = ctx.createLinearGradient(0, 0, w, h);
      grain.addColorStop(0, '#8b5e34');
      grain.addColorStop(0.45, '#a9773f');
      grain.addColorStop(0.7, '#7d5229');
      grain.addColorStop(1, '#9c6b38');
      paintMoulding(ctx, w, h, inset, grain, {
        highlight: 'rgba(255,225,180,0.22)',
        shadow: 'rgba(45,25,8,0.5)',
        innerLip: 'rgba(50,28,10,0.6)',
      });
    },
  },
  gold: {
    ratio: 0.05,
    paint: (ctx, w, h, inset) => {
      const gilt = ctx.createLinearGradient(0, 0, w, h);
      gilt.addColorStop(0, '#8a6a24');
      gilt.addColorStop(0.3, '#e6c76a');
      gilt.addColorStop(0.5, '#f6e6ab');
      gilt.addColorStop(0.72, '#c9a13f');
      gilt.addColorStop(1, '#8a6a24');
      paintMoulding(ctx, w, h, inset, gilt, {
        highlight: 'rgba(255,244,200,0.55)',
        shadow: 'rgba(80,55,10,0.5)',
        innerLip: 'rgba(70,48,10,0.6)',
      });
    },
  },
};

export type RealismSettings = {
  brightness: number; // 0.5 – 1.5
  warmth: number; // -1 (cool) – 1 (warm)
  shadow: boolean;
};

export type MatColor = 'white' | 'ivory' | 'grey' | 'black';

export type MatSettings = {
  /** Mat (passe-partout) width as a fraction of the artwork's shorter edge.
   *  0 disables matting entirely. */
  width: number;
  color: MatColor;
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

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(imageWidth + (frameInset + matInset) * 2);
  canvas.height = Math.round(imageHeight + (frameInset + matInset) * 2);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Frame fills the whole board; the mat/artwork then cover its interior.
  if (spec) spec.paint(ctx, canvas.width, canvas.height, frameInset);

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

    // Bevelled core line at the opening, plus a soft inner shadow so the mat
    // sits visibly proud of the artwork.
    const bevel = Math.max(matInset * 0.06, 1.5);
    ctx.strokeStyle = MAT_BEVEL[mat.color];
    ctx.lineWidth = bevel;
    ctx.strokeRect(
      artX - bevel / 2,
      artY - bevel / 2,
      imageWidth + bevel,
      imageHeight + bevel,
    );

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = Math.max(matInset * 0.08, 3);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(matInset * 0.03, 1);
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
