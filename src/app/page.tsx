import { getTopArtworks } from '@/lib/artworks/queries';
import { GalleryRoom } from '@/components/gallery/GalleryRoom';
import { VideoHero } from '@/components/hero/VideoHero';

// The hang changes as likes change; revalidate rather than rebuild.
export const revalidate = 300;

export const metadata = {
  title: 'ArtSpace Gallery',
  description: 'A room of the most-loved work on ArtSpace.',
};

export default async function HomePage() {
  const artworks = await getTopArtworks(10);

  return (
    <main>
      <h1 className="sr-only">ArtSpace Gallery — featured works</h1>
      {/* Section 0: ambient video gallery. Section 1: the interactive 3D room,
          wrapped so its opaque scene paints over the hero as it scrolls in. */}
      <VideoHero artworks={artworks} />
      <div className="relative z-10">
        <GalleryRoom artworks={artworks} />
      </div>
    </main>
  );
}
