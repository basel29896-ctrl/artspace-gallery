'use client';

import { useEffect } from 'react';

/** Fires once per mount. Dedupe beyond that is the database's job. */
export function ViewTracker({ artworkId }: { artworkId: string }) {
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/artworks/${artworkId}/view`, {
      method: 'POST',
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // A dropped view ping is not worth surfacing to the visitor.
    });

    return () => controller.abort();
  }, [artworkId]);

  return null;
}
