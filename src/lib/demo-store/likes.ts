'use client';

import { readDb, writeDb } from './store';

/** Per-user saved works (likes) over the localStorage store. Powers the
 *  collector's "saved" view and the Like button's persisted state. */

export function isLiked(userId: string, artworkId: string): boolean {
  return readDb().likes.some((l) => l.userId === userId && l.artworkId === artworkId);
}

export function listLikedIds(userId: string): string[] {
  return readDb()
    .likes.filter((l) => l.userId === userId)
    .map((l) => l.artworkId);
}

/** Toggles the like and returns the new state (true = now liked). */
export function toggleLike(userId: string, artworkId: string): boolean {
  const db = readDb();
  const existing = db.likes.find((l) => l.userId === userId && l.artworkId === artworkId);
  if (existing) {
    db.likes = db.likes.filter((l) => !(l.userId === userId && l.artworkId === artworkId));
    writeDb(db);
    return false;
  }
  db.likes.push({ userId, artworkId });
  writeDb(db);
  return true;
}
