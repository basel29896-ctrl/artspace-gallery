'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import type { GalleryArtwork } from '@/lib/artworks/queries';
import { buildPlacements, EYE_HEIGHT } from '@/lib/gallery/layout';
import { Room } from './Room';
import { ArtworkFrame } from './ArtworkFrame';
import { CameraRig } from './CameraRig';
import { ArtworkPanel } from './ArtworkPanel';

/** Scroll runway. 1 screen of sticky viewport + this much travel to rotate through. */
const SCROLL_SCREENS = 4;

export default function RoomScene({ artworks }: { artworks: GalleryArtwork[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const sectionRef = useRef<HTMLDivElement>(null);
  // Refs rather than state: these change on every scroll/pointer event and must
  // not trigger a React render — the rig reads them inside useFrame.
  const progressRef = useRef(0);
  const dragRef = useRef({ azimuth: 0, pitch: 0 });
  const pointer = useRef<{ x: number; y: number } | null>(null);

  const placements = useMemo(() => buildPlacements(artworks.length), [artworks.length]);
  const selectedIndex = artworks.findIndex((a) => a.id === selectedId);
  const selected = selectedIndex >= 0 ? artworks[selectedIndex] : null;

  const focus = useMemo(() => {
    if (selectedIndex < 0) return null;
    const placement = placements[selectedIndex];
    if (!placement) return null;
    return { position: placement.viewpoint, target: placement.position };
  }, [selectedIndex, placements]);

  // Map window scroll over the tall section onto 0–1.
  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), travel);
      const next = scrolled / travel;
      progressRef.current = next;
      // Throttled to whole percents so the indicator does not re-render at 60fps.
      setProgress((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointer.current) return;
    const dx = e.clientX - pointer.current.x;
    const dy = e.clientY - pointer.current.y;
    pointer.current = { x: e.clientX, y: e.clientY };
    dragRef.current = {
      azimuth: dragRef.current.azimuth - dx * 0.0022,
      pitch: dragRef.current.pitch - dy * 0.0012,
    };
  }, []);

  const endDrag = useCallback(() => {
    pointer.current = null;
  }, []);

  return (
    <div ref={sectionRef} style={{ height: `${SCROLL_SCREENS * 100}svh` }} className="relative">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#efeae1]">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [0, EYE_HEIGHT, 1.2], fov: 58, near: 0.1, far: 60 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={0.55} color="#fff1de" />
          <hemisphereLight args={['#fff4e2', '#b9a992', 0.5]} />
          <pointLight position={[0, 7.2, 0]} intensity={22} distance={26} color="#ffe9c9" />

          <Room />

          {artworks.map((artwork, i) =>
            placements[i] ? (
              <Suspense key={artwork.id} fallback={null}>
                <ArtworkFrame
                  artwork={artwork}
                  placement={placements[i]}
                  isSelected={artwork.id === selectedId}
                  onSelect={setSelectedId}
                />
              </Suspense>
            ) : null,
          )}

          <CameraRig progressRef={progressRef} dragRef={dragRef} focus={focus} />
          <AdaptiveDpr pixelated />
          <Preload all />
        </Canvas>

        {/* Intro copy fades out as soon as the visitor starts moving. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-24 z-10 px-6 text-center transition-opacity duration-500"
          style={{ opacity: progress > 0.06 ? 0 : 1 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-stone-600">
            The ArtSpace Collection
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            The most-loved work on ArtSpace, hung in one room.
          </h2>
        </div>

        {!selected ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-3 transition-opacity duration-500"
            style={{ opacity: progress > 0.94 ? 0 : 1 }}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-stone-600">
              {progress < 0.04 ? 'Scroll to walk the room' : 'Click a work to view it'}
            </p>
            <div className="h-px w-40 overflow-hidden bg-stone-400/40">
              <div
                className="h-full bg-stone-800 transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        <ArtworkPanel artwork={selected} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}
