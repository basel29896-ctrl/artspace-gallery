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
      className="artwork-popup pointer-events-auto absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-4xl
                 animate-[panel-in_320ms_cubic-bezier(0.16,1,0.3,1)] border-t border-stone-300/70
                 bg-[#faf7f2]/95 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]
                 shadow-[0_-8px_40px_rgba(40,30,20,0.18)] backdrop-blur-md
                 sm:rounded-lg sm:border sm:px-8 sm:py-5 sm:pb-5"
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

      {/* Horizontal on wide screens so the popup stays short; stacked on mobile. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 sm:pr-6">
        <div className="min-w-0 sm:w-[15rem] sm:shrink-0">
          <h2
            id="artwork-panel-title"
            className="font-serif text-2xl leading-tight tracking-tight text-stone-900"
          >
            {artwork.title}
          </h2>

          <p className="mt-1 text-sm text-stone-600">
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
        </div>

        {artwork.description ? (
          <p className="max-h-24 flex-1 overflow-y-auto text-sm leading-relaxed text-stone-700">
            {artwork.description}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
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
      </div>
    </aside>
  );
}
