'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export type ProfileState = { error: string | null; notice: string | null };

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3–30 characters: letters, numbers, underscore.')
    .optional()
    .or(z.literal('')),
  bio: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'You are not signed in.', notice: null };

  const parsed = schema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    bio: formData.get('bio'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.', notice: null };
  }

  // Uses the caller's own session, so the RLS policy and the privileged-column
  // trigger both still apply — this cannot touch `role` or `plan`.
  const { error } = await supabase
    .from('users')
    .update({
      name: parsed.data.name,
      username: parsed.data.username || null,
      bio: parsed.data.bio || null,
    })
    .eq('id', user.id);

  if (error) {
    // 23505 = unique_violation on the username index.
    if (error.code === '23505') {
      return { error: 'That username is already taken.', notice: null };
    }
    console.error('[settings] profile update failed', error);
    return { error: 'Could not save your profile.', notice: null };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { error: null, notice: 'Profile saved.' };
}

/**
 * Upgrades a visitor to an artist account.
 *
 * `role` is blocked by a BEFORE UPDATE trigger for the user's own session, so
 * this runs with service_role. Choosing to be an artist is free and self-serve;
 * `plan` remains untouchable here and is only ever written by the Stripe webhook.
 * Downgrading is deliberately not offered — it would orphan published artworks.
 */
export async function becomeArtist(): Promise<ProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'You are not signed in.', notice: null };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ role: 'artist' })
    .eq('id', user.id)
    // Never silently flip an account that is already an artist, and scope the
    // write so a stale request cannot touch anyone else's row.
    .eq('role', 'visitor');

  if (error) {
    console.error('[settings] artist upgrade failed', error);
    return { error: 'Could not upgrade your account.', notice: null };
  }

  revalidatePath('/', 'layout');
  return { error: null, notice: 'You now have an artist account.' };
}
