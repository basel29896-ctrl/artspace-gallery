import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSpaceArtworks } from '@/lib/artworks/queries';
import { SpaceWorkspace } from '@/components/space/SpaceWorkspace';

export const revalidate = 120;

export async function generateStaticParams() {
  const { FIXTURE_ARTWORKS } = await import('@/lib/artworks/fixtures');
  return FIXTURE_ARTWORKS.map((a) => ({ artworkId: a.id }));
}

type Params = { params: { artworkId: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const artworks = await getSpaceArtworks(params.artworkId);
  const title = artworks[0]?.title;
  return {
    title: title ? `${title} in your space — ArtSpace` : 'View in your space',
    // A preview tool has nothing worth indexing and the URL is per-artwork.
    robots: { index: false },
  };
}

export default async function SpacePage({ params }: Params) {
  const artworks = await getSpaceArtworks(params.artworkId);
  if (artworks.length === 0) notFound();

  const primary = artworks[0];

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">View in your space</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight text-stone-900 sm:text-4xl">
            {primary.title}
          </h1>
          {primary.artistName ? (
            <p className="mt-1 text-sm text-stone-600">{primary.artistName}</p>
          ) : null}
        </div>

        <Link
          href={`/artwork/${primary.id}`}
          className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-800"
        >
          Back to artwork
        </Link>
      </header>

      <SpaceWorkspace artworks={artworks} initialArtworkId={primary.id} />
    </main>
  );
}
