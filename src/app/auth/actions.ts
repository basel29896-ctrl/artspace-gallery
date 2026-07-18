'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { safeRedirectPath } from '@/lib/auth/redirect';

export type AuthState = { error: string | null; notice: string | null };

const credentials = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
});

const signUpSchema = credentials.extend({
  name: z.string().trim().min(1, 'Please enter your name.').max(120),
  role: z.enum(['artist', 'visitor']),
});

function requestIp() {
  const h = headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/**
 * Deliberately vague. Distinguishing "no such account" from "wrong password"
 * turns the login form into an account-enumeration oracle.
 */
const INVALID_CREDENTIALS = 'Email or password is incorrect.';

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const next = safeRedirectPath(formData.get('next')?.toString(), '/');

  // Keyed by IP. Credential stuffing is the threat; a per-email key would let an
  // attacker rotate emails freely, and would also let them lock out a victim.
  if (!rateLimit(`signin:${requestIp()}`, 10, 15 * 60 * 1000).ok) {
    return { error: 'Too many attempts. Please wait a few minutes.', notice: null };
  }

  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: INVALID_CREDENTIALS, notice: null };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: INVALID_CREDENTIALS, notice: null };
  }

  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!rateLimit(`signup:${requestIp()}`, 5, 60 * 60 * 1000).ok) {
    return { error: 'Too many sign-up attempts. Please try again later.', notice: null };
  }

  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role: formData.get('role') ?? 'visitor',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.', notice: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    // Supabase returns a generic response for existing addresses when email
    // confirmation is on; do not add detail that would confirm the account.
    return { error: 'Could not create the account. Please try again.', notice: null };
  }

  // `role` is protected by a trigger and cannot be set by the user's own
  // session, so it is applied here with service_role after the account exists.
  if (data.user && parsed.data.role === 'artist') {
    const admin = createAdminClient();
    await admin.from('users').update({ role: 'artist' }).eq('id', data.user.id);
  }

  // No session means Supabase is waiting on email confirmation.
  if (!data.session) {
    return {
      error: null,
      notice: 'Check your email for a confirmation link to finish signing up.',
    };
  }

  revalidatePath('/', 'layout');
  redirect(parsed.data.role === 'artist' ? '/dashboard' : '/');
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeRedirectPath(formData.get('next')?.toString(), '/');
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect('/login?error=oauth');
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
