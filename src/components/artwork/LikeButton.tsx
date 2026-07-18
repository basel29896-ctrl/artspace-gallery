'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = { artworkId: string; initialCount: number };

/**
 * Writes straight to `likes` from the browser. Safe because the RLS policies
 * only permit inserting/deleting a row whose user_id is the caller, and
 * likes_count is maintained by a trigger rather than by this component.
 */
export function LikeButton({ artworkId, initialCount }: Props) {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [promptSignIn, setPromptSignIn] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (!user) return;

      const { data } = await supabase
        .from('likes')
        .select('artwork_id')
        .eq('artwork_id', artworkId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (active) setLiked(Boolean(data));
    }

    load();
    return () => {
      active = false;
    };
  }, [supabase, artworkId]);

  // Dismiss the sign-in prompt on Escape or an outside click.
  useEffect(() => {
    if (!promptSignIn) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPromptSignIn(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setPromptSignIn(false);
    };

    window.addEventListener('keydown', onKey);
    // Deferred so the click that opened it does not immediately close it.
    const id = setTimeout(() => window.addEventListener('click', onClick), 0);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      clearTimeout(id);
    };
  }, [promptSignIn]);

  async function toggle() {
    if (!userId) {
      // Deliberately does NOT navigate. Yanking someone off the artwork they
      // are reading, with no explanation, reads as the page breaking.
      setPromptSignIn(true);
      return;
    }
    if (pending) return;

    const nextLiked = !liked;
    setPending(true);
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    const { error } = nextLiked
      ? await supabase.from('likes').insert({ user_id: userId, artwork_id: artworkId })
      : await supabase.from('likes').delete().eq('user_id', userId).eq('artwork_id', artworkId);

    if (error) {
      setLiked(!nextLiked);
      setCount((c) => c + (nextLiked ? -1 : 1));
    }
    setPending(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={liked}
        className={`flex items-center gap-2 rounded-sm border px-4 py-2 text-sm transition
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-stone-800 disabled:opacity-60 ${
                      liked
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-stone-300 text-stone-700 hover:border-stone-800 hover:text-stone-950'
                    }`}
      >
        <span aria-hidden>{liked ? '♥' : '♡'}</span>
        <span className="tabular-nums">{count}</span>
        <span className="sr-only">{liked ? 'Unlike this artwork' : 'Like this artwork'}</span>
      </button>

      {promptSignIn ? (
        <div
          role="status"
          className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded-sm border border-stone-300
                     bg-[#faf7f2] p-3 shadow-lg"
        >
          <p className="text-sm leading-snug text-stone-700">
            Sign in to save work you love.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="rounded-sm bg-stone-900 px-3 py-1.5 text-xs text-stone-50 transition hover:bg-stone-700"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setPromptSignIn(false)}
              className="rounded-sm border border-stone-300 px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-800"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
