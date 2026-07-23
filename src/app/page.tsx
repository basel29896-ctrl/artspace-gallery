import { getTopArtworks } from '@/lib/artworks/queries';
import { GalleryRoom } from '@/components/gallery/GalleryRoom';

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
      <GalleryRoom artworks={artworks} />
    </main>
  );
}
