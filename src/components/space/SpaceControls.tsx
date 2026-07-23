'use client';

import {
  FRAMES,
  type FrameStyle,
  type MatColor,
  type MatSettings,
  type RealismSettings,
} from '@/lib/space/renderPerspective';
import type { CSSProperties, ReactNode } from 'react';
import type { SpaceArtwork, ArtworkSize, EditorFeatures } from '@/lib/space/types';
import { resolveFeatures } from '@/lib/space/types';

const FRAME_OPTIONS: { value: FrameStyle; label: string; swatch: string }[] = [
  { value: 'none', label: 'None', swatch: 'linear-gradient(135deg,#e7e5e4,#d6d3d1)' },
  { value: 'thin', label: 'Thin', swatch: 'linear-gradient(135deg,#3a352d,#17140f)' },
  { value: 'black', label: 'Black', swatch: 'linear-gradient(135deg,#3a342e,#141210)' },
  { value: 'white', label: 'White', swatch: 'linear-gradient(135deg,#ffffff,#ddd8ce)' },
  { value: 'oak', label: 'Oak', swatch: 'linear-gradient(135deg,#e0c288,#a97e42)' },
  { value: 'natural-oak', label: 'N. Oak', swatch: 'linear-gradient(135deg,#e4c88f,#b58f52)' },
  { value: 'walnut', label: 'Walnut', swatch: 'linear-gradient(135deg,#7d5433,#3f2817)' },
  { value: 'gold', label: 'Gold', swatch: 'linear-gradient(135deg,#f6e6ab,#8a6a24)' },
  { value: 'silver', label: 'Silver', swatch: 'linear-gradient(135deg,#e8eaec,#9aa0a6)' },
  { value: 'thin-metal', label: 'Metal', swatch: 'linear-gradient(135deg,#eef1f3,#8f969d)' },
];

/** Fallback artwork short edge (cm) for the mat slider before real dims exist. */
const NOMINAL_SHORT_CM = 60;
const MAT_MAX_CM = 15;

const MAT_COLORS: { value: MatColor; label: string; swatch: string }[] = [
  { value: 'white', label: 'White', swatch: '#f7f5f0' },
  { value: 'ivory', label: 'Ivory', swatch: '#efe7d6' },
  { value: 'grey', label: 'Grey', swatch: '#b9b4ac' },
  { value: 'black', label: 'Black', swatch: '#181614' },
];

export type PlacementSummary = { id: string; title: string; thumbnailUrl: string };

type Props = {
  artworks: SpaceArtwork[];
  placements: PlacementSummary[];
  selectedId: string | null;
  onSelectPlacement: (id: string) => void;
  onAddArtwork: (artworkId: string) => void;
  onDeletePlacement: (id: string) => void;
  onDuplicatePlacement: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBack: (id: string) => void;

  // Selected placement editing.
  selectedArtwork?: SpaceArtwork;
  /** Selected artwork's real short edge in cm, when known (drives the mat cm slider). */
  artworkShortEdgeCm?: number;
  frame: FrameStyle;
  onFrameChange: (frame: FrameStyle) => void;
  mat: MatSettings;
  onMatChange: (mat: MatSettings) => void;
  sizes: ArtworkSize[];
  variantIndex: number;
  onSelectVariant: (index: number) => void;

  // Global.
  realism: RealismSettings;
  onRealismChange: (realism: RealismSettings) => void;
  calibrated: boolean;
  calibrating: boolean;
  onStartCalibration: () => void;
  onApplyCalibration: () => void;
  onCancelCalibration: () => void;
  refCm: string;
  onRefCmChange: (value: string) => void;
  trueSize: boolean;
  onTrueSizeChange: (value: boolean) => void;

  onDownload: () => void;
  exportError?: string | null;
  onReset: () => void;
  /** Inquiry UI is injected so the editor core carries no backend coupling. */
  renderInquiry?: (artwork: SpaceArtwork) => ReactNode;
  features?: EditorFeatures;
  accent?: string;
  radius?: string;
};

