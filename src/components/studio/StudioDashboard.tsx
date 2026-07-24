'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, updateProfile } from '@/lib/demo-store/auth';
import { deleteArtwork, listByOwner, fileToDataUrl } from '@/lib/demo-store/artworks';
import type { DemoArtwork, DemoUser } from '@/lib/demo-store/store';
import { BASE_PATH } from '@/lib/demo';
import { UploadForm } from './UploadForm';

/** The signed-in demo studio: profile (about + links), add-work, and a grid of
 *  the user's own pieces. All reads/writes go through the localStorage store. */
export function StudioDashboard({ user }: { user: DemoUser }) {
  const [works, setWorks] = useState<DemoArtwork[]>([]);

  const refresh = () => setWorks(listByOwner(user.id));
  useEffect(refresh, [user.id]);

  return (
    <div className="space-y-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Your studio · demo</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900">{user.name}</h1>
          <p className="mt-1 text-sm capitalize text-stone-500">
            {user.role} · {user.email}
          </p>
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
        <h2 className="mb-5 font-serif text-2xl text-stone-900">Profile</h2>
        <ProfileEditor user={user} />
      </section>

      <section>
        <h2 className="mb-5 font-serif text-2xl text-stone-900">Add a work</h2>
        <UploadForm ownerId={user.id} onDone={refresh} />
      </section>

      <section>
        <h2 className="mb-5 font-serif text-2xl text-stone-900">
          Your work · {works.length}
        </h2>
        {works.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing yet. Add your first piece above.</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {works.map((w) => (
              <figure key={w.id} className="group">
                <div className="relative overflow-hidden border border-stone-200 bg-stone-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL from localStorage */}
                  <img src={w.imageUrl} alt={w.title} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <Link
                      href={`${BASE_PATH}/studio/space?id=${w.id}`}
                      className="rounded-sm bg-white/90 px-2 py-1 text-[11px] font-medium text-stone-900"
                    >
                      View in a space
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        deleteArtwork(user.id, w.id);
                        refresh();
                      }}
                      className="rounded-sm bg-white/90 px-2 py-1 text-[11px] font-medium text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <figcaption className="mt-2">
                  <p className="truncate text-sm text-stone-800">{w.title}</p>
                  <p className="text-xs text-stone-500">
                    {w.widthCm && w.heightCm ? `${w.widthCm} × ${w.heightCm} cm` : w.medium || '—'}
                    {w.priceRange ? ` · ${w.priceRange}` : ''}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileEditor({ user }: { user: DemoUser }) {
  const [saved, setSaved] = useState(false);

  async function pickAvatar(file: File | null) {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 320);
      updateProfile(user.id, { avatarUrl: url });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore unreadable image */
    }
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    updateProfile(user.id, {
      name: String(d.get('name') ?? user.name),
      bio: String(d.get('bio') ?? ''),
      website: String(d.get('website') ?? ''),
      instagram: String(d.get('instagram') ?? ''),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <div className="flex items-center gap-4">
        <label className="group relative cursor-pointer">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
            <img
              src={user.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-stone-900/10"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-900 font-serif text-xl text-stone-50">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
            Change
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="text-xs text-stone-500">Your photo — appears on your profile and the top-right menu.</p>
      </div>

      <Field name="name" label="Display name" defaultValue={user.name} />
      <div>
        <label htmlFor="bio" className="block text-sm text-stone-700">
          About
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={user.bio}
          placeholder="Where you work, what you make, what drives it."
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="website" label="Website" defaultValue={user.website} placeholder="https://" />
        <Field name="instagram" label="Instagram" defaultValue={user.instagram} placeholder="handle" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
        >
          Save profile
        </button>
        {saved ? <span className="text-sm text-emerald-700">Saved.</span> : null}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-stone-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}
