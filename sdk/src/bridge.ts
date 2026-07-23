import type { SpaceEmbedConfig } from '@/embed/config';

/**
 * postMessage protocol between the host page (loader) and the embedded iframe.
 *
 * Only serialisable data crosses the boundary. Event *callbacks* stay on the
 * host: the iframe forwards named events, the loader invokes the matching
 * function from the host's config. The room photo never leaves the iframe.
 */

export const MSG = {
  ready: 'artspace:ready',
  config: 'artspace:config',
  resize: 'artspace:resize',
  event: 'artspace:event',
} as const;

/** Config without the function-valued `events` (which cannot be postMessage'd). */
export type SerializableConfig = Omit<SpaceEmbedConfig, 'events'>;

export type ReadyMessage = { type: typeof MSG.ready };
export type ConfigMessage = { type: typeof MSG.config; config: SerializableConfig };
export type ResizeMessage = { type: typeof MSG.resize; height: number };
export type EventMessage = { type: typeof MSG.event; name: string; payload: unknown };

export type HostToFrame = ConfigMessage;
export type FrameToHost = ReadyMessage | ResizeMessage | EventMessage;
