'use client';

import { readDb, writeDb, genId, type DemoRole, type DemoUser } from './store';

/**
 * Demo auth over the localStorage store. Mirrors the shape a real auth layer
 * (NextAuth + Postgres on Heroku) would expose, so callers do not change when
 * the backend is swapped in.
 */

const obfuscate = (s: string) => (typeof btoa === 'function' ? btoa(s) : s);

export type AuthResult = { ok: true; user: DemoUser } | { ok: false; error: string };

export function signUp(input: {
  name: string;
  email: string;
  password: string;
  role: DemoRole;
}): AuthResult {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: 'Please add your name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };
  if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

  const db = readDb();
  if (db.users.some((u) => u.email === email)) {
    return { ok: false, error: 'An account with that email already exists — sign in instead.' };
  }

  const user: DemoUser = {
    id: genId('user'),
    name,
    email,
    pass: obfuscate(input.password),
    role: input.role,
    bio: '',
    website: '',
    instagram: '',
    avatarUrl: null,
    createdAt: Date.now(),
  };
  db.users.push(user);
  db.sessionUserId = user.id;
  writeDb(db);
  return { ok: true, user };
}

export function signIn(email: string, password: string): AuthResult {
  const db = readDb();
  const user = db.users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || user.pass !== obfuscate(password)) {
    return { ok: false, error: 'Email or password is incorrect.' };
  }
  db.sessionUserId = user.id;
  writeDb(db);
  return { ok: true, user };
}

export function signOut(): void {
  const db = readDb();
  db.sessionUserId = null;
  writeDb(db);
}

export function currentUser(): DemoUser | null {
  const db = readDb();
  if (!db.sessionUserId) return null;
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

export function updateProfile(
  userId: string,
  patch: Partial<Pick<DemoUser, 'name' | 'bio' | 'website' | 'instagram' | 'avatarUrl'>>,
): DemoUser | null {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;
  db.users[idx] = { ...db.users[idx], ...patch, instagram: (patch.instagram ?? db.users[idx].instagram).replace(/^@/, '') };
  writeDb(db);
  return db.users[idx];
}
