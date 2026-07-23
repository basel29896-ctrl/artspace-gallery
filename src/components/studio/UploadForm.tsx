'use client';

import { useState } from 'react';
import { createArtwork, fileToDataUrl } from '@/lib/demo-store/artworks';
import type { DemoSizeVariant } from '@/lib/demo-store/store';

type VariantRow = { widthCm: string; heightCm: string; priceRange: string };

const emptyVariant = (): VariantRow => ({ widthCm: '', heightCm: '', priceRange: '' });

/** Add-a-work form for the demo studio. Image is downscaled to a data URL and
 *  stored in localStorage with its dimensions and price variants. */
export function UploadForm({ ownerId, onDone }: { ownerId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setFile(f);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    if (!file) {
      setError('Choose an image of your work.');
      return;
    }
    const d = new FormData(form);
    const num = (k: string) => {
      const v = String(d.get(k) ?? '').trim();
      return v === '' ? null : Number(v);
    };
    setBusy(true);
    try {
      const imageUrl = await fileToDataUrl(file);
      const sizeVariants: DemoSizeVariant[] = variants
        .filter((v) => v.widthCm && v.heightCm)
        .map((v) => ({
          widthCm: Number(v.widthCm),
          heightCm: Number(v.heightCm),
          priceRange: v.priceRange.trim() || null,
        }));
      createArtwork({
        ownerId,
        title: String(d.get('title') ?? '').trim() || 'Untitled',
        medium: String(d.get('medium') ?? '').trim(),
        year: num('year'),
        imageUrl,
        widthCm: num('widthCm'),
        heightCm: num('heightCm'),
        priceRange: String(d.get('priceRange') ?? '').trim() || null,
        sizeVariants,
      });
      form.reset();
      pick(null);
      setVariants([]);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-4">
        <label className="flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border border-dashed border-stone-400 bg-stone-50 text-center text-xs text-stone-500 hover:border-stone-700">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>Choose image</span>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex-1 space-y-3">
          <Field name="title" label="Title" required />
          <div className="grid grid-cols-2 gap-3">
            <Field name="medium" label="Medium" placeholder="Oil on canvas" />
            <Field name="year" label="Year" type="number" inputMode="numeric" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field name="widthCm" label="Width (cm)" type="number" inputMode="decimal" />
        <Field name="heightCm" label="Height (cm)" type="number" inputMode="decimal" />
        <Field name="priceRange" label="Price" placeholder="$800 – $1,100" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-700">Other available sizes &amp; prices</span>
          <button
            type="button"
            onClick={() => setVariants((r) => [...r, emptyVariant()])}
            className="text-xs text-stone-600 underline underline-offset-2 hover:text-stone-900"
          >
            + Add size
          </button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_1.4fr_auto] items-end gap-2">
            <MiniField label="W cm" value={v.widthCm} onChange={(x) => updateVariant(i, { widthCm: x })} />
            <MiniField label="H cm" value={v.heightCm} onChange={(x) => updateVariant(i, { heightCm: x })} />
            <MiniField label="Price" value={v.priceRange} onChange={(x) => updateVariant(i, { priceRange: x })} />
            <button
              type="button"
              onClick={() => setVariants((r) => r.filter((_, idx) => idx !== i))}
              className="pb-2 text-stone-400 hover:text-red-600"
              aria-label="Remove size"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-sm bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Add work'}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  ...rest
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-stone-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        {...rest}
        className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
      />
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-stone-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-stone-800 focus:outline-none"
      />
    </label>
  );
}
