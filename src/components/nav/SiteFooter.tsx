import Link from 'next/link';
import { IS_STATIC_DEMO } from '@/lib/demo';

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-[#f2efe9]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-lg tracking-tight text-stone-900">ArtSpace</p>
          <p className="mt-1 text-xs text-stone-500">
            A room for artists to show and sell original work.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-600">
          <Link href="/" className="transition hover:text-stone-900">
            Gallery
          </Link>
          <Link href="/artists" className="transition hover:text-stone-900">
            Artists
          </Link>
          {IS_STATIC_DEMO ? null : (
            <Link href="/request-access" className="transition hover:text-stone-900">
              Sell your work
            </Link>
          )}
        </nav>
      </div>
    </footer>
  );
}
