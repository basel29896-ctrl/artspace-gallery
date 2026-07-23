'use client';

import { useState } from 'react';

/**
 * Access-request form. There is no self-serve signup: online subscription
 * payment is not yet available in Jordan / MENA (no Stripe), so the visitor
 * asks for access and the operator contacts them to arrange payment and create
 * the account by hand.
 *
 * Works on the fully static site (no backend of ours):
 *  - primary: POST to Web3Forms, which emails the operator. Enabled by setting
 *    NEXT_PUBLIC_WEB3FORMS_KEY (a public submission key from web3forms.com).
 *  - fallback: if no key is configured, open the visitor's mail client with the
 *    request pre-filled, so the flow never dead-ends.
 */

const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? '';
const CONTACT_EMAIL = 'basel29896@gmail.com';

type Role = 'artist' | 'gallery' | 'visitor';
type Status = 'idle' | 'sending' | 'sent' | 'error';

export function RequestAccessForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const role = String(data.get('role') ?? 'artist');
    const message = String(data.get('message') ?? '').trim();

    if (!name || !email) {
      setError('Please add your name and email.');
      setStatus('error');
      return;
    }

    // No key configured: hand off to the visitor's mail client.
    if (!WEB3FORMS_KEY) {
      const subject = encodeURIComponent(`ArtSpace access request — ${name} (${role})`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nRole: ${role}\n\n${message}`,
      );
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      setStatus('sent');
      return;
    }

    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `ArtSpace access request — ${name} (${role})`,
          from_name: 'ArtSpace',
          name,
          email,
          role,
          message: message || '(no message)',
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (res.ok && json.success) {
        form.reset();
        setStatus('sent');
      } else {
        setError(json.message ?? 'Something went wrong. Please email us directly.');
        setStatus('error');
      }
    } catch {
      setError('Could not send the request. Please email us directly.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="font-serif text-2xl text-stone-900">Request received</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          Thank you — we&apos;ll be in touch by email shortly to set up your account and arrange
          the subscription. Online payment is coming soon; for now we handle it personally so we
          can get you onboarded properly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field name="name" label="Name" autoComplete="name" required />
      <Field name="email" label="Email" type="email" autoComplete="email" required />

      <fieldset>
        <legend className="text-sm text-stone-700">I am</legend>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <RoleOption value="artist" label="Artist" defaultChecked />
          <RoleOption value="gallery" label="Gallery" />
          <RoleOption value="visitor" label="Collector" />
        </div>
      </fieldset>

      <div>
        <label htmlFor="message" className="block text-sm text-stone-700">
          Anything you&apos;d like us to know <span className="text-stone-400">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                     focus:border-stone-800 focus:outline-none"
          placeholder="A link to your work, your gallery, how many pieces you'd list…"
        />
      </div>

      {status === 'error' && error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50
                   transition hover:bg-stone-700 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Request access'}
      </button>

      <p className="text-xs leading-relaxed text-stone-500">
        We don&apos;t take payment online yet. Send this and we&apos;ll contact you to arrange the
        subscription and create your account.
      </p>
    </form>
  );
}

function RoleOption({
  value,
  label,
  defaultChecked,
}: {
  value: Role;
  label: string;
  defaultChecked?: boolean;
}) {
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
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm
                   focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}
