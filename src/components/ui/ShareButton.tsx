'use client';

import { useState } from 'react';

type Props = { url?: string; title: string; label?: string };

/** Native share sheet where available, clipboard copy everywhere else. */
export function ShareButton({ url, title, label = 'Share' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // User dismissed the sheet, or the gesture expired — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', shareUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition
                 hover:border-stone-800 hover:text-stone-950
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-stone-800"
    >
      {copied ? 'Link copied' : label}
    </button>
  );
}
