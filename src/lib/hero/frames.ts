import type { Quad } from '@/lib/space/homography';

/**
 * Calibration config for artwork frames painted into the ambient gallery video.
 *
 * The camera is locked off, so each blank frame occupies fixed pixels every
 * loop. Corners are stored as PERCENTAGES of the video's reference resolution so
 * they survive any on-screen scaling (the stage is object-fit: cover).
 *
 * Order per frame: top-left, top-right, bottom-right, bottom-left.
 *
 * These values are PLACEHOLDERS. Open the hero with `?calibrate=1`, drag each
 * frame's corners onto the real blank frames, copy the emitted JSON back here.
 */
export const HERO_REF = { width: 1280, height: 720 } as const;

export type FramePct = {
  id: string;
  /** [ [xTL,yTL], [xTR,yTR], [xBR,yBR], [xBL,yBL] ] in % of the reference size. */
  corners: [[number, number], [number, number], [number, number], [number, number]];
};

/**
 * Measured against the poster frame (1280×720): the grey canvas inside each
 * existing wood frame + mat, so an overlaid artwork reads as hung in the room's
 * own frame. Two on the left (angled) wall, two on the back wall, two on the
 * right (angled) wall — perspective baked into the corners. Fine-tune with
 * `?calibrate=1`.
 */
export const HERO_FRAMES: FramePct[] = [
  // Left wall (recedes right → right edge shorter).
  { id: 'L1', corners: [[5.05, 33.77], [12.04, 36.85], [12.14, 62.38], [5.16, 64.44]] },
  { id: 'L2', corners: [[17.39, 39.32], [21.31, 40.33], [21.05, 59.02], [17.19, 60.96]] },
  // Back wall (straight-on).
  { id: 'B3', corners: [[38.56, 41.83], [46.31, 42.31], [46.25, 58.53], [39.03, 58.17]] },
  { id: 'B4', corners: [[53.79, 41.86], [61.2, 42.4], [61.3, 58.53], [53.79, 58.17]] },
  // Right wall (recedes left → left edge shorter).
  { id: 'R5', corners: [[78.62, 40.54], [82.55, 39.07], [82.7, 64.4], [78.1, 62.0]] },
  // R6: top corners from calibration; bottom pulled back onto the frame (the
  // calibrated bottom-left had sagged below it).
  { id: 'R6', corners: [[88.27, 36.66], [94.7, 34.32], [94.8, 61.4], [88.2, 63.6]] },
];

/** Frame corners as reference-pixel Quad (order TL,TR,BR,BL). */
export function frameToRefQuad(frame: FramePct): Quad {
  return frame.corners.map(([xp, yp]) => ({
    x: (xp / 100) * HERO_REF.width,
    y: (yp / 100) * HERO_REF.height,
  })) as Quad;
}
