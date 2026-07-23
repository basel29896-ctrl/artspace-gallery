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
  { id: 'L1', corners: [[4.0, 32.0], [13.4, 36.2], [13.6, 63.5], [3.9, 67.6]] },
  { id: 'L2', corners: [[16.4, 37.0], [22.2, 39.4], [22.2, 62.0], [16.2, 64.4]] },
  // Back wall (straight-on).
  { id: 'B3', corners: [[39.5, 42.2], [47.3, 42.4], [47.3, 60.2], [39.5, 60.4]] },
  { id: 'B4', corners: [[54.0, 42.6], [61.2, 42.4], [61.2, 60.2], [54.0, 60.4]] },
  // Right wall (recedes left → left edge shorter).
  { id: 'R5', corners: [[78.1, 39.8], [82.6, 37.4], [82.7, 64.4], [78.1, 62.0]] },
  { id: 'R6', corners: [[86.6, 36.2], [95.9, 32.0], [96.1, 63.5], [86.6, 67.8]] },
];

/** Frame corners as reference-pixel Quad (order TL,TR,BR,BL). */
export function frameToRefQuad(frame: FramePct): Quad {
  return frame.corners.map(([xp, yp]) => ({
    x: (xp / 100) * HERO_REF.width,
    y: (yp / 100) * HERO_REF.height,
  })) as Quad;
}
