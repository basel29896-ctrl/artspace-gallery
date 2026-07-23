'use client';

import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SpaceArtwork } from '@/lib/space/types';

// Konva touches `window` at module scope, so its import must be deferred to the
// client. React.lazy (not next/dynamic) keeps this core portable to the Vite
// SDK; the editor only ever renders after a room photo is chosen, which is
// client-only, so the chunk never loads during SSR.
const SpaceEditor = lazy(() =>
  import('./SpaceEditor').then((m) => ({ default: m.SpaceEditor })),
);

const EditorFallback = () => (
  <div className="flex h-96 items-center justify-center text-sm text-stone-500">
    Loading editor…
  </div>
);

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 20 * 1024 * 1024;

type Props = {
  artworks: SpaceArtwork[];
  initialArtworkId: string;
  /** Inquiry UI, injected by the caller so this core carries no backend
   *  coupling. The app supplies its Supabase dialog; the embed SDK an event. */
  renderInquiry?: (artwork: SpaceArtwork) => ReactNode;
};

export function SpaceWorkspace({ artworks, initialArtworkId, renderInquiry }: Props) {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The object URL is the only copy of the room photo. Revoke it on unmount so
  // the blob is not retained after the user leaves.
  useEffect(() => {
    return () => {
      if (roomUrl) URL.revokeObjectURL(roomUrl);
    };
  }, [roomUrl]);

  function acceptFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPT.split(',').includes(file.type)) {
      setError(`Unsupported file type: ${file.type || 'unknown'}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Photo is larger than 20MB.');
      return;
    }

    setError(null);
    setRoomUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  }

  function reset() {
    setRoomUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  if (roomUrl) {
    return (
      <Suspense fallback={<EditorFallback />}>
        <SpaceEditor
          roomImageUrl={roomUrl}
          artworks={artworks}
          initialArtworkId={initialArtworkId}
          onReset={reset}
          renderInquiry={renderInquiry}
        />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center border-2 border-dashed p-10 text-center transition ${
          dragging ? 'border-stone-800 bg-stone-100' : 'border-stone-300 bg-stone-50 hover:border-stone-500'
        }`}
      >
        <p className="font-serif text-xl text-stone-900">Add a photo of your room</p>
        <p className="mt-2 text-sm text-stone-500">
          Drop it here or click to browse · JPEG, PNG, WebP, AVIF · max 20MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <p className="mt-6 border-l-2 border-stone-300 pl-4 text-sm leading-relaxed text-stone-600">
        Your photo never leaves this device. It is held in browser memory only — not uploaded, not
        stored, and discarded the moment you close this page.
      </p>
    </div>
  );
}
