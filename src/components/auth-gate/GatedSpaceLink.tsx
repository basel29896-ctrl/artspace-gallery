'use client';

import { useRouter } from 'next/navigation';
import { useRequireAuth } from './AuthGateProvider';

/**
 * "View in Your Space" trigger that requires a demo account first. Signed in (or
 * in the real app) it navigates straight to the space preview; signed out in the
 * demo it opens the auth modal and navigates once the visitor is in.
 */
export function GatedSpaceLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const requireAuth = useRequireAuth();
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        requireAuth(
          () => router.push(href),
          'Create a free account to preview this work in your own space.',
        )
      }
    >
      {children}
    </button>
  );
}
