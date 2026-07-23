'use client';

import { useState } from 'react';
import { signIn, signUp } from '@/lib/demo-store/auth';
import type { DemoRole } from '@/lib/demo-store/store';

/** Sign up / sign in for the localStorage demo. On success the session hook
 *  updates and the Studio swaps to the dashboard — no navigation needed. */
export function AuthPanel() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [error, setError] = useState<string | null>(null);

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
            role: (String(d.get('role') ?? 'artist') as DemoRole),
          })
        : signIn(email, password);

    if (!result.ok) setError(result.error);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <strong>Demo mode.</strong> Accounts and uploads are saved only in this browser, so you can
        try the full studio. Nothing is sent anywhere.
      </div>

      <div className="mt-8 flex border-b border-stone-200">
        {(['signup', 'signin'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${
              mode === m
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {m === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        ))}
      </div>

      <form onSubmit={handle} className="mt-8 space-y-4">
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

        {mode === 'signup' ? (
          <fieldset>
            <legend className="text-sm text-stone-700">I am</legend>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <Role value="artist" label="Artist" defaultChecked />
              <Role value="gallery" label="Gallery" />
              <Role value="visitor" label="Collector" />
            </div>
          </fieldset>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
        >
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function Role({ value, label, defaultChecked }: { value: DemoRole; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer rounded-sm border border-stone-300 p-3 text-center transition has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
      <input type="radio" name="role" value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="block text-sm font-medium text-stone-900">{label}</span>
    </label>
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
