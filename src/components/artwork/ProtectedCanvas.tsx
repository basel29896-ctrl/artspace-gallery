'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Draws the display rendition into a <canvas> rather than an <img>.
 *
 * This is deterrence, NOT protection. It defeats right-click "Save image as"
 * and image-drag. It does not defeat screenshots, the DevTools network panel,
 * `canvas.toDataURL()` from the console, or any scripted client. The real
 * safeguards are upstream: originals never leave the private bucket, and every
 * public rendition is watermarked and downscaled to 1600px.
 */
export function ProtectedCanvas({ src, alt, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let observer: ResizeObserver | undefined;

    const image = new window.Image();
    // Required so the canvas is not tainted; Supabase storage sends permissive CORS.
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      if (cancelled) return;
      setAspect(image.width / image.height);

      const draw = () => {
        const wrapper = wrapperRef.current;
        const ctx = canvas.getContext('2d');
        if (!wrapper || !ctx) return;

        // Render at device pixel ratio so the work is not soft on retina displays.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssWidth = wrapper.clientWidth;
        const cssHeight = cssWidth / (image.width / image.height);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };

      draw();
      setStatus('ready');

      observer = new ResizeObserver(draw);
      if (wrapperRef.current) observer.observe(wrapperRef.current);
    };

    image.onerror = () => {
      if (!cancelled) setStatus('error');
    };

    image.src = src;

    return () => {
      cancelled = true;
      observer?.disconnect();
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ aspectRatio: status === 'ready' ? String(aspect) : '4 / 3' }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {status === 'error' ? (
        <div className="flex h-full w-full items-center justify-center bg-stone-200 text-sm text-stone-500">
          Image unavailable
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          // Canvas has no intrinsic alt text; expose it to assistive tech explicitly.
          role="img"
          aria-label={alt}
          draggable={false}
          className={`block w-full select-none transition-opacity duration-500 ${
            status === 'ready' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
        />
      )}
    </div>
  );
}
