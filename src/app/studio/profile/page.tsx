'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { readDb } from '@/lib/demo-store/store';
import type { DemoArtwork, DemoUser } from '@/lib/demo-store/store';
import { BASE_PATH } from '@/lib/demo';

/**
 * Public-style artist profile for a demo account: their info and a grid of their
 * work. Each piece links to the artwork view, where the standard flow (view in
 * space, like, share) lives. `?id=` selects a user; defaults to the session.
 */
export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-6 py-16" />}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const params = useSearchParams();
  const [state, setState] = useState<{ user: DemoUser; works: DemoArtwork[] } | null | 'none'>(null);

  useEffect(() => {
    const db = readDb();
    const id = params.get('id') ?? db.sessionUserId;
    const user = db.users.find((u) => u.id === id) ?? null;
    if (!user) {
      setState('none');
      return;
    }
    const works = db.artworks
      .filter((a) => a.ownerId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    setState({ user, works });
  }, [params]);

  if (state === null) return <main className="mx-auto max-w-6xl px-6 py-16" />;

  if (state === 'none') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-stone-900">Profile not found</h1>
        <Link
          href="/studio"
          className="mt-6 inline-block rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
        >
          Back to account
        </Link>
      </main>
    );
  }

  const { user, works } = state;
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="border-b border-stone-200 pb-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
            <img
              src={user.avatarUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-1 ring-stone-900/10"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-stone-200 font-serif text-3xl text-stone-500"
            >
              {initial}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
              {user.name}
            </h1>
            <p className="mt-1 text-sm capitalize text-stone-500">
              {user.role === 'visitor' ? 'collector' : user.role}
            </p>
            {user.bio ? (
              <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-stone-700">{user.bio}</p>
            ) : null}

            {user.website || user.instagram ? (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {user.website ? (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-stone-600 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
                  >
                    Website
                  </a>
                ) : null}
                {user.instagram ? (
                  <a
                    href={`https://instagram.com/${user.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-stone-600 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900"
                  >
                    @{user.instagram}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <Link
            href="/studio"
            className="shrink-0 rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-800"
          >
            Edit
          </Link>
        </div>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-stone-500">
          {works.length} {works.length === 1 ? 'work' : 'works'}
        </p>
      </header>

      <section className="pt-12">
        {works.length === 0 ? (
          <p className="text-sm text-stone-500">No work published yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {works.map((w) => (
              <Link key={w.id} href={`${BASE_PATH}/studio/art?id=${w.id}`} className="group block">
                <div className="overflow-hidden border border-stone-200 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL from localStorage */}
                  <img
                    src={w.imageUrl}
                    alt={w.title}
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-2 truncate text-sm text-stone-800">{w.title}</p>
                <p className="text-xs text-stone-500">
                  {w.widthCm && w.heightCm ? `${w.widthCm} × ${w.heightCm} cm` : w.medium || ''}
                  {w.priceRange ? ` · ${w.priceRange}` : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
