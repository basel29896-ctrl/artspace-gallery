import Link from 'next/link';
import type { GalleryArtwork } from '@/lib/artworks/queries';
import { ProtectedCanvas } from './ProtectedCanvas';

/**
 * CSS multi-column masonry. No JS measuring pass, no layout shift, and it
 * reflows for free — a JS masonry library would be a bundle cost for nothing here.
 * Trade-off: reading order runs down each column, not across. Acceptable for a
 * gallery hang where order is not meaningful.
 */
export function MasonryGrid({ artworks }: { artworks: GalleryArtwork[] }) {
  if (artworks.length === 0) {
    return (
      <p className="py-24 text-center text-stone-500">
        This artist has not published any work yet.
      </p>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
      {artworks.map((artwork) => (
        <figure key={artwork.id} className="break-inside-avoid">
          <Link href={`/artwork/${artwork.id}`} className="group block">
            <div className="overflow-hidden bg-stone-200 ring-1 ring-stone-900/5 transition group-hover:ring-stone-900/20">
              <ProtectedCanvas src={artwork.displayUrl} alt={artwork.title} className="w-full" />
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3">
              <span className="font-serif text-lg leading-tight text-stone-900">
                {artwork.title}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-stone-500">
                {artwork.likes_count} ♥
              </span>
            </figcaption>
            {artwork.medium || artwork.year ? (
              <p className="mt-0.5 text-xs text-stone-500">
                {[artwork.medium, artwork.year].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </Link>
        </figure>
      ))}
    </div>
  );
}
