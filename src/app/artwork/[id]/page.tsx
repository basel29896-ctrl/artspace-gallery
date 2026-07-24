import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArtwork } from '@/lib/artworks/queries';
import { ProtectedCanvas } from '@/components/artwork/ProtectedCanvas';
import { LikeButton } from '@/components/artwork/LikeButton';
import { ContactArtistDialog } from '@/components/artwork/ContactArtistDialog';
import { ViewTracker } from '@/components/artwork/ViewTracker';
import { ShareButton } from '@/components/ui/ShareButton';
import { GatedSpaceLink } from '@/components/auth-gate/GatedSpaceLink';

export const revalidate = 60;

// Required by the static export: there is no server to render unknown ids.
export async function generateStaticParams() {
  const { FIXTURE_ARTWORKS } = await import('@/lib/artworks/fixtures');
  return FIXTURE_ARTWORKS.map((a) => ({ id: a.id }));
}

type Params = { params: { id: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const artwork = await getArtwork(params.id);
  if (!artwork) return { title: 'Artwork not found' };

  const artistName = artwork.artist.name ?? artwork.artist.username ?? 'Unknown artist';
  return {
    title: `${artwork.title} — ${artistName}`,
    description: artwork.description ?? `${artwork.title} by ${artistName} on ArtSpace.`,
    // The watermarked rendition is the only image safe to hand to crawlers.
    openGraph: { images: [artwork.displayUrl] },
  };
}

export default async function ArtworkPage({ params }: Params) {
  const artwork = await getArtwork(params.id);
  if (!artwork) notFound();

  const artistName = artwork.artist.name ?? artwork.artist.username ?? 'Unknown artist';

  const details = [
    ['Medium', artwork.medium],
    ['Dimensions', artwork.dimensions],
    ['Year', artwork.year?.toString()],
    ['Price', artwork.price_range],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <main className="min-h-screen bg-[#f2efe9]">
      <ViewTracker artworkId={artwork.id} />

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="flex items-start justify-center">
          <div className="w-full max-w-3xl bg-white p-3 shadow-[0_2px_40px_rgba(40,30,20,0.12)] sm:p-4">
            <ProtectedCanvas src={artwork.displayUrl} alt={artwork.title} className="w-full" />
          </div>
        </div>

        <aside className="lg:sticky lg:top-12 lg:self-start">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {artwork.title}
          </h1>

          <p className="mt-2 text-sm text-stone-600">
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
          </p>

          {artwork.description ? (
            <p className="mt-6 text-[15px] leading-relaxed text-stone-700">{artwork.description}</p>
          ) : null}

          {details.length > 0 ? (
            <dl className="mt-8 divide-y divide-stone-200 border-y border-stone-200 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="text-right text-stone-800">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="mt-4 text-xs tabular-nums text-stone-500">
            {artwork.views_count.toLocaleString()} views
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LikeButton artworkId={artwork.id} initialCount={artwork.likes_count} />
            <ShareButton title={`${artwork.title} by ${artistName}`} />
            <GatedSpaceLink
              href={`/space/${artwork.id}`}
              className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition
                         hover:border-stone-800 hover:text-stone-950
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-stone-800"
            >
              View in Your Space
            </GatedSpaceLink>
          </div>

          <div className="mt-4">
            <ContactArtistDialog artworkId={artwork.id} artistName={artistName} />
          </div>
        </aside>
      </div>
    </main>
  );
}
