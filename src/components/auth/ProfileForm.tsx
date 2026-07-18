'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile, type ProfileState } from '@/app/settings/actions';

const EMPTY: ProfileState = { error: null, notice: null };

type Defaults = { name: string; username: string; bio: string };

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action] = useFormState(updateProfile, EMPTY);

  return (
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
