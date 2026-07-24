'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { readDb } from '@/lib/demo-store/store';
import type { DemoArtwork, DemoUser } from '@/lib/demo-store/store';
import { BASE_PATH } from '@/lib/demo';
import { LikeButton } from '@/components/artwork/LikeButton';
import { ShareButton } from '@/components/ui/ShareButton';
import { GatedSpaceLink } from '@/components/auth-gate/GatedSpaceLink';

/**
 * Artwork view for a demo (localStorage) piece. Mirrors the public artwork page
 * so uploaded work runs the same flow: like, share, and view in your space.
 */
export default function StudioArtPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f2efe9]" />}>
      <ArtInner />
    </Suspense>
  );
}

function ArtInner() {
  const params = useSearchParams();
  const id = params.get('id');
  const [state, setState] = useState<{ art: DemoArtwork; owner: DemoUser | null } | null | 'none'>(null);

  useEffect(() => {
    const db = readDb();
    const art = db.artworks.find((a) => a.id === id) ?? null;
    if (!art) {
      setState('none');
      return;
    }
    setState({ art, owner: db.users.find((u) => u.id === art.ownerId) ?? null });
  }, [id]);

  if (state === null) return <main className="min-h-screen bg-[#f2efe9]" />;

  if (state === 'none') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-stone-900">Work not found</h1>
        <Link
          href="/studio"
          className="mt-6 inline-block rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
        >
          Back to account
        </Link>
      </main>
    );
  }

  const { art, owner } = state;
  const artistName = owner?.name ?? 'Artist';
  const details = [
    ['Medium', art.medium],
    ['Dimensions', art.widthCm && art.heightCm ? `${art.widthCm} × ${art.heightCm} cm` : ''],
    ['Year', art.year?.toString() ?? ''],
    ['Price', art.priceRange ?? ''],
  ].filter((e): e is [string, string] => Boolean(e[1]));

  return (
    <main className="min-h-screen bg-[#f2efe9]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="flex items-start justify-center">
          <div className="w-full max-w-3xl bg-white p-3 shadow-[0_2px_40px_rgba(40,30,20,0.12)] sm:p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from localStorage */}
            <img src={art.imageUrl} alt={art.title} className="w-full" />
          </div>
        </div>

        <aside className="lg:sticky lg:top-12 lg:self-start">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {art.title}
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            {owner ? (
              <Link
                href={`${BASE_PATH}/studio/profile?id=${owner.id}`}
                className="underline decoration-stone-400 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
              >
                {artistName}
              </Link>
            ) : (
              artistName
            )}
          </p>

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

          {art.sizeVariants.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Available sizes</p>
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {art.sizeVariants.map((v, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span>{v.widthCm} × {v.heightCm} cm</span>
                    {v.priceRange ? <span className="text-stone-500">{v.priceRange}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <LikeButton artworkId={art.id} initialCount={0} />
            <ShareButton title={`${art.title} by ${artistName}`} />
            <GatedSpaceLink
              href={`${BASE_PATH}/studio/space?id=${art.id}`}
              className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition
                         hover:border-stone-800 hover:text-stone-950
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-stone-800"
            >
              View in Your Space
            </GatedSpaceLink>
          </div>
        </aside>
      </div>
    </main>
  );
}
