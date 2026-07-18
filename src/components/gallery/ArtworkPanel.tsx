'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { GalleryArtwork } from '@/lib/artworks/queries';

type Props = { artwork: GalleryArtwork | null; onClose: () => void };

/**
 * Rendered as DOM rather than <Html> inside the canvas: real focus management,
 * real screen readers, and text that stays crisp at any camera distance.
 */
export function ArtworkPanel({ artwork, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!artwork) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [artwork, onClose]);

  if (!artwork) return null;

  const artistName = artwork.artist.name ?? artwork.artist.username ?? 'Unknown artist';

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="artwork-panel-title"
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-xl
                 animate-[panel-in_320ms_cubic-bezier(0.16,1,0.3,1)] border-t border-stone-300/70
                 bg-[#faf7f2]/95 p-6 shadow-[0_-8px_40px_rgba(40,30,20,0.18)] backdrop-blur-md
                 sm:bottom-8 sm:rounded-lg sm:border sm:p-8"
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="Close artwork details"
        className="absolute right-4 top-4 rounded-full px-2 py-1 text-xl leading-none text-stone-500
                   transition hover:bg-stone-200/70 hover:text-stone-900
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                   focus-visible:outline-stone-800"
      >
        &times;
      </button>

      <h2
        id="artwork-panel-title"
        className="font-serif text-2xl leading-tight tracking-tight text-stone-900 sm:text-3xl"
      >
        {artwork.title}
      </h2>

      <p className="mt-1.5 text-sm text-stone-600">
        {artwork.artist.username ? (
          <Link
            href={`/artist/${artwork.artist.username}`}
            className="underline decoration-stone-400 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
          >
            {artistName}
          </Link>
        ) : (
          artistName
        )}
        {artwork.medium ? <span className="text-stone-400"> · {artwork.medium}</span> : null}
        {artwork.year ? <span className="text-stone-400"> · {artwork.year}</span> : null}
      </p>

      {artwork.description ? (
        <p className="mt-4 max-h-32 overflow-y-auto text-sm leading-relaxed text-stone-700">
          {artwork.description}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="text-sm tabular-nums text-stone-500">
          {artwork.likes_count.toLocaleString()}{' '}
          {artwork.likes_count === 1 ? 'like' : 'likes'}
        </span>

        <Link
          href={`/artwork/${artwork.id}`}
          className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium tracking-wide text-stone-50
                     transition hover:bg-stone-700
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-stone-800"
        >
          View Artwork
        </Link>
      </div>
    </aside>
  );
}
