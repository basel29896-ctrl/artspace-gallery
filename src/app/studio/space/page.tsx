'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { readDb } from '@/lib/demo-store/store';
import type { DemoArtwork } from '@/lib/demo-store/store';
import type { SpaceArtwork } from '@/lib/space/types';
import { SpaceWorkspace } from '@/components/space/SpaceWorkspace';

/**
 * "View in your space" for a demo (localStorage) artwork.
 *
 * A query param (`?id=`) rather than a dynamic route segment: demo artworks are
 * created at runtime, so there are no build-time params for a static export to
 * pre-render. Reads the piece and its owner's siblings from the local store.
 */
function toSpace(a: DemoArtwork, artistName: string | null): SpaceArtwork {
  return {
    id: a.id,
    title: a.title,
    displayUrl: a.imageUrl,
    artistName,
    widthCm: a.widthCm,
    heightCm: a.heightCm,
    sizeVariants: a.sizeVariants,
  };
}

export default function StudioSpacePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-6 py-12" />}>
      <StudioSpaceInner />
    </Suspense>
  );
}

function StudioSpaceInner() {
  const params = useSearchParams();
  const id = params.get('id');
  const [artworks, setArtworks] = useState<SpaceArtwork[] | null>(null);

  useEffect(() => {
    if (!id) {
      setArtworks([]);
      return;
    }
    const db = readDb();
    const current = db.artworks.find((a) => a.id === id);
    if (!current) {
      setArtworks([]);
      return;
    }
    const owner = db.users.find((u) => u.id === current.ownerId) ?? null;
    const siblings = db.artworks
      .filter((a) => a.ownerId === current.ownerId && a.id !== current.id)
      .slice(0, 4);
    setArtworks([current, ...siblings].map((a) => toSpace(a, owner?.name ?? null)));
  }, [id]);

  if (artworks === null) return <main className="mx-auto max-w-7xl px-6 py-12" />;

  if (artworks.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-stone-900">Work not found</h1>
        <p className="mt-3 text-sm text-stone-600">
          This piece isn&apos;t in your browser&apos;s demo storage.
        </p>
        <Link
          href="/studio"
          className="mt-6 inline-block rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
        >
          Back to studio
        </Link>
      </main>
    );
  }

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
          href="/studio"
          className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-800"
        >
          Back to studio
        </Link>
      </header>

      <SpaceWorkspace artworks={artworks} initialArtworkId={primary.id} />
    </main>
  );
}
