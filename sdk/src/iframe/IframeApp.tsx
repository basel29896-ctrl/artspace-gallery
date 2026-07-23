import { useEffect, useMemo, useRef, useState } from 'react';
import { SpaceEmbed } from '@/embed/SpaceEmbed';
import type { SpaceEmbedArtwork, SpaceEmbedConfig, SpaceEmbedEvents } from '@/embed/config';
import { MSG, type SerializableConfig } from '../bridge';

/**
 * Runs inside the iframe. Receives the (serialisable) config from the host over
 * postMessage, renders the Space editor, and pipes interactions + height changes
 * back up. The host holds the real event callbacks; we only send named events.
 */
export function IframeApp() {
  const [config, setConfig] = useState<SerializableConfig | null>(null);
  const parentOrigin = useRef<string>('*');
  const rootRef = useRef<HTMLDivElement>(null);

  const post = useMemo(
    () =>
      (message: object) => {
        window.parent.postMessage(message, parentOrigin.current);
      },
    [],
  );

  // Handshake: announce readiness, then accept config from the host.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object' || data.type !== MSG.config) return;
      // Pin replies to the origin that configured us.
      parentOrigin.current = e.origin;
      setConfig(data.config as SerializableConfig);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: MSG.ready }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Report height so the host can size the iframe to the content.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const report = () => post({ type: MSG.resize, height: Math.ceil(el.scrollHeight) });
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [post, config]);

  const forwardedEvents: SpaceEmbedEvents = useMemo(
    () => ({
      onInquiry: (artwork: SpaceEmbedArtwork) =>
        post({ type: MSG.event, name: 'onInquiry', payload: artwork }),
      onSelect: (artworkId: string) =>
        post({ type: MSG.event, name: 'onSelect', payload: artworkId }),
      onExport: () => post({ type: MSG.event, name: 'onExport', payload: null }),
      onAddToCart: (artwork: SpaceEmbedArtwork) =>
        post({ type: MSG.event, name: 'onAddToCart', payload: artwork }),
    }),
    [post],
  );

  if (!config) {
    return (
      <div ref={rootRef} className="flex h-64 items-center justify-center text-sm text-stone-400">
        Loading…
      </div>
    );
  }

  const fullConfig: SpaceEmbedConfig = { ...config, events: forwardedEvents };

  return (
    <div ref={rootRef} className="p-4">
      <SpaceEmbed config={fullConfig} />
    </div>
  );
}
