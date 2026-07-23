'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_REF, type FramePct } from '@/lib/hero/frames';

type Props = {
  frames: FramePct[];
  onChange: (frames: FramePct[]) => void;
  /** Reference-px → screen-px factor of the cover box, to convert drag deltas. */
  coverScale: number;
};

/**
 * Dev-only: drag the four corners of each frame onto the paused video, then copy
 * the emitted JSON into `lib/hero/frames.ts`. Enabled with `?calibrate=1`.
 */
export function CalibrationOverlay({ frames, onChange, coverScale }: Props) {
  const drag = useRef<{ frame: number; corner: number } | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dxPct = ((e.movementX / coverScale) / HERO_REF.width) * 100;
      const dyPct = ((e.movementY / coverScale) / HERO_REF.height) * 100;
      const next = frames.map((f, fi) => {
        if (fi !== d.frame) return f;
        const corners = f.corners.map((c, ci) =>
          ci === d.corner
            ? ([Math.max(0, Math.min(100, c[0] + dxPct)), Math.max(0, Math.min(100, c[1] + dyPct))] as [number, number])
            : c,
        ) as FramePct['corners'];
        return { ...f, corners };
      });
      onChange(next);
    };
    const onUp = () => {
      drag.current = null;
      force((n) => n + 1);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [frames, onChange, coverScale]);

  const json = JSON.stringify(
    frames.map((f) => ({
      id: f.id,
      corners: f.corners.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]),
    })),
    null,
    2,
  );

  return (
    <>
      {/* Handles live in the reference-px cover box. */}
      {frames.map((f, fi) => (
        <div key={f.id}>
          <div
            className="pointer-events-none absolute border border-amber-400/80"
            style={{
              left: `${Math.min(...f.corners.map((c) => c[0]))}%`,
              top: `${Math.min(...f.corners.map((c) => c[1]))}%`,
              width: `${Math.max(...f.corners.map((c) => c[0])) - Math.min(...f.corners.map((c) => c[0]))}%`,
              height: `${Math.max(...f.corners.map((c) => c[1])) - Math.min(...f.corners.map((c) => c[1]))}%`,
            }}
          />
          {f.corners.map((c, ci) => (
            <div
              key={ci}
              onPointerDown={() => {
                drag.current = { frame: fi, corner: ci };
              }}
              className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-stone-900 bg-amber-400 touch-none"
              style={{ left: `${c[0]}%`, top: `${c[1]}%` }}
              title={`${f.id} · ${['TL', 'TR', 'BR', 'BL'][ci]}`}
            />
          ))}
        </div>
      ))}

      {/* JSON output panel (fixed, screen space). */}
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-md bg-stone-900/95 p-3 text-stone-100 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-amber-300">Frame calibration</span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(json)}
            className="rounded bg-amber-400 px-2 py-1 text-xs font-medium text-stone-900"
          >
            Copy JSON
          </button>
        </div>
        <textarea
          readOnly
          value={json}
          className="h-48 w-full resize-none rounded bg-stone-800 p-2 font-mono text-[10px] leading-tight text-stone-200"
        />
        <p className="mt-1 text-[10px] text-stone-400">Paste into HERO_FRAMES in lib/hero/frames.ts.</p>
      </div>
    </>
  );
}
