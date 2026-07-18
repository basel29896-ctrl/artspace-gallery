'use client';

import { useEffect, useRef, useState } from 'react';
import { IS_STATIC_DEMO } from '@/lib/demo';

type Props = { artworkId: string; artistName: string };

type Status = { kind: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

export function ContactArtistDialog({ artworkId, artistName }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    if (IS_STATIC_DEMO) {
      // No API route exists in the static build. Be explicit rather than
      // letting the request 404 and look broken.
      setStatus({
        kind: 'error',
        message: 'This is a static preview — messages are not delivered here.',
      });
      return;
    }

    setStatus({ kind: 'sending' });

    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artwork_id: artworkId,
        buyer_name: form.get('buyer_name'),
        buyer_phone: form.get('buyer_phone'),
        message: form.get('message'),
        // Honeypot: bots fill every field, humans never see this one.
        website: form.get('website'),
      }),
    });

    const body = await res.json().catch(() => ({ error: 'Unexpected response' }));

    if (res.ok) {
      setStatus({ kind: 'sent' });
    } else {
      setStatus({ kind: 'error', message: body.error ?? 'Could not send your message.' });
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition
                   hover:bg-stone-700 focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-stone-800"
      >
        Contact Artist
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-title"
        className="w-full max-w-md bg-[#faf7f2] p-6 shadow-xl sm:rounded-lg sm:p-8"
      >
        <h2 id="contact-title" className="font-serif text-2xl text-stone-900">
          Contact {artistName}
        </h2>

        {status.kind === 'sent' ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-stone-700">
              Your message has been sent. {artistName} will reach out to you directly.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm text-stone-50 hover:bg-stone-700"
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="buyer_name" className="block text-sm text-stone-700">
                Your name
              </label>
              <input
                ref={firstFieldRef}
                id="buyer_name"
                name="buyer_name"
                required
                maxLength={120}
                className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                           focus:border-stone-800 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="buyer_phone" className="block text-sm text-stone-700">
                Phone
              </label>
              <input
                id="buyer_phone"
                name="buyer_phone"
                type="tel"
                required
                maxLength={32}
                className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                           focus:border-stone-800 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-stone-700">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={4}
                maxLength={2000}
                className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                           focus:border-stone-800 focus:outline-none"
              />
            </div>

            {/* Honeypot — visually and programmatically hidden from real users. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            {status.kind === 'error' ? (
              <p role="alert" className="text-sm text-red-700">
                {status.message}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-sm border border-stone-300 px-4 py-2.5 text-sm text-stone-700 hover:border-stone-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status.kind === 'sending'}
                className="flex-1 rounded-sm bg-stone-900 px-4 py-2.5 text-sm text-stone-50 hover:bg-stone-700 disabled:opacity-60"
              >
                {status.kind === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
