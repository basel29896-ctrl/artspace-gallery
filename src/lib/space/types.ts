/**
 * Framework- and backend-agnostic data types for the Space editor.
 *
 * These deliberately live under `lib/space` (next to the pure geometry/render
 * modules) rather than in `lib/artworks/queries.ts`, so the editor core can be
 * lifted into the embeddable SDK without dragging Supabase along. `queries.ts`
 * re-exports them for existing callers.
 */

export type ArtworkSize = { widthCm: number; heightCm: number; priceRange: string | null };

export type SpaceArtwork = {
  id: string;
  title: string;
  displayUrl: string;
  artistName: string | null;
  /** Listed physical size, when known. Drives true-to-scale placement. */
  widthCm: number | null;
  heightCm: number | null;
  /** Offered sizes for the size switcher. Includes the base size when known. */
  sizeVariants: ArtworkSize[];
};

/** Coerces a raw `size_variants` payload (JSONB row, or SDK JSON) into valid sizes. */
export function normalizeSizeVariants(raw: unknown): ArtworkSize[] {
  if (!Array.isArray(raw)) return [];
  const sizes: ArtworkSize[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const w = Number((item as Record<string, unknown>).width_cm);
    const h = Number((item as Record<string, unknown>).height_cm);
    if (!(w > 0) || !(h > 0)) continue;
    const price = (item as Record<string, unknown>).price_range;
    sizes.push({ widthCm: w, heightCm: h, priceRange: typeof price === 'string' ? price : null });
  }
  return sizes;
}
