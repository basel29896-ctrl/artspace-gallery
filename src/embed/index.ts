/**
 * Public entry for the embeddable Space editor core (Phase 0).
 *
 * Phase 1 wraps this in a Vite bundle + iframe host + `ArtSpace.mount` loader.
 * For now it is consumable directly as a React component within this app, and
 * carries no Supabase/Next-server coupling of its own.
 */
export { SpaceEmbed } from './SpaceEmbed';
export {
  toSpaceArtwork,
  type SpaceEmbedConfig,
  type SpaceEmbedArtwork,
  type SpaceEmbedSize,
  type SpaceEmbedTheme,
  type SpaceEmbedFeatures,
  type SpaceEmbedEvents,
} from './config';
