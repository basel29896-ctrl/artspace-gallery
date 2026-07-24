'use client';

import { signOut } from '@/lib/demo-store/auth';
import type { DemoUser } from '@/lib/demo-store/store';

const BOOKING_EMAIL = '7uloultech@gmail.com';

/** Galleries are onboarded personally (white-label / B2B), not self-serve. This
 *  view sends them to book a call and request a quote by email. */
export function GalleryView({ user }: { user: DemoUser }) {
  const subject = encodeURIComponent('ArtSpace — gallery, book a call & quote');
  const bodyText = encodeURIComponent(
    `Gallery: ${user.name}\nEmail: ${user.email}\n\nI'd like to book a call to discuss ArtSpace for our gallery (white-label preview on our own site) and get a quote.\n\nBest times to reach me:\nWebsite / Instagram:\nRoughly how many works we'd show:`,
  );
  const mailto = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${bodyText}`;

  return (
    <div className="mx-auto max-w-xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Gallery · demo</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900">{user.name}</h1>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-800"
        >
          Sign out
        </button>
      </header>

      <div className="mt-10 rounded-md border border-stone-200 bg-[#faf7f2] p-8">
        <h2 className="font-serif text-2xl leading-tight text-stone-900">
          Let&apos;s set ArtSpace up for your gallery.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Galleries run ArtSpace as a branded, white-label preview on their own site — your name,
          your colours, your buyers. We set each gallery up personally and tailor a quote to how many
          works and artists you show. Book a call and we&apos;ll take it from there.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-stone-700">
          <li>• A true-to-scale “view in your space” embedded on your own pages</li>
          <li>• Your branding, no code shown, no traffic sent elsewhere</li>
          <li>• Buyers contact your artists directly — no checkout, no commission</li>
        </ul>

        <a
          href={mailto}
          className="mt-8 inline-block rounded-sm bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
        >
          Book a call &amp; request a quote
        </a>
        <p className="mt-3 text-xs text-stone-500">
          Opens an email to {BOOKING_EMAIL} with your details pre-filled.
        </p>
      </div>
    </div>
  );
}
