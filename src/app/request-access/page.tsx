import Link from 'next/link';
import type { Metadata } from 'next';
import { RequestAccessForm } from '@/components/access/RequestAccessForm';

export const metadata: Metadata = {
  title: 'Request access — ArtSpace',
  description:
    'Ask for an ArtSpace account. We arrange the subscription personally while online payment in Jordan is set up.',
};

export default function RequestAccessPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Join ArtSpace</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-stone-900">
        Request access
      </h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-stone-600">
        Accounts are set up personally. Tell us who you are and we&apos;ll reach out to arrange your
        subscription and open your studio — no online payment needed yet.
      </p>

      <RequestAccessForm />

      <p className="mt-8 text-sm text-stone-500">
        Already have an account?{' '}
        <Link href="/login" className="text-stone-800 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </main>
  );
}
