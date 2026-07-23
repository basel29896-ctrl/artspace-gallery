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
  website: z
    .string()
    .trim()
    .max(200)
    .url('Enter a valid URL (including https://).')
    .optional()
    .or(z.literal('')),
  instagram: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal('')),
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
    website: formData.get('website'),
    instagram: formData.get('instagram'),
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
      website: parsed.data.website || null,
      // Store the handle without a leading @.
      instagram: parsed.data.instagram?.replace(/^@/, '') || null,
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

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX = 5 * 1024 * 1024;

/** Uploads a profile photo to the public `avatars` bucket and links it. */
export async function uploadAvatar(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You are not signed in.', notice: null };

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an image first.', notice: null };
  }
  if (!AVATAR_TYPES.includes(file.type)) {
    return { error: 'Use a JPEG, PNG, or WebP image.', notice: null };
  }
  if (file.size > AVATAR_MAX) {
    return { error: 'Image must be under 5MB.', notice: null };
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  // uid-scoped path so the storage RLS policy permits the write.
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const upload = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (upload.error) {
    console.error('[settings] avatar upload failed', upload.error);
    return { error: 'Could not upload the image.', notice: null };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
  if (error) {
    console.error('[settings] avatar link failed', error);
    return { error: 'Could not save the image.', notice: null };
  }

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { error: null, notice: 'Photo updated.' };
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
