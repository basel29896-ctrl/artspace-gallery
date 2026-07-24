'use client';

import { useEffect, useState } from 'react';
import { changePassword } from '@/lib/demo-store/auth';

export function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const d = new FormData(e.currentTarget);
    const current = String(d.get('current') ?? '');
    const next = String(d.get('next') ?? '');
    const confirm = String(d.get('confirm') ?? '');
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    const res = changePassword(userId, current, next);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
        className="w-full max-w-sm rounded-md bg-[#faf7f2] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl tracking-tight text-stone-900">Change password</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 p-1 text-stone-400 hover:text-stone-800">
            ✕
          </button>
        </div>

        {done ? (
          <div className="mt-6 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Password updated. Use it next time you sign in.
            <button
              type="button"
              onClick={onClose}
              className="mt-4 block w-full rounded-sm bg-stone-900 px-4 py-2 text-sm text-stone-50 hover:bg-stone-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field name="current" label="Current password" />
            <Field name="next" label="New password" />
            <Field name="confirm" label="Confirm new password" />
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
            >
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-stone-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        required
        minLength={6}
        autoComplete={name === 'current' ? 'current-password' : 'new-password'}
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}
