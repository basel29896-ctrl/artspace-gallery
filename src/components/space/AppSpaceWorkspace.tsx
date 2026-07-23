'use client';

import type { SpaceArtwork } from '@/lib/space/types';
import { ContactArtistDialog } from '@/components/artwork/ContactArtistDialog';
import { SpaceWorkspace } from './SpaceWorkspace';

/**
 * App binding for the Space editor: wires the framework-agnostic core to this
 * project's Supabase-backed inquiry dialog. The embeddable SDK uses `SpaceEmbed`
 * instead, so the core (`SpaceWorkspace` and below) never imports a backend.
 *
 * A client wrapper is required because `renderInquiry` is a function, which a
 * Server Component page cannot pass across the boundary.
 */
export function AppSpaceWorkspace({
  artworks,
  initialArtworkId,
}: {
  artworks: SpaceArtwork[];
  initialArtworkId: string;
}) {
  return (
    <SpaceWorkspace
      artworks={artworks}
      initialArtworkId={initialArtworkId}
      renderInquiry={(artwork) => (
        <ContactArtistDialog artworkId={artwork.id} artistName={artwork.artistName ?? 'the artist'} />
      )}
    />
  );
}
