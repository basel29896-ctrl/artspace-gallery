'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  signIn,
  signUp,
  signInWithGoogle,
  requestPasswordReset,
  type AuthState,
} from '@/app/auth/actions';

const EMPTY: AuthState = { error: null, notice: null };

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthForm({ next, initialMode }: { next: string; initialMode: 'signin' | 'signup' }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [signInState, signInAction] = useFormState(signIn, EMPTY);
  const [signUpState, signUpAction] = useFormState(signUp, EMPTY);
  const [forgotState, forgotAction] = useFormState(requestPasswordReset, EMPTY);

  const state =
    mode === 'signin' ? signInState : mode === 'signup' ? signUpState : forgotState;
  const formAction =
    mode === 'signin' ? signInAction : mode === 'signup' ? signUpAction : forgotAction;

  return (
    <div>
      <h1 className="font-serif text-3xl leading-tight tracking-tight text-stone-900">
        {mode === 'signin'
          ? 'Sign in to continue'
          : mode === 'signup'
            ? 'Create your account'
            : 'Reset your password'}
      </h1>
      <p className="mb-8 mt-2 text-sm text-stone-600">
        {mode === 'signin'
          ? 'Like work, contact artists, and publish your own.'
          : mode === 'signup'
            ? 'Join as a visitor to collect work, or as an artist to publish it.'
            : 'Enter your email and we will send you a reset link.'}
      </p>

      {/* Plain buttons rather than a tablist: there is one shared form below,
          not separate tabpanels, so the ARIA tab contract would be a lie. */}
      {mode !== 'forgot' ? (
        <div className="flex border-b border-stone-200">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${
                mode === m
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>
      ) : null}

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />

        {mode === 'signup' ? (
          <Field name="name" label="Name" autoComplete="name" required />
        ) : null}

        <Field name="email" label="Email" type="email" autoComplete="email" required />

        {mode !== 'forgot' ? (
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
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

        {mode === 'signup' ? (
          <fieldset className="pt-2">
            <legend className="text-sm text-stone-700">I am joining as</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <RoleOption
                value="visitor"
                label="Visitor"
                description="Browse and collect work."
                defaultChecked
              />
              <RoleOption value="artist" label="Artist" description="Publish and sell my work." />
            </div>
          </fieldset>
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

        <SubmitButton
          label={
            mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'
          }
        />
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
        <>
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-stone-200" />
            <span className="text-xs uppercase tracking-[0.15em] text-stone-400">or</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>

          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <GoogleButton />
          </form>
        </>
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

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-sm border border-stone-300
                 px-5 py-2.5 text-sm text-stone-700 transition hover:border-stone-800
                 hover:text-stone-950 disabled:opacity-60"
    >
      <svg aria-hidden viewBox="0 0 18 18" className="h-4 w-4">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
      Continue with Google
    </button>
  );
}

function RoleOption({
  value,
  label,
  description,
  defaultChecked,
}: {
  value: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-sm border border-stone-300 p-3 transition has-[:checked]:border-stone-900 has-[:checked]:bg-stone-50">
      <input
        type="radio"
        name="role"
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span className="block text-sm font-medium text-stone-900">{label}</span>
      <span className="mt-0.5 block text-xs text-stone-500">{description}</span>
    </label>
  );
}

function Field({
  name,
  label,
  hint,
  ...rest
}: { name: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
