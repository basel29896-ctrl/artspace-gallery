'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { GalleryArtwork } from '@/lib/artworks/queries';

type Props = { artwork: GalleryArtwork | null; onClose: () => void };

/**
 * Centred zoom of a clicked overlay artwork, dimming the video behind it.
 * Purpose-built for the hero (the 3D room uses its own bottom-sheet panel).
 */
export function HeroArtworkDetail({ artwork, onClose }: Props) {
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-detail-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm animate-[fade-in_240ms_ease-out]"
      />

      <div className="relative z-10 flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-[#faf7f2] shadow-2xl animate-[zoom-in_280ms_cubic-bezier(0.16,1,0.3,1)] sm:flex-row">
        <div className="flex items-center justify-center bg-stone-900/90 sm:w-2/3">
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox, no optimiser */}
          <img
            src={artwork.displayUrl}
            alt={artwork.title}
            className="max-h-[45vh] w-full object-contain sm:max-h-[80vh]"
            draggable={false}
          />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
          <div>
            <h2 id="hero-detail-title" className="font-serif text-2xl leading-tight text-stone-900">
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
            <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-stone-700">
              {artwork.description}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
            <span className="text-sm tabular-nums text-stone-500">
              {artwork.likes_count.toLocaleString()} {artwork.likes_count === 1 ? 'like' : 'likes'}
            </span>
            <Link
              href={`/artwork/${artwork.id}`}
              className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
            >
              View Artwork
            </Link>
          </div>
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close artwork details"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 px-2 py-1 text-xl leading-none text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
