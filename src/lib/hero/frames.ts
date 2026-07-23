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

/** Rough starting guesses — five frames across the back/side walls. Recalibrate. */
export const HERO_FRAMES: FramePct[] = [
  { id: 'f1', corners: [[8, 30], [21, 31], [21, 60], [8, 61]] },
  { id: 'f2', corners: [[29, 32], [42, 33], [42, 58], [29, 59]] },
  { id: 'f3', corners: [[46, 33], [58, 33], [58, 57], [46, 57]] },
  { id: 'f4', corners: [[62, 33], [74, 32], [74, 58], [62, 59]] },
  { id: 'f5', corners: [[80, 31], [92, 30], [92, 60], [80, 61]] },
];

/** Frame corners as reference-pixel Quad (order TL,TR,BR,BL). */
export function frameToRefQuad(frame: FramePct): Quad {
  return frame.corners.map(([xp, yp]) => ({
    x: (xp / 100) * HERO_REF.width,
    y: (yp / 100) * HERO_REF.height,
  })) as Quad;
}
