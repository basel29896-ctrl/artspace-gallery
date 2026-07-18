'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ArtworkStats } from '@/lib/database.types';

type Editable = { title: string; medium: string; dimensions: string; price_range: string };

export type ManagedArtwork = ArtworkStats & Editable & { display_url: string };

export function ArtworkManager({ artworks }: { artworks: ManagedArtwork[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(artwork: ManagedArtwork) {
    // Destructive and irreversible — the original file is removed from storage too.
    const confirmed = window.confirm(
      `Delete "${artwork.title}"? This permanently removes the original file and cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(artwork.artwork_id);
    setError(null);

    const res = await fetch(`/api/artworks/${artwork.artwork_id}`, { method: 'DELETE' });
    setBusyId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not delete artwork.');
      return;
    }
    router.refresh();
  }

  async function handleSave(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusyId(id);
    setError(null);

    const res = await fetch(`/api/artworks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        medium: form.get('medium') || null,
        dimensions: form.get('dimensions') || null,
        price_range: form.get('price_range') || null,
      }),
    });

    setBusyId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not save changes.');
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  if (artworks.length === 0) {
    return <p className="py-10 text-sm text-stone-500">Nothing published yet.</p>;
  }

  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-stone-200">
        {artworks.map((artwork) => (
          <li key={artwork.artwork_id} className="py-5">
            {editingId === artwork.artwork_id ? (
              <form onSubmit={(e) => handleSave(artwork.artwork_id, e)} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <EditField name="title" label="Title" defaultValue={artwork.title} required />
                  <EditField name="medium" label="Medium" defaultValue={artwork.medium} />
                  <EditField name="dimensions" label="Dimensions" defaultValue={artwork.dimensions} />
                  <EditField name="price_range" label="Price range" defaultValue={artwork.price_range} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busyId === artwork.artwork_id}
                    className="rounded-sm bg-stone-900 px-4 py-2 text-sm text-stone-50 hover:bg-stone-700 disabled:opacity-60"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/artwork/${artwork.artwork_id}`}
                    className="font-serif text-lg text-stone-900 underline decoration-transparent underline-offset-4 transition hover:decoration-stone-400"
                  >
                    {artwork.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-xs tabular-nums text-stone-500">
                    <span>{artwork.views_count.toLocaleString()} views</span>
                    <span>{artwork.likes_count.toLocaleString()} likes</span>
                    <span>{Number(artwork.inquiries_count).toLocaleString()} inquiries</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(artwork.artwork_id)}
                    className="rounded-sm border border-stone-300 px-3 py-1.5 text-xs text-stone-700 hover:border-stone-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(artwork)}
                    disabled={busyId === artwork.artwork_id}
                    className="rounded-sm border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:border-red-500 disabled:opacity-60"
                  >
                    {busyId === artwork.artwork_id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function EditField({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={`${name}-edit`} className="block text-xs text-stone-600">
        {label}
      </label>
      <input
        id={`${name}-edit`}
        name={name}
        {...rest}
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}
