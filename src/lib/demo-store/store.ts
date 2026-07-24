'use client';

/**
 * Client-side demo backend, persisted in localStorage.
 *
 * The live GitHub Pages build is a static export with no server, database, or
 * auth. To let people try the full artist experience (create an account, upload
 * work, set an about section and prices) this module fakes a backend entirely in
 * the browser. Nothing here is secure or shared — it is a single-visitor sandbox
 * that resets when the browser storage is cleared.
 *
 * This is deliberately a thin repository so the Heroku migration can swap the
 * implementation (Postgres + NextAuth + object storage) behind the same shape.
 */

export type DemoRole = 'artist' | 'gallery' | 'visitor';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  /** Demo-only obfuscation (btoa). NOT real password security — never ship this to a server. */
  pass: string;
  role: DemoRole;
  bio: string;
  website: string;
  instagram: string;
  avatarUrl: string | null;
  createdAt: number;
};

export type DemoSizeVariant = { widthCm: number; heightCm: number; priceRange: string | null };

export type DemoArtwork = {
  id: string;
  ownerId: string;
  title: string;
  medium: string;
  year: number | null;
  /** Data URL — the uploaded image itself, kept inline in localStorage. */
  imageUrl: string;
  widthCm: number | null;
  heightCm: number | null;
  priceRange: string | null;
  sizeVariants: DemoSizeVariant[];
  createdAt: number;
};

export type DemoLike = { userId: string; artworkId: string };

type DemoDb = {
  version: number;
  users: DemoUser[];
  artworks: DemoArtwork[];
  likes: DemoLike[];
  sessionUserId: string | null;
};

const KEY = 'artspace_demo_db_v1';
const DB_VERSION = 1;

function empty(): DemoDb {
  return { version: DB_VERSION, users: [], artworks: [], likes: [], sessionUserId: null };
}

export function readDb(): DemoDb {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as DemoDb;
    if (parsed.version !== DB_VERSION) return empty();
    // Tolerate stores written before `likes` existed.
    if (!Array.isArray(parsed.likes)) parsed.likes = [];
    return parsed;
  } catch {
    return empty();
  }
}

export function writeDb(db: DemoDb): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
    // Let other components in the tab react (auth state, studio lists).
    window.dispatchEvent(new Event('artspace-demo-change'));
  } catch {
    // localStorage quota is the realistic failure (data-URL images are large).
    throw new Error(
      'Could not save — the demo stores images in your browser and it is full. Remove a piece and try again.',
    );
  }
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
