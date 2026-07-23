'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { isConvexQuad, minEdgeLength, type Quad } from '@/lib/space/homography';
import {
  composeFramedArtwork,
  drawPerspective,
  framedQuad,
  type FrameStyle,
  type MatSettings,
  type RealismSettings,
} from '@/lib/space/renderPerspective';

/** Loads an image and reports it once decoded. */
export function useImage(src: string | null, crossOrigin?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!src) {
      setImage(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;

    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setStatus('ready');
    };
    img.onerror = () => {
      if (!cancelled) setStatus('error');
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, crossOrigin]);

  return { image, status };
}

type Options = {
  artwork: HTMLImageElement | null;
  quad: Quad;
  frame: FrameStyle;
  mat: MatSettings;
  realism: RealismSettings;
  stageWidth: number;
  stageHeight: number;
};

/**
 * Produces a stage-sized canvas holding the warped, framed, shadowed artwork,
 * ready to hand to a Konva.Image.
 *
 * The framed/graded bitmap is memoised separately from the warp: dragging a
 * corner is a frequent, cheap redraw, while re-grading pixels is expensive and
 * only depends on the frame and realism settings.
 */
export function useArtworkComposite({
  artwork,
  quad,
  frame,
  mat,
  realism,
  stageWidth,
  stageHeight,
}: Options) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [version, setVersion] = useState(0);

  const framed = useMemo(() => {
    if (!artwork || typeof document === 'undefined') return null;
    return composeFramedArtwork(artwork, artwork.width, artwork.height, frame, mat, realism);
  }, [artwork, frame, mat, realism]);

  const quadValid = isConvexQuad(quad) && minEdgeLength(quad) > 8;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');

    const canvas = canvasRef.current;
    if (canvas.width !== stageWidth || canvas.height !== stageHeight) {
      canvas.width = Math.max(stageWidth, 1);
      canvas.height = Math.max(stageHeight, 1);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (framed && quadValid && artwork) {
      // The caller's `quad` is the artwork opening (true scale). The frame/mat
      // sit outside it, so warp the framed bitmap into the expanded quad; the
      // opening stays fixed and the border grows outward.
      const outer =
        framedQuad(quad, artwork.width, artwork.height, frame, mat) ?? quad;

      if (realism.shadow) {
        // Shadow is painted as a blurred fill of the (outer) quad itself.
        // Applying ctx.shadow* to the warp would render a shadow per triangle —
        // hundreds of overlapping shadows instead of one.
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.filter = 'blur(14px)';
        ctx.fillStyle = 'rgba(20,15,10,1)';
        ctx.beginPath();
        ctx.moveTo(outer[0].x + 10, outer[0].y + 14);
        for (let i = 1; i < 4; i += 1) ctx.lineTo(outer[i].x + 10, outer[i].y + 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      drawPerspective(ctx, framed, framed.width, framed.height, outer);
    }

    setVersion((v) => v + 1);
  }, [framed, quad, quadValid, realism.shadow, stageWidth, stageHeight, artwork, frame, mat]);

  return { compositeCanvas: canvasRef.current, framed, version, quadValid };
}
