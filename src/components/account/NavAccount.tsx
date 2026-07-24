'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/demo-store/auth';
import { useDemoSession } from '@/lib/demo-store/useDemoSession';
import type { DemoUser } from '@/lib/demo-store/store';
import { ChangePasswordModal } from './ChangePasswordModal';

const HOME_LABEL: Record<DemoUser['role'], string> = {
  artist: 'My studio',
  gallery: 'Gallery',
  visitor: 'My collection',
};

/** Global account control for the demo. Signed out → a Sign in button. Signed in
 *  → an avatar that opens a menu with profile, change password, and sign out. */
export function NavAccount({ mobile = false }: { mobile?: boolean }) {
  const { user, ready } = useDemoSession();

  if (!ready) return null;

  if (!user) {
    return (
      <Link
        href="/studio"
        className={
          mobile
            ? 'block text-sm text-stone-800'
            : 'rounded-sm bg-stone-900 px-4 py-1.5 text-sm text-stone-50 transition hover:bg-stone-700'
        }
      >
        Sign in
      </Link>
    );
  }

  return mobile ? <MobileAccount user={user} /> : <DesktopAccount user={user} />;
}

function Avatar({ user, size = 34 }: { user: DemoUser; size?: number }) {
  const initial = (user.name || user.email).charAt(0).toUpperCase();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- user data URL
    <img
      src={user.avatarUrl}
      alt=""
      style={{ width: size, height: size }}
      className="rounded-full object-cover ring-1 ring-stone-900/10"
    />
  ) : (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-stone-900 font-serif text-sm text-stone-50"
    >
      {initial}
    </span>
  );
}

function DesktopAccount({ user }: { user: DemoUser }) {
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const id = setTimeout(() => window.addEventListener('click', onClick), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full p-0.5 transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
      >
        <Avatar user={user} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-md border border-stone-200 bg-[#faf7f2] shadow-xl"
        >
          <div className="border-b border-stone-200 px-4 py-3">
            <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-400 capitalize">
              {user.role === 'visitor' ? 'collector' : user.role}
            </p>
          </div>
          <div className="py-1">
            <Link
              href="/studio"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              {HOME_LABEL[user.role]}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setPwOpen(true);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
            >
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="block w-full border-t border-stone-200 px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      {pwOpen ? <ChangePasswordModal userId={user.id} onClose={() => setPwOpen(false)} /> : null}
    </div>
  );
}

function MobileAccount({ user }: { user: DemoUser }) {
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar user={user} size={30} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
          <p className="truncate text-xs text-stone-500">{user.email}</p>
        </div>
      </div>
      <Link href="/studio" className="block text-sm text-stone-800">
        {HOME_LABEL[user.role]}
      </Link>
      <button type="button" onClick={() => setPwOpen(true)} className="block text-left text-sm text-stone-800">
        Change password
      </button>
      <button type="button" onClick={() => signOut()} className="block text-left text-sm text-stone-800">
        Sign out
      </button>
      {pwOpen ? <ChangePasswordModal userId={user.id} onClose={() => setPwOpen(false)} /> : null}
    </div>
  );
}
