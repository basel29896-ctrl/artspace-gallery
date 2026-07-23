'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updatePassword, type AuthState } from '@/app/auth/actions';

const EMPTY: AuthState = { error: null, notice: null };

export function ResetPasswordForm() {
  const [state, action] = useFormState(updatePassword, EMPTY);

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm text-stone-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
        />
        <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Set new password'}
    </button>
  );
}
