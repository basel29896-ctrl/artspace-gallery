'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/demo-store/auth';
import { listLikedIds } from '@/lib/demo-store/likes';
import { FIXTURE_ARTWORKS } from '@/lib/artworks/fixtures';
import { BASE_PATH } from '@/lib/demo';
import type { DemoUser } from '@/lib/demo-store/store';

/** Collector home: the works this visitor has saved (liked), with quick links to
 *  revisit each piece or preview it in their space. Collectors don't upload. */
export function CollectorView({ user }: { user: DemoUser }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(listLikedIds(user.id));
    sync();
    window.addEventListener('artspace-demo-change', sync);
    return () => window.removeEventListener('artspace-demo-change', sync);
  }, [user.id]);

  const saved = FIXTURE_ARTWORKS.filter((a) => ids.includes(a.id));

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Collector · demo</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900">{user.name}</h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
        >
          Sign out
        </button>
      </header>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl text-stone-900">Saved work · {saved.length}</h2>
          <Link href="/" className="text-sm text-stone-600 underline underline-offset-4 hover:text-stone-900">
            Browse the gallery
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="mt-6 rounded-sm border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
            <p className="text-sm text-stone-600">
              You haven&apos;t saved anything yet. Tap the heart on any work in the gallery to keep it here,
              then preview it on your own wall.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-sm bg-stone-900 px-5 py-2.5 text-sm text-stone-50 hover:bg-stone-700"
            >
              Explore work
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {saved.map((a) => (
              <figure key={a.id} className="group">
                <div className="relative overflow-hidden border border-stone-200 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- fixture asset under basePath */}
                  <img src={a.displayUrl} alt={a.title} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <Link
                      href={`${BASE_PATH}/artwork/${a.id}`}
                      className="rounded-sm bg-white/90 px-2 py-1 text-[11px] font-medium text-stone-900"
                    >
                      Details
                    </Link>
                    <Link
                      href={`${BASE_PATH}/space/${a.id}`}
                      className="rounded-sm bg-white/90 px-2 py-1 text-[11px] font-medium text-stone-900"
                    >
                      In your space
                    </Link>
                  </div>
                </div>
                <figcaption className="mt-2">
                  <p className="truncate text-sm text-stone-800">{a.title}</p>
                  <p className="text-xs text-stone-500">{a.artist.name}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
