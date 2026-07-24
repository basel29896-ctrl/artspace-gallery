'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { currentUser } from '@/lib/demo-store/auth';
import { IS_STATIC_DEMO } from '@/lib/demo';
import { AuthGateModal } from './AuthGateModal';

type RequireAuth = (action: () => void, intro?: string) => void;

const AuthGateContext = createContext<RequireAuth>(() => {});

/** `requireAuth(action)`: run `action` if signed in, else open the auth modal
 *  and run it once the visitor creates an account or signs in.
 *
 *  Only gates in the static demo (localStorage auth). In the real app the
 *  action runs straight through — auth there is enforced server-side. */
export function useRequireAuth(): RequireAuth {
  return useContext(AuthGateContext);
}

const DEFAULT_INTRO = 'Create a free account to like work and preview it in your space.';

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(DEFAULT_INTRO);
  const pending = useRef<(() => void) | null>(null);

  const requireAuth = useCallback<RequireAuth>((action, introText) => {
    if (!IS_STATIC_DEMO || currentUser()) {
      action();
      return;
    }
    pending.current = action;
    setIntro(introText ?? DEFAULT_INTRO);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    pending.current = null;
    setOpen(false);
  }, []);

  const authed = useCallback(() => {
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    action?.();
  }, []);

  return (
    <AuthGateContext.Provider value={requireAuth}>
      {children}
      {open ? <AuthGateModal intro={intro} onAuthed={authed} onClose={close} /> : null}
    </AuthGateContext.Provider>
  );
}
