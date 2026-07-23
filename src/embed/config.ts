import type { SpaceArtwork, ArtworkSize } from '@/lib/space/types';

/**
 * Public configuration surface for the embeddable Space editor.
 *
 * This is the contract galleries integrate against. It is intentionally free of
 * any ArtSpace/Supabase concept: a gallery supplies its own catalogue (absolute
 * image URLs it controls) and receives interactions as callbacks/events.
 */

export type SpaceEmbedSize = {
  widthCm: number;
  heightCm: number;
  priceRange?: string | null;
};

export type SpaceEmbedArtwork = {
  id: string;
  title: string;
  /** Absolute URL. MUST be CORS-permissive (Access-Control-Allow-Origin) or the
   *  downloaded preview taints and export fails. */
  imageUrl: string;
  artistName?: string | null;
  widthCm?: number | null;
  heightCm?: number | null;
  /** Offered sizes for the size switcher. */
  sizes?: SpaceEmbedSize[];
};

export type SpaceEmbedTheme = {
  /** Primary/action colour (CSS colour). */
  accent?: string;
  /** Surface/background colour behind the editor. */
  surface?: string;
  /** Font family applied to the editor chrome. */
  fontFamily?: string;
  /** Corner radius for buttons/cards, e.g. "6px". */
  radius?: string;
  /** Gallery name, shown where a credit is appropriate. */
  name?: string;
  logoUrl?: string;
};

/** All default on; a gallery can trim the surface. Enforced progressively. */
export type SpaceEmbedFeatures = {
  room3d?: boolean; // heavy R3F module, off by default in v1
  calibration?: boolean;
  multiPlacement?: boolean;
  download?: boolean;
  inquiry?: boolean;
};

export type SpaceEmbedEvents = {
  /** Fired when the visitor asks about a piece (the "inquiry" CTA). */
  onInquiry?: (artwork: SpaceEmbedArtwork) => void;
  onSelect?: (artworkId: string) => void;
  onExport?: () => void;
  onAddToCart?: (artwork: SpaceEmbedArtwork) => void;
};

export type SpaceEmbedConfig = {
  catalog: SpaceEmbedArtwork[];
  /** Which piece the editor opens on. Defaults to the first in the catalogue. */
  initialArtworkId?: string;
  theme?: SpaceEmbedTheme;
  features?: SpaceEmbedFeatures;
  events?: SpaceEmbedEvents;
};

/** Maps a public catalogue item onto the editor's internal artwork shape. */
export function toSpaceArtwork(item: SpaceEmbedArtwork): SpaceArtwork {
  const sizeVariants: ArtworkSize[] = (item.sizes ?? [])
    .filter((s) => s.widthCm > 0 && s.heightCm > 0)
    .map((s) => ({
      widthCm: s.widthCm,
      heightCm: s.heightCm,
      priceRange: s.priceRange ?? null,
    }));

  return {
    id: item.id,
    title: item.title,
    displayUrl: item.imageUrl,
    artistName: item.artistName ?? null,
    widthCm: item.widthCm ?? null,
    heightCm: item.heightCm ?? null,
    sizeVariants,
  };
}
