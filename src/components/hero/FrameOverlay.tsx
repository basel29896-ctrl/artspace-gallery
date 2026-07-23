'use client';

import type { GalleryArtwork } from '@/lib/artworks/queries';
import type { Quad } from '@/lib/space/homography';
import { matrix3dForQuad, quadBounds } from '@/lib/hero/matrix3d';

type Props = {
  artwork: GalleryArtwork;
  /** Frame corners in reference pixels (TL,TR,BR,BL). */
  quad: Quad;
  onSelect: (id: string) => void;
};

/**
 * One artwork perspective-mapped onto a blank frame in the video. The source box
 * is the frame's bounding size (keeps the image's proportions close), warped by
 * matrix3d. A warmth/brightness filter matches the video's ambient light and an
 * inset shadow seats it in the frame.
 */
export function FrameOverlay({ artwork, quad, onSelect }: Props) {
  const { width, height } = quadBounds(quad);
  const transform = matrix3dForQuad(width, height, quad);
  if (!transform || width <= 0 || height <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => onSelect(artwork.id)}
      aria-label={`View ${artwork.title}`}
      className="group absolute left-0 top-0 block cursor-pointer p-0"
      style={{ width, height, transform, transformOrigin: '0 0' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- warped overlay, optimiser N/A */}
      <img
        src={artwork.displayUrl}
        alt={artwork.title}
        draggable={false}
        className="h-full w-full object-fill"
        style={{ filter: 'brightness(0.95) saturate(0.96) sepia(0.06)' }}
      />
      {/* Inner shadow + a faint highlight on hover so it reads as interactive. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[box-shadow] duration-300 group-hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)]"
        style={{ boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.45), inset 0 0 3px rgba(0,0,0,0.3)' }}
      />
    </button>
  );
}