export function SpaceControls(props: Props) {
  const {
    artworks,
    placements,
    selectedId,
    onSelectPlacement,
    onAddArtwork,
    onDeletePlacement,
    onDuplicatePlacement,
    onBringForward,
    onSendBack,
    selectedArtwork,
    artworkShortEdgeCm,
    frame,
    onFrameChange,
    mat,
    onMatChange,
    sizes,
    variantIndex,
    onSelectVariant,
    realism,
    onRealismChange,
    calibrated,
    calibrating,
    onStartCalibration,
    onApplyCalibration,
    onCancelCalibration,
    refCm,
    onRefCmChange,
    trueSize,
    onTrueSizeChange,
    onDownload,
    exportError,
    onReset,
    renderInquiry,
    accent,
    radius,
  } = props;

  const features = resolveFeatures(props.features);
  const hasSelection = selectedId !== null;

  // Theme: accent tints primary actions and selected states; radius rounds them.
  const primaryStyle: CSSProperties | undefined =
    accent || radius ? { background: accent, borderRadius: radius } : undefined;
  const selectedStyle: CSSProperties | undefined = accent
    ? { borderColor: accent, color: accent }
    : undefined;
  const selStyle = (on: boolean) => (on ? selectedStyle : undefined);

  // Mat width is stored as a fraction of the short edge; the slider works in cm.
  const shortEdgeCm = artworkShortEdgeCm ?? NOMINAL_SHORT_CM;
  const matCm = mat.width * shortEdgeCm;
  const setMatCm = (cm: number) =>
    onMatChange({ ...mat, width: Math.min(Math.max(cm, 0), MAT_MAX_CM) / shortEdgeCm });

  // Framed outer size: frame + mat grow the piece. Border per side (fraction of
  // the short edge), applied symmetrically; bottom-weighting adds 20% mat below.
  const frameFrac = FRAMES[frame]?.ratio ?? 0;
  const borderFrac = frameFrac + mat.width;
  const shortFactor = 1 + 2 * borderFrac;
  const artW = selectedArtwork?.widthCm ?? null;
  const artH = selectedArtwork?.heightCm ?? null;
  const framedReadout = (() => {
    if (!hasSelection) return null;
    if (calibrated && artW && artH) {
      const border = borderFrac * shortEdgeCm;
      const bottom = mat.bottomWeighted ? mat.width * shortEdgeCm * 0.2 : 0;
      const w = artW + border * 2;
      const h = artH + border * 2 + bottom;
      return `${w.toFixed(1)} × ${h.toFixed(1)} cm framed`;
    }
    return borderFrac > 0 ? `×${shortFactor.toFixed(2)} of the artwork` : null;
  })();

  return (
    <aside className="space-y-8">
      {/* --------------------------------------------------------- placed works */}
      {features.multiPlacement && placements.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">
            Placed · {placements.length}
          </h2>
          {/* Listed front-to-back (top of the stack first). */}
          <ul className="mt-3 space-y-1.5">
            {[...placements].reverse().map((p) => (
              <li
                key={p.id}
                style={selStyle(p.id === selectedId)}
                className={`flex items-center gap-2 rounded-sm border p-1.5 transition ${
                  p.id === selectedId ? 'border-stone-900 bg-stone-50' : 'border-stone-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPlacement(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-pressed={p.id === selectedId}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 32px thumb */}
                  <img
                    src={p.thumbnailUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 object-cover"
                    draggable={false}
                  />
                  <span className="truncate text-sm text-stone-800">{p.title}</span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 text-stone-400">
                  <IconButton label="Bring forward" onClick={() => onBringForward(p.id)}>↑</IconButton>
                  <IconButton label="Send back" onClick={() => onSendBack(p.id)}>↓</IconButton>
                  <IconButton label="Duplicate" onClick={() => onDuplicatePlacement(p.id)}>⧉</IconButton>
                  <IconButton label="Delete" onClick={() => onDeletePlacement(p.id)}>×</IconButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --------------------------------------------------------- add artwork */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">
          {features.multiPlacement ? 'Add artwork' : 'Artwork'}
        </h2>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {artworks.map((artwork) => (
            <button
              key={artwork.id}
              type="button"
              onClick={() => onAddArtwork(artwork.id)}
              title={`Add ${artwork.title}`}
              className="aspect-square overflow-hidden ring-2 ring-transparent transition hover:ring-stone-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- fixed thumb */}
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
      </section>

      {/* ------------------------------------------------------------ selected */}
      {hasSelection ? (
        <>
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Frame</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {FRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFrameChange(option.value)}
                  aria-pressed={frame === option.value}
                  style={selStyle(frame === option.value)}
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
                {mat.width === 0 ? 'Off' : `${matCm.toFixed(1)} cm`}
                {artworkShortEdgeCm ? '' : ' approx'}
              </span>
            </div>
            <input
              aria-label="Mat width in centimetres"
              type="range"
              min={0}
              max={MAT_MAX_CM}
              step={0.5}
              value={matCm}
              onChange={(e) => setMatCm(Number(e.target.value))}
              className="mt-3 w-full accent-stone-900"
            />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {MAT_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onMatChange({
                      ...mat,
                      color: option.value,
                      // Nudge the mat on (to ~5 cm) if a colour is picked while off.
                      width: mat.width === 0 ? 5 / shortEdgeCm : mat.width,
                    })
                  }
                  aria-pressed={mat.color === option.value}
                  disabled={mat.width === 0}
                  style={selStyle(mat.color === option.value && mat.width > 0)}
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
            <label className="mt-3 flex items-center justify-between text-sm text-stone-700">
              <span>Bottom-weighted</span>
              <input
                type="checkbox"
                checked={mat.bottomWeighted ?? false}
                disabled={mat.width === 0}
                onChange={(e) => onMatChange({ ...mat, bottomWeighted: e.target.checked })}
                className="h-4 w-4 accent-stone-900 disabled:opacity-40"
              />
            </label>
          </section>

          {sizes.length > 0 ? (
            <section>
              <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">Size</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sizes.map((size, index) => (
                  <button
                    key={`${size.widthCm}x${size.heightCm}`}
                    type="button"
                    onClick={() => onSelectVariant(index)}
                    aria-pressed={index === variantIndex}
                    style={selStyle(index === variantIndex)}
                    className={`rounded-sm border px-3 py-2 text-left text-sm transition ${
                      index === variantIndex
                        ? 'border-stone-900 text-stone-900'
                        : 'border-stone-200 text-stone-500 hover:border-stone-400'
                    }`}
                  >
                    <span className="block tabular-nums">
                      {size.widthCm} × {size.heightCm} cm
                    </span>
                    {size.priceRange ? (
                      <span className="mt-0.5 block text-[11px] text-stone-400">{size.priceRange}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              {!calibrated ? (
                <p className="mt-2 text-[11px] text-stone-400">
                  Set the scale below to compare these at true size.
                </p>
              ) : null}
            </section>
          ) : null}

          {framedReadout ? (
            <section className="flex items-baseline justify-between border-t border-stone-200 pt-4">
              <span className="text-xs uppercase tracking-[0.18em] text-stone-500">Framed size</span>
              <span className="text-sm tabular-nums text-stone-800">{framedReadout}</span>
            </section>
          ) : null}
        </>
      ) : (
        <p className="border-l-2 border-stone-300 pl-4 text-sm text-stone-500">
          Select a piece on the wall to change its frame, mat, or size.
        </p>
      )}

      {/* --------------------------------------------------------- true scale */}
      {features.calibration ? (
      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-stone-500">True scale</h2>
        {calibrating ? (
          <div className="mt-3 space-y-3">
            <label className="block text-sm text-stone-700">
              Length of the reference on the wall
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={refCm}
                  onChange={(e) => onRefCmChange(e.target.value)}
                  placeholder="e.g. 90"
                  className="w-full rounded-sm border border-stone-300 px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
                />
                <span className="text-sm text-stone-500">cm</span>
              </div>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onApplyCalibration}
                disabled={!(Number(refCm) > 0)}
                style={primaryStyle}
                className="flex-1 rounded-sm bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:opacity-40"
              >
                Apply scale
              </button>
              <button
                type="button"
                onClick={onCancelCalibration}
                className="rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm leading-relaxed text-stone-600">
              {calibrated
                ? 'Scale is set. Pieces are shown at real size, correct relative to each other.'
                : 'Measure a known object on the wall (a door, a shelf) to place every piece at true size.'}
            </p>
            {calibrated ? (
              <label className="flex items-center justify-between text-sm text-stone-700">
                <span>True size</span>
                <input
                  type="checkbox"
                  checked={trueSize}
                  onChange={(e) => onTrueSizeChange(e.target.checked)}
                  className="h-4 w-4 accent-stone-900"
                />
              </label>
            ) : null}
            <button
              type="button"
              onClick={onStartCalibration}
              className="w-full rounded-sm border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:border-stone-800"
            >
              {calibrated ? 'Re-measure' : 'Set scale'}
            </button>
          </div>
        )}
      </section>
      ) : null}

      {/* ------------------------------------------------------------ realism */}
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

      {/* ------------------------------------------------------------- actions */}
      <section className="space-y-3 border-t border-stone-200 pt-6">
        {features.download ? (
          <button
            type="button"
            onClick={onDownload}
            style={primaryStyle}
            className="w-full rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
          >
            Download Preview
          </button>
        ) : null}
        {exportError ? (
          <p role="alert" className="text-sm text-red-700">
            {exportError}
          </p>
        ) : null}
        {selectedArtwork && renderInquiry ? renderInquiry(selectedArtwork) : null}
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

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-sm text-base leading-none transition hover:bg-stone-200 hover:text-stone-900"
    >
      {children}
    </button>
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
