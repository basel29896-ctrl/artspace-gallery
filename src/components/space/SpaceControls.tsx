'use client';

import type { FrameStyle, MatColor, MatSettings, RealismSettings } from '@/lib/space/renderPerspective';
import type { SpaceArtwork } from '@/lib/artworks/queries';
import { ContactArtistDialog } from '@/components/artwork/ContactArtistDialog';

const FRAME_OPTIONS: { value: FrameStyle; label: string; swatch: string }[] = [
  { value: 'none', label: 'None', swatch: 'linear-gradient(135deg,#e7e5e4,#d6d3d1)' },
  { value: 'thin', label: 'Thin', swatch: 'linear-gradient(135deg,#3a352d,#17140f)' },
  { value: 'black', label: 'Black', swatch: 'linear-gradient(135deg,#3a342e,#141210)' },
  { value: 'white', label: 'White', swatch: 'linear-gradient(135deg,#ffffff,#ddd8ce)' },
  { value: 'oak', label: 'Oak', swatch: 'linear-gradient(135deg,#e0c288,#a97e42)' },
  { value: 'walnut', label: 'Walnut', swatch: 'linear-gradient(135deg,#7d5433,#3f2817)' },
  { value: 'gold', label: 'Gold', swatch: 'linear-gradient(135deg,#f6e6ab,#8a6a24)' },
  { value: 'silver', label: 'Silver', swatch: 'linear-gradient(135deg,#e8eaec,#9aa0a6)' },
];

const MAT_COLORS: { value: MatColor; label: string; swatch: string }[] = [
  { value: 'white', label: 'White', swatch: '#f7f5f0' },
  { value: 'ivory', label: 'Ivory', swatch: '#efe7d6' },
  { value: 'grey', label: 'Grey', swatch: '#b9b4ac' },
  { value: 'black', label: 'Black', swatch: '#181614' },
];

type Props = {
  artworks: SpaceArtwork[];
  activeId: string;
  activeArtwork?: SpaceArtwork;
  onSelect: (id: string) => void;
  frame: FrameStyle;
  onFrameChange: (frame: FrameStyle) => void;
  mat: MatSettings;
  onMatChange: (mat: MatSettings) => void;
  realism: RealismSettings;
  onRealismChange: (realism: RealismSettings) => void;
  onDownload: () => void;
  exportError?: string | null;
  onReset: () => void;
};

export function SpaceControls({
  artworks,
  activeId,
  activeArtwork,
  onSelect,
  frame,
  onFrameChange,
  mat,
  onMatChange,
  realism,
  onRealismChange,
  onDownload,
  exportError,
  onReset,
}: Props) {
  return (
    <aside className="space-y-8">
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Artwork</h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {artworks.map((artwork) => (
            <button
              key={artwork.id}
              type="button"
              onClick={() => onSelect(artwork.id)}
              aria-pressed={artwork.id === activeId}
              title={artwork.title}
              className={`aspect-square overflow-hidden ring-2 transition ${
                artwork.id === activeId
                  ? 'ring-stone-900'
                  : 'ring-transparent hover:ring-stone-400'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed 64px thumb, optimizer adds no value */}
              <img
                src={artwork.displayUrl}
                alt={artwork.title}
                className="h-full w-full object-cover"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </button>
          ))}
        </div>
        {activeArtwork ? (
          <p className="mt-2 truncate font-serif text-sm text-stone-800">{activeArtwork.title}</p>
        ) : null}
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Frame</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {FRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFrameChange(option.value)}
              aria-pressed={frame === option.value}
              className={`flex flex-col items-center gap-1.5 rounded-sm border p-2 text-[11px] transition ${
                frame === option.value
                  ? 'border-stone-900 text-stone-900'
                  : 'border-stone-200 text-stone-500 hover:border-stone-400'
              }`}
            >
              <span
                aria-hidden
                className="h-6 w-6 rounded-sm ring-1 ring-stone-900/10"
                style={{ background: option.swatch }}
              />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Mat</h2>
          <span className="text-xs tabular-nums text-stone-500">
            {mat.width === 0 ? 'Off' : `${Math.round(mat.width * 100)}%`}
          </span>
        </div>

        <input
          aria-label="Mat width"
          type="range"
          min={0}
          max={0.16}
          step={0.005}
          value={mat.width}
          onChange={(e) => onMatChange({ ...mat, width: Number(e.target.value) })}
          className="mt-3 w-full accent-stone-900"
        />

        <div className="mt-3 grid grid-cols-4 gap-2">
          {MAT_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                onMatChange({
                  color: option.value,
                  // Nudge the mat on if the user picks a colour while it is off.
                  width: mat.width === 0 ? 0.06 : mat.width,
                })
              }
              aria-pressed={mat.color === option.value}
              disabled={mat.width === 0}
              className={`flex flex-col items-center gap-1.5 rounded-sm border p-2 text-[11px] transition disabled:opacity-40 ${
                mat.color === option.value && mat.width > 0
                  ? 'border-stone-900 text-stone-900'
                  : 'border-stone-200 text-stone-500 hover:border-stone-400'
              }`}
            >
              <span
                aria-hidden
                className="h-6 w-6 rounded-sm ring-1 ring-stone-900/10"
                style={{ background: option.swatch }}
              />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Realism</h2>

        <label className="mt-4 flex items-center justify-between text-sm text-stone-700">
          <span>Drop shadow</span>
          <input
            type="checkbox"
            checked={realism.shadow}
            onChange={(e) => onRealismChange({ ...realism, shadow: e.target.checked })}
            className="h-4 w-4 accent-stone-900"
          />
        </label>

        <Slider
          label="Brightness"
          min={0.5}
          max={1.5}
          step={0.01}
          value={realism.brightness}
          onChange={(brightness) => onRealismChange({ ...realism, brightness })}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        <Slider
          label="Warmth"
          min={-1}
          max={1}
          step={0.01}
          value={realism.warmth}
          onChange={(warmth) => onRealismChange({ ...realism, warmth })}
          format={(v) => (v === 0 ? 'Neutral' : v > 0 ? `Warm ${Math.round(v * 100)}` : `Cool ${Math.round(-v * 100)}`)}
        />
      </section>

      <section className="space-y-3 border-t border-stone-200 pt-6">
        <button
          type="button"
          onClick={onDownload}
          className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
        >
          Download Preview
        </button>

        {exportError ? (
          <p role="alert" className="text-sm text-red-700">
            {exportError}
          </p>
        ) : null}

        {activeArtwork ? (
          <ContactArtistDialog
            artworkId={activeArtwork.id}
            artistName={activeArtwork.artistName ?? 'the artist'}
          />
        ) : null}

        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-sm border border-stone-300 px-5 py-2.5 text-sm text-stone-700 transition hover:border-stone-800"
        >
          Use a different photo
        </button>
      </section>
    </aside>
  );
}

function Slider({
  label,
  value,
  onChange,
  format,
  ...rest
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  min: number;
  max: number;
  step: number;
}) {
  const id = `slider-${label.toLowerCase()}`;
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-stone-700">
          {label}
        </label>
        <span className="text-xs tabular-nums text-stone-500">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-stone-900"
        {...rest}
      />
    </div>
  );
}
