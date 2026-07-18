'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IS_STATIC_DEMO } from '@/lib/demo';

export type NavUser = {
  role: 'artist' | 'visitor';
  name: string | null;
  username: string | null;
} | null;

const LINKS = [
  { href: '/', label: 'Gallery' },
  { href: '/artists', label: 'Artists' },
];

export function NavBar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // The landing page is a full-bleed 3D scene; the bar floats over it until the
  // visitor scrolls, then takes a surface so the links stay legible over art.
  const isImmersive = pathname === '/';

  useEffect(() => {
    if (!isImmersive) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isImmersive]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Login has its own centred branding; a nav bar there is noise.
  if (pathname === '/login') return null;

  const solid = !isImmersive || scrolled;

  return (
    <header
      // Fixed only over the immersive 3D landing, where it must float above the
      // canvas. Everywhere else it is sticky, so it occupies layout space and
      // no page needs compensating top padding.
      className={`${isImmersive ? 'fixed' : 'sticky'} inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid
          ? 'border-b border-stone-200/80 bg-[#f7f4ee]/90 backdrop-blur-md'
          : 'border-b border-transparent'
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6"
      >
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-stone-900 transition hover:text-stone-600"
        >
          ArtSpace
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          {LINKS.map((link) => {
            const active =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`text-sm transition ${
                  active
                    ? 'text-stone-900 underline decoration-stone-900 underline-offset-8'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {IS_STATIC_DEMO ? (
            <a
              href="https://github.com/basel29896-ctrl/artspace-gallery"
              className="rounded-sm border border-stone-300 px-4 py-1.5 text-sm text-stone-700 transition hover:border-stone-800"
            >
              Source
            </a>
          ) : user ? (
            <>
              {user.role === 'artist' ? (
                <Link
                  href="/dashboard"
                  className="text-sm text-stone-600 transition hover:text-stone-900"
                >
                  Studio
                </Link>
              ) : null}
              <Link
                href="/settings"
                className="rounded-sm border border-stone-300 px-4 py-1.5 text-sm text-stone-700 transition hover:border-stone-800"
              >
                {user.name?.split(' ')[0] ?? 'Account'}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-stone-600 transition hover:text-stone-900"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-sm bg-stone-900 px-4 py-1.5 text-sm text-stone-50 transition hover:bg-stone-700"
              >
                Join
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 p-2 sm:hidden"
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <span aria-hidden className="block text-lg leading-none text-stone-900">
            {open ? '×' : '≡'}
          </span>
        </button>
      </nav>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-stone-200 bg-[#f7f4ee] px-6 py-4 sm:hidden"
        >
          <ul className="space-y-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block text-sm text-stone-800">
                  {link.label}
                </Link>
              </li>
            ))}
            {IS_STATIC_DEMO ? (
              <li>
                <a
                  href="https://github.com/basel29896-ctrl/artspace-gallery"
                  className="block text-sm text-stone-800"
                >
                  Source
                </a>
              </li>
            ) : user ? (
              <>
                {user.role === 'artist' ? (
                  <li>
                    <Link href="/dashboard" className="block text-sm text-stone-800">
                      Studio
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link href="/settings" className="block text-sm text-stone-800">
                    Settings
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login" className="block text-sm text-stone-800">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/login?mode=signup" className="block text-sm text-stone-800">
                    Join
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
