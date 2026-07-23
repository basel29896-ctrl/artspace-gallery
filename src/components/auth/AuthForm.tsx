'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, requestPasswordReset, type AuthState } from '@/app/auth/actions';

const EMPTY: AuthState = { error: null, notice: null };

// Self-serve signup is intentionally removed: there is no online subscription
// payment in Jordan / MENA yet, so accounts are created by hand after the
// operator arranges payment. New users go through /request-access instead.
type Mode = 'signin' | 'forgot';

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [signInState, signInAction] = useFormState(signIn, EMPTY);
  const [forgotState, forgotAction] = useFormState(requestPasswordReset, EMPTY);

  const state = mode === 'signin' ? signInState : forgotState;
  const formAction = mode === 'signin' ? signInAction : forgotAction;

  return (
    <div>
      <h1 className="font-serif text-3xl leading-tight tracking-tight text-stone-900">
        {mode === 'signin' ? 'Sign in to continue' : 'Reset your password'}
      </h1>
      <p className="mb-8 mt-2 text-sm text-stone-600">
        {mode === 'signin'
          ? 'Sign in to your ArtSpace studio.'
          : 'Enter your email and we will send you a reset link.'}
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <Field name="email" label="Email" type="email" autoComplete="email" required />

        {mode === 'signin' ? (
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
          />
        ) : null}

        {mode === 'signin' ? (
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800"
          >
            Forgot password?
          </button>
        ) : null}

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

        <SubmitButton label={mode === 'signin' ? 'Sign in' : 'Send reset link'} />
      </form>

      {mode === 'forgot' ? (
        <button
          type="button"
          onClick={() => setMode('signin')}
          className="mt-4 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800"
        >
          Back to sign in
        </button>
      ) : (
        <p className="mt-8 border-t border-stone-200 pt-6 text-sm text-stone-600">
          Don&apos;t have an account yet?{' '}
          <Link href="/request-access" className="text-stone-900 underline underline-offset-2">
            Request access
          </Link>{' '}
          — we set accounts up personally.
        </p>
      )}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50
                 transition hover:bg-stone-700 disabled:opacity-60"
    >
      {pending ? 'Working…' : label}
    </button>
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
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                   focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}
