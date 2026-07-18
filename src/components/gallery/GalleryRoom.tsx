'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalleryArtwork } from '@/lib/artworks/queries';
import { detectWebGL, prefersReducedMotion } from '@/lib/gallery/webgl';
import { FallbackGrid } from './FallbackGrid';

// three.js and the whole scene graph stay out of the initial bundle; they are
// fetched only once WebGL support is confirmed.
const RoomScene = dynamic(() => import('./RoomScene'), {
  ssr: false,
  loading: () => <RoomSkeleton />,
});

function RoomSkeleton() {
  return (
    <div
      className="flex h-[100svh] w-full items-center justify-center bg-[#efeae1]"
      role="status"
      aria-live="polite"
    >
      <span className="text-xs uppercase tracking-[0.25em] text-stone-500">
        Preparing the room
      </span>
    </div>
  );
}

type Support = 'pending' | 'webgl' | 'fallback';

export function GalleryRoom({ artworks }: { artworks: GalleryArtwork[] }) {
  const [support, setSupport] = useState<Support>('pending');

  useEffect(() => {
    // Reduced-motion users get the static hang: an orbiting camera is exactly
    // the kind of vestibular trigger the media query exists for.
    const ok = detectWebGL() && !prefersReducedMotion() && artworks.length > 0;
    setSupport(ok ? 'webgl' : 'fallback');
  }, [artworks.length]);

  if (support === 'pending') return <RoomSkeleton />;
  if (support === 'fallback') return <FallbackGrid artworks={artworks} />;

  return <RoomScene artworks={artworks} />;
}
