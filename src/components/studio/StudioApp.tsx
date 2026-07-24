'use client';

import { useDemoSession } from '@/lib/demo-store/useDemoSession';
import { AuthPanel } from './AuthPanel';
import { StudioDashboard } from './StudioDashboard';
import { CollectorView } from './CollectorView';
import { GalleryView } from './GalleryView';

/**
 * Auth gate + role router for the demo. Signed out → sign up / sign in. Signed
 * in, the view depends on the role chosen at sign-up:
 *   artist  → studio dashboard (upload, profile, prices)
 *   gallery → book-a-call (white-label onboarding is personal, not self-serve)
 *   visitor → collector home (saved works)
 * `ready` avoids a hydration flash.
 */
export function StudioApp() {
  const { user, ready } = useDemoSession();

  if (!ready) return <div className="h-40" aria-hidden />;
  if (!user) return <AuthPanel />;

  if (user.role === 'artist') return <StudioDashboard user={user} />;
  if (user.role === 'gallery') return <GalleryView user={user} />;
  return <CollectorView user={user} />;
}
