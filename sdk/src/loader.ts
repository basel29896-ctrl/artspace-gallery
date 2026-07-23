import type { SpaceEmbedConfig } from '@/embed/config';
import { MSG } from './bridge';

/**
 * Host-page loader. Exposes `ArtSpace.mount(el, config)`, which injects the
 * editor iframe, hands it the serialisable config once it signals ready, sizes
 * it to its content, and routes named events back to the host's callbacks.
 *
 * Built as an IIFE (global `ArtSpace`) with no framework — a gallery drops in a
 * single <script> tag.
 */

type MountConfig = SpaceEmbedConfig & {
  /** URL of the hosted iframe app. Defaults to the CDN build location. */
  iframeUrl?: string;
};

type MountHandle = { destroy: () => void };

const DEFAULT_IFRAME_URL = 'https://embed.artspace.example/iframe/';

function mount(target: string | HTMLElement, config: MountConfig): MountHandle {
  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) throw new Error(`ArtSpace.mount: target not found (${String(target)})`);

  const { events, iframeUrl, ...serializable } = config;

  const iframe = document.createElement('iframe');
  iframe.src = iframeUrl ?? DEFAULT_IFRAME_URL;
  iframe.title = 'View in your space';
  iframe.allow = 'clipboard-write';
  iframe.style.width = '100%';
  iframe.style.border = '0';
  iframe.style.height = '600px';
  iframe.style.display = 'block';

  const targetOrigin = new URL(iframe.src, window.location.href).origin;

  const onMessage = (e: MessageEvent) => {
    if (e.source !== iframe.contentWindow) return;
    const data = e.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case MSG.ready:
        iframe.contentWindow?.postMessage(
          { type: MSG.config, config: serializable },
          targetOrigin,
        );
        break;
      case MSG.resize:
        if (typeof data.height === 'number') iframe.style.height = `${data.height}px`;
        break;
      case MSG.event: {
        const handler = events?.[data.name as keyof typeof events] as
          | ((payload: unknown) => void)
          | undefined;
        handler?.(data.payload);
        break;
      }
    }
  };

  window.addEventListener('message', onMessage);
  el.appendChild(iframe);

  return {
    destroy() {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    },
  };
}

const ArtSpace = { mount };
(window as unknown as { ArtSpace: typeof ArtSpace }).ArtSpace = ArtSpace;

export { mount };
export type { MountConfig, MountHandle };
