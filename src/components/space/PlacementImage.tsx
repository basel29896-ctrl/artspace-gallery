'use client';

import { memo, useEffect } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import type { Quad } from '@/lib/space/homography';
import type { FrameStyle, MatSettings, RealismSettings } from '@/lib/space/renderPerspective';
import { useArtworkComposite, useImage } from './useArtworkComposite';

export type PlacementComposite = {
  framed: HTMLCanvasElement;
  imageWidth: number;
  imageHeight: number;
};

type Props = {
  placementId: string;
  displayUrl: string;
  quad: Quad;
  frame: FrameStyle;
  mat: MatSettings;
  realism: RealismSettings;
  stageWidth: number;
  stageHeight: number;
  /** Reports the framed bitmap up so the export can re-render every placement. */
  onComposite: (id: string, composite: PlacementComposite | null) => void;
};

/**
 * One placed artwork, rendered as its own Konva layer.
 *
 * Each instance owns its image load and its `useArtworkComposite` call, so the
 * framed-bitmap memo (frame/mat/image) and the warp (quad) are isolated per
 * placement: dragging one piece re-warps only its own layer and never
 * re-composes the others.
 */
export const PlacementImage = memo(function PlacementImage({
  placementId,
  displayUrl,
  quad,
  frame,
  mat,
  realism,
  stageWidth,
  stageHeight,
  onComposite,
}: Props) {
  // anonymous so the export canvas stays untainted (Supabase sends permissive CORS).
  const { image } = useImage(displayUrl, 'anonymous');

  const { compositeCanvas, framed, version } = useArtworkComposite({
    artwork: image,
    quad,
    frame,
    mat,
    realism,
    stageWidth,
    stageHeight,
  });

  useEffect(() => {
    if (framed && image) {
      onComposite(placementId, {
        framed,
        imageWidth: image.width,
        imageHeight: image.height,
      });
    }
    return () => onComposite(placementId, null);
  }, [placementId, framed, image, onComposite]);

  if (!compositeCanvas) return null;

  return (
    <Layer listening={false}>
      <KonvaImage key={version} image={compositeCanvas} width={stageWidth} height={stageHeight} />
    </Layer>
  );
});
