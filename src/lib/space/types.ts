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

/** Editor capabilities a host can trim. All default on. */
export type EditorFeatures = {
  calibration: boolean;
  multiPlacement: boolean;
  download: boolean;
  inquiry: boolean;
};

/**
 * Host-supplied options threaded through the editor core. Empty/omitted keeps
 * the full-featured app defaults; the embeddable SDK populates it from config.
 */
export type EmbedOptions = {
  features?: Partial<EditorFeatures>;
  /** Accent colour for primary actions and selection highlights. */
  accent?: string;
  /** Corner radius token for buttons, e.g. "6px". */
  radius?: string;
  /** Rewrites an artwork URL before the (anonymous, canvas) load — a CORS proxy. */
  resolveImageUrl?: (url: string) => string;
  onSelectArtwork?: (artworkId: string) => void;
  onExported?: () => void;
};

export const DEFAULT_FEATURES: EditorFeatures = {
  calibration: true,
  multiPlacement: true,
  download: true,
  inquiry: true,
};

export function resolveFeatures(features?: Partial<EditorFeatures>): EditorFeatures {
  return { ...DEFAULT_FEATURES, ...features };
}

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
