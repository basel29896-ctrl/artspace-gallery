'use client';

import { useEffect, useState } from 'react';
import { currentUser } from './auth';
import type { DemoUser } from './store';

/**
 * Current demo user, kept in sync with the localStorage store. Re-reads on the
 * custom `artspace-demo-change` event (same tab) and the native `storage` event
 * (other tabs). `ready` guards against a hydration flash before the first read.
 */
export function useDemoSession() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(currentUser());
    sync();
    setReady(true);
    window.addEventListener('artspace-demo-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('artspace-demo-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { user, ready };
}
