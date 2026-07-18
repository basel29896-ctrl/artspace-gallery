'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { becomeArtist } from '@/app/settings/actions';

export function BecomeArtistButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'error' | 'notice'; text: string } | null>(null);

  function handleClick() {
    // One-way change — confirm before making it.
    if (!window.confirm('Switch to an artist account? This cannot be undone from settings.')) {
      return;
    }

    startTransition(async () => {
      const result = await becomeArtist();
      if (result.error) {
        setMessage({ kind: 'error', text: result.error });
        return;
      }
      setMessage({ kind: 'notice', text: result.notice ?? 'Done.' });
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-sm bg-stone-900 px-6 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:opacity-60"
      >
        {pending ? 'Upgrading…' : 'Become an artist'}
      </button>

      {message ? (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm ${message.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
