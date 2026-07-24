'use client';

import { useEffect, useState } from 'react';
import { signIn, signUp } from '@/lib/demo-store/auth';
import type { DemoRole } from '@/lib/demo-store/store';

/**
 * Centered auth dialog for the demo. Opens when a signed-out visitor tries a
 * gated action (like, view-in-your-space). Defaults to "create account" with a
 * link at the bottom to sign in instead. On success it calls `onAuthed`, which
 * runs the action the visitor originally intended.
 */
export function AuthGateModal({
  intro,
  onAuthed,
  onClose,
}: {
  intro: string;
  onAuthed: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const d = new FormData(e.currentTarget);
    const email = String(d.get('email') ?? '');
    const password = String(d.get('password') ?? '');
    const result =
      mode === 'signup'
        ? signUp({
            name: String(d.get('name') ?? ''),
            email,
            password,
            role: String(d.get('role') ?? 'visitor') as DemoRole,
          })
        : signIn(email, password);

    if (result.ok) onAuthed();
    else setError(result.error);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signup' ? 'Create an account' : 'Sign in'}
        className="w-full max-w-sm rounded-md bg-[#faf7f2] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl leading-tight tracking-tight text-stone-900">
            {mode === 'signup' ? 'Create an account' : 'Welcome back'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-sm p-1 text-stone-400 hover:text-stone-800"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-600">{intro}</p>

        <form onSubmit={handle} className="mt-6 space-y-3">
          {mode === 'signup' ? <Field name="name" label="Name" autoComplete="name" required /> : null}
          <Field name="email" label="Email" type="email" autoComplete="email" required />
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
          {mode === 'signup' ? <input type="hidden" name="role" value="visitor" /> : null}

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
          >
            {mode === 'signup' ? 'Create account & continue' : 'Sign in & continue'}
          </button>
        </form>

        <p className="mt-5 border-t border-stone-200 pt-4 text-center text-sm text-stone-600">
          {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError(null);
            }}
            className="text-stone-900 underline underline-offset-2 hover:text-stone-600"
          >
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
          Demo mode — your account is saved only in this browser.
        </p>
      </div>
    </div>
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
