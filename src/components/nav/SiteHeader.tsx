import { createClient } from '@/lib/supabase/server';
import { NavBar, type NavUser } from './NavBar';

/**
 * Reads the session on the server so the bar renders in its signed-in state on
 * first paint — a client-side check would flash "Sign in" for every logged-in
 * visitor on every navigation.
 */
export async function SiteHeader() {
  let user: NavUser = null;

  try {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, name, username')
        .eq('id', authUser.id)
        .single();

      user = {
        role: profile?.role ?? 'visitor',
        name: profile?.name ?? null,
        username: profile?.username ?? null,
      };
    }
  } catch {
    // The header must never take a page down. An unreachable auth service
    // degrades to the signed-out bar rather than a 500.
  }

  return <NavBar user={user} />;
}
