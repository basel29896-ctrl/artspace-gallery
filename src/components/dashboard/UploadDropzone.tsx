'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_BYTES = 25 * 1024 * 1024;

type Status = { kind: 'idle' | 'uploading' | 'error' | 'done'; message?: string };

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // Optional extra offered sizes, each with its own price. Fed to the size
  // switcher + true-scale in "View in Your Space".
  const [variants, setVariants] = useState<{ w: string; h: string; price: string }[]>([]);

  function selectFile(next: File | undefined) {
    if (!next) return;

    if (!ACCEPT.split(',').includes(next.type)) {
      setStatus({ kind: 'error', message: `Unsupported file type: ${next.type || 'unknown'}` });
      return;
    }
    if (next.size > MAX_BYTES) {
      setStatus({ kind: 'error', message: 'File is larger than 25MB.' });
      return;
    }

    // Revoke the previous object URL before replacing it, or the blob leaks.
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(next);
    });
    setFile(next);
    setStatus({ kind: 'idle' });
  }

  function updateVariant(index: number, key: 'w' | 'h' | 'price', value: string) {
    setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, [key]: value } : v)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setStatus({ kind: 'error', message: 'Choose an image first.' });
      return;
    }

    const form = new FormData(e.currentTarget);
    form.set('file', file);

    // Serialise the variant rows the API expects (skip incomplete ones).
    const sizeVariants = variants
      .filter((v) => Number(v.w) > 0 && Number(v.h) > 0)
      .map((v) => ({
        width_cm: Number(v.w),
        height_cm: Number(v.h),
        price_range: v.price.trim() || null,
      }));
    form.set('size_variants', JSON.stringify(sizeVariants));

    setStatus({ kind: 'uploading' });

    const res = await fetch('/api/artworks', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({ error: 'Unexpected response' }));

    if (!res.ok) {
      setStatus({ kind: 'error', message: body.error ?? 'Upload failed.' });
      return;
    }

    setStatus({ kind: 'done' });
    setFile(null);
    setVariants([]);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          selectFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center
                    border-2 border-dashed p-6 text-center transition ${
                      dragging
                        ? 'border-stone-800 bg-stone-100'
                        : 'border-stone-300 bg-stone-50 hover:border-stone-500'
                    }`}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          // Local blob preview of the artist's own file — no protection needed here.
          // eslint-disable-next-line @next/next/no-img-element -- object URL, not a remote host
          <img src={preview} alt="" className="max-h-56 w-auto object-contain" />
        ) : (
          <>
            <p className="font-serif text-lg text-stone-800">Drop an image here</p>
            <p className="mt-1 text-sm text-stone-500">or click to browse · JPEG, PNG, WebP, AVIF · max 25MB</p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
      </div>

      {file ? <p className="text-sm text-stone-600">{file.name}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="title" label="Title" required maxLength={200} />
        <Field name="medium" label="Medium" maxLength={120} placeholder="Oil on canvas" />
        <Field name="dimensions" label="Dimensions" maxLength={120} placeholder="80 × 60 cm" />
        <Field name="year" label="Year" type="number" placeholder={String(new Date().getFullYear())} />
        <Field name="price_range" label="Price range" maxLength={120} placeholder="$1,200 – $1,800" />
      </div>

      {/* True-to-scale dimensions power "View in Your Space" (real-size preview). */}
      <fieldset className="rounded-sm border border-stone-200 p-4">
        <legend className="px-1 text-xs uppercase tracking-[0.15em] text-stone-500">
          True-to-scale size
        </legend>
        <p className="mb-3 text-xs text-stone-500">
          Real dimensions let buyers preview this piece at its correct size on their wall.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="width_cm" label="Width (cm)" type="number" step="0.1" min="0" placeholder="80" />
          <Field name="height_cm" label="Height (cm)" type="number" step="0.1" min="0" placeholder="60" />
        </div>

        <div className="mt-4">
          <span className="block text-sm text-stone-700">Other offered sizes (optional)</span>
          <div className="mt-2 space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1.4fr_auto] items-center gap-2">
                <input
                  aria-label="Width cm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="W cm"
                  value={v.w}
                  onChange={(e) => updateVariant(i, 'w', e.target.value)}
                  className="rounded-sm border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-800 focus:outline-none"
                />
                <input
                  aria-label="Height cm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="H cm"
                  value={v.h}
                  onChange={(e) => updateVariant(i, 'h', e.target.value)}
                  className="rounded-sm border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-800 focus:outline-none"
                />
                <input
                  aria-label="Price"
                  type="text"
                  placeholder="Price (optional)"
                  value={v.price}
                  onChange={(e) => updateVariant(i, 'price', e.target.value)}
                  className="rounded-sm border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}
                  aria-label="Remove size"
                  className="px-2 text-lg leading-none text-stone-400 hover:text-stone-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {variants.length < 5 ? (
            <button
              type="button"
              onClick={() => setVariants((vs) => [...vs, { w: '', h: '', price: '' }])}
              className="mt-2 text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900"
            >
              + Add a size
            </button>
          ) : null}
        </div>
      </fieldset>

      <div>
        <label htmlFor="description" className="block text-sm text-stone-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={4000}
          className="mt-1 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-800 focus:outline-none"
        />
      </div>

      {status.kind === 'error' ? (
        <p role="alert" className="text-sm text-red-700">
          {status.message}
        </p>
      ) : null}
      {status.kind === 'done' ? (
        <p role="status" className="text-sm text-emerald-700">
          Published. Your watermarked rendition is live.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.kind === 'uploading'}
        className="rounded-sm bg-stone-900 px-6 py-2.5 text-sm font-medium text-stone-50 transition
                   hover:bg-stone-700 disabled:opacity-60"
      >
        {status.kind === 'uploading' ? 'Processing…' : 'Publish artwork'}
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
