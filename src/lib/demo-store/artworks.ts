'use client';

import { readDb, writeDb, genId, type DemoArtwork, type DemoSizeVariant } from './store';

/** Artwork CRUD over the localStorage store, scoped to the owning user. */

export function listByOwner(ownerId: string): DemoArtwork[] {
  return readDb()
    .artworks.filter((a) => a.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createArtwork(input: {
  ownerId: string;
  title: string;
  medium: string;
  year: number | null;
  imageUrl: string;
  widthCm: number | null;
  heightCm: number | null;
  priceRange: string | null;
  sizeVariants: DemoSizeVariant[];
}): DemoArtwork {
  const db = readDb();
  const art: DemoArtwork = { id: genId('art'), createdAt: Date.now(), ...input };
  db.artworks.push(art);
  writeDb(db);
  return art;
}

export function deleteArtwork(ownerId: string, id: string): void {
  const db = readDb();
  db.artworks = db.artworks.filter((a) => !(a.id === id && a.ownerId === ownerId));
  writeDb(db);
}

export function getArtwork(id: string): DemoArtwork | null {
  return readDb().artworks.find((a) => a.id === id) ?? null;
}

/**
 * Reads a File into a data URL, downscaled so localStorage isn't blown out by a
 * full-resolution upload. Longest edge capped; aspect preserved.
 */
export function fileToDataUrl(file: File, maxEdge = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not available.'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
