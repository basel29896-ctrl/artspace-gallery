import Link from 'next/link';
import { getArtists } from '@/lib/artworks/queries';
import { ProtectedCanvas } from '@/components/artwork/ProtectedCanvas';

export const revalidate = 300;

export const metadata = {
  title: 'Artists — ArtSpace',
  description: 'Painters, printmakers, and photographers showing work on ArtSpace.',
};

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-14">
      <header className="border-b border-stone-200 pb-10">
        <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Directory</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-900 sm:text-5xl">
          Artists
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-stone-600">
          Every artist showing work on ArtSpace. Each keeps their own room.
        </p>
      </header>

      {artists.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-stone-500">No artists have published work yet.</p>
          <Link
            href="/request-access"
            className="mt-6 inline-block rounded-sm bg-stone-900 px-6 py-2.5 text-sm text-stone-50 hover:bg-stone-700"
          >
            Be the first
          </Link>
        </div>
      ) : (
        <ul className="grid gap-x-8 gap-y-14 pt-14 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <li key={artist.id}>
              <Link href={`/artist/${artist.username}`} className="group block">
                <div className="overflow-hidden bg-stone-200 ring-1 ring-stone-900/5 transition group-hover:ring-stone-900/20">
                  {artist.coverUrl ? (
                    <ProtectedCanvas
                      src={artist.coverUrl}
                      alt={`Work by ${artist.name ?? artist.username}`}
                      className="w-full"
                    />
                  ) : (
                    <div className="aspect-[4/3]" />
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl leading-tight text-stone-900">
                    {artist.name ?? artist.username}
                  </h2>
                  <span className="shrink-0 text-xs tabular-nums text-stone-500">
                    {artist.artworkCount} {artist.artworkCount === 1 ? 'work' : 'works'}
                  </span>
                </div>

                {artist.bio ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">
                    {artist.bio}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
