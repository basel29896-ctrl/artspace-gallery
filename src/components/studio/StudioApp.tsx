'use client';

import { useDemoSession } from '@/lib/demo-store/useDemoSession';
import { AuthPanel } from './AuthPanel';
import { StudioDashboard } from './StudioDashboard';

/** Auth gate for the demo studio: shows sign up / sign in until there is a
 *  local session, then the dashboard. `ready` avoids a hydration flash. */
export function StudioApp() {
  const { user, ready } = useDemoSession();

  if (!ready) {
    return <div className="h-40" aria-hidden />;
  }

  return user ? <StudioDashboard user={user} /> : <AuthPanel />;
}
