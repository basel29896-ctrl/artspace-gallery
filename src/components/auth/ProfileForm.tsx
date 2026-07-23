'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile, uploadAvatar, type ProfileState } from '@/app/settings/actions';

const EMPTY: ProfileState = { error: null, notice: null };

type Defaults = {
  name: string;
  username: string;
  bio: string;
  website: string;
  instagram: string;
  avatarUrl: string | null;
};

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action] = useFormState(updateProfile, EMPTY);

  return (
    <>
      <AvatarForm avatarUrl={defaults.avatarUrl} />
      <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm text-stone-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaults.name}
          required
          maxLength={120}
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm text-stone-700">
          Username
        </label>
        <div className="mt-1 flex items-center rounded-sm border border-stone-300 bg-white focus-within:border-stone-800">
          <span className="pl-3 text-sm text-stone-400">artspace.com/artist/</span>
          <input
            id="username"
            name="username"
            defaultValue={defaults.username}
            pattern="[a-z0-9_]{3,30}"
            maxLength={30}
            className="w-full bg-transparent px-1 py-2 text-sm focus:outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Lowercase letters, numbers, and underscores. 3–30 characters.
        </p>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm text-stone-700">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={defaults.bio}
          rows={4}
          maxLength={2000}
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="website" className="block text-sm text-stone-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={defaults.website}
            maxLength={200}
            placeholder="https://your-site.com"
            className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="instagram" className="block text-sm text-stone-700">
            Instagram
          </label>
          <div className="mt-1 flex items-center rounded-sm border border-stone-300 bg-white focus-within:border-stone-800">
            <span className="pl-3 text-sm text-stone-400">@</span>
            <input
              id="instagram"
              name="instagram"
              defaultValue={defaults.instagram}
              maxLength={60}
              placeholder="handle"
              className="w-full bg-transparent px-1 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="text-sm text-emerald-700">
          {state.notice}
        </p>
      ) : null}

        <SaveButton />
      </form>
    </>
  );
}

function AvatarForm({ avatarUrl }: { avatarUrl: string | null }) {
  const [state, action] = useFormState(uploadAvatar, EMPTY);

  return (
    <form action={action} className="mb-6 flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-stone-400">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar, no optimiser
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs">No photo</span>
        )}
      </span>
      <div>
        <label
          htmlFor="avatar"
          className="inline-block cursor-pointer rounded-sm border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:border-stone-800"
        >
          Choose photo
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
        </label>
        {state.error ? (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.notice ? (
          <p role="status" className="mt-1 text-xs text-emerald-700">
            {state.notice}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-sm bg-stone-900 px-6 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save profile'}
    </button>
  );
}
