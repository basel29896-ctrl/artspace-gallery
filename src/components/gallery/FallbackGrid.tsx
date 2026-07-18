import Image from 'next/image';
import Link from 'next/link';
import type { GalleryArtwork } from '@/lib/artworks/queries';

/**
 * Served to anyone without WebGL, and to anyone who asks for reduced motion.
 * Not a degraded placeholder — it is the same collection, laid out editorially.
 */
export function FallbackGrid({ artworks }: { artworks: GalleryArtwork[] }) {
  if (artworks.length === 0) {
    return (
      <p className="py-24 text-center text-stone-500">No artworks published yet.</p>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-16 px-6 pb-16 pt-24 sm:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork, i) => (
        <figure
          key={artwork.id}
          // Break the grid rhythm so it reads as a hang, not a product listing.
          className={i % 5 === 0 ? 'sm:col-span-2 lg:col-span-2' : undefined}
        >
          <Link href={`/artwork/${artwork.id}`} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
              <Image
                src={artwork.displayUrl}
                alt={artwork.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-700 group-hover:scale-[1.03]"
                priority={i < 2}
                loading={i < 2 ? 'eager' : 'lazy'}
              />
            </div>
            <figcaption className="mt-4">
              <h2 className="font-serif text-xl text-stone-900">{artwork.title}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {artwork.artist.name ?? artwork.artist.username ?? 'Unknown artist'}
                {artwork.year ? <span className="text-stone-400"> · {artwork.year}</span> : null}
              </p>
            </figcaption>
          </Link>
        </figure>
      ))}
    </div>
  );
}
