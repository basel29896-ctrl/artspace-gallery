import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArtistByUsername } from '@/lib/artworks/queries';
import { MasonryGrid } from '@/components/artwork/MasonryGrid';
import { ShareButton } from '@/components/ui/ShareButton';

export const revalidate = 120;

export async function generateStaticParams() {
  const { fixtureArtistList } = await import('@/lib/artworks/fixtures');
  return fixtureArtistList().map((a) => ({ username: a.username as string }));
}

type Params = { params: { username: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const result = await getArtistByUsername(params.username);
  if (!result) return { title: 'Artist not found' };

  const displayName = result.artist.name ?? result.artist.username ?? 'Artist';
  return {
    title: `${displayName} — ArtSpace`,
    description: result.artist.bio ?? `Work by ${displayName} on ArtSpace.`,
  };
}

export default async function ArtistPage({ params }: Params) {
  const result = await getArtistByUsername(params.username);
  if (!result) notFound();

  const { artist, artworks } = result;
  const displayName = artist.name ?? artist.username ?? 'Artist';

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="border-b border-stone-200 pb-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {artist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar host is user-supplied (Google, etc.) and not in remotePatterns
            <img
              src={artist.avatar_url}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-1 ring-stone-900/10"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-stone-200 font-serif text-3xl text-stone-500"
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
              {displayName}
            </h1>
            {artist.username ? (
              <p className="mt-1 text-sm text-stone-500">@{artist.username}</p>
            ) : null}
            {artist.bio ? (
              <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-stone-700">
                {artist.bio}
              </p>
            ) : null}

            {artist.website || artist.instagram ? (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {artist.website ? (
                  <a
                    href={artist.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-stone-600 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
                  >
                    Website
                  </a>
                ) : null}
                {artist.instagram ? (
                  <a
                    href={`https://instagram.com/${artist.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-stone-600 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
                  >
                    @{artist.instagram}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="shrink-0">
            <ShareButton title={`${displayName} on ArtSpace`} label="Share profile" />
          </div>
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-stone-500">
          {artworks.length} {artworks.length === 1 ? 'work' : 'works'}
        </p>
      </header>

      <section className="pt-12">
        <MasonryGrid artworks={artworks} />
      </section>
    </main>
  );
}
