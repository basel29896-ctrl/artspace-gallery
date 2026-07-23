'use client';

import { useMemo, type CSSProperties } from 'react';
import type { SpaceArtwork, EmbedOptions } from '@/lib/space/types';
import { SpaceWorkspace } from '@/components/space/SpaceWorkspace';
import { toSpaceArtwork, type SpaceEmbedArtwork, type SpaceEmbedConfig } from './config';

/**
 * The embeddable, backend-agnostic Space editor.
 *
 * Renders the same editor core the app uses, but driven entirely by `config`:
 * the catalogue is supplied by the gallery, and inquiries are delivered as an
 * event rather than posted to Supabase. This is the reusable unit the Phase 1
 * iframe host and Vite bundle wrap; it also runs unchanged inside this Next app.
 */
export function SpaceEmbed({ config }: { config: SpaceEmbedConfig }) {
  const { catalog, initialArtworkId, theme, events, features, imageProxyUrl } = config;

  const artworks: SpaceArtwork[] = useMemo(() => catalog.map(toSpaceArtwork), [catalog]);
  const bySpaceId = useMemo(() => {
    const map = new Map<string, SpaceEmbedArtwork>();
    for (const item of catalog) map.set(item.id, item);
    return map;
  }, [catalog]);

  if (artworks.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-stone-500">
        No artworks to display.
      </div>
    );
  }

  const initialId =
    initialArtworkId && artworks.some((a) => a.id === initialArtworkId)
      ? initialArtworkId
      : artworks[0].id;

  // Theme tokens as CSS variables + a font wrapper. (Feature-flag enforcement
  // and full token coverage land in Phase 2.)
  const style = {
    '--embed-accent': theme?.accent ?? '#1c1917',
    '--embed-surface': theme?.surface ?? 'transparent',
    '--embed-radius': theme?.radius ?? '4px',
    background: theme?.surface ?? 'transparent',
    fontFamily: theme?.fontFamily,
  } as CSSProperties;

  const renderInquiry =
    events?.onInquiry && (features?.inquiry ?? true)
      ? (artwork: SpaceArtwork) => {
          const original = bySpaceId.get(artwork.id);
          if (!original) return null;
          return (
            <button
              type="button"
              onClick={() => events.onInquiry?.(original)}
              className="w-full rounded-sm px-5 py-2.5 text-sm font-medium text-white transition"
              style={{ background: 'var(--embed-accent)', borderRadius: 'var(--embed-radius)' }}
            >
              Inquire about this work
            </button>
          );
        }
      : undefined;

  // Serialisable proxy template → URL resolver for the anonymous canvas loads.
  const resolveImageUrl = imageProxyUrl
    ? (url: string) => imageProxyUrl.replace('{url}', encodeURIComponent(url))
    : undefined;

  const embedOptions: EmbedOptions = {
    features: features
      ? {
          calibration: features.calibration ?? true,
          multiPlacement: features.multiPlacement ?? true,
          download: features.download ?? true,
          inquiry: features.inquiry ?? true,
        }
      : undefined,
    accent: theme?.accent,
    radius: theme?.radius,
    resolveImageUrl,
    onSelectArtwork: events?.onSelect,
    onExported: events?.onExport,
  };

  return (
    <div style={style} data-artspace-embed>
      <SpaceWorkspace
        artworks={artworks}
        initialArtworkId={initialId}
        renderInquiry={renderInquiry}
        embed={embedOptions}
      />
    </div>
  );
}
