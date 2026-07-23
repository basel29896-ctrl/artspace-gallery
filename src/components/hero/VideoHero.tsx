'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GalleryArtwork } from '@/lib/artworks/queries';
import { BASE_PATH } from '@/lib/demo';
import { prefersReducedMotion } from '@/lib/gallery/webgl';
import { HERO_REF, HERO_FRAMES, frameToRefQuad, type FramePct } from '@/lib/hero/frames';
import { VideoBackdrop } from './VideoBackdrop';
import { FrameOverlay } from './FrameOverlay';
import { HeroArtworkDetail } from './HeroArtworkDetail';
import { CalibrationOverlay } from './CalibrationOverlay';

const DESKTOP_SRC = `${BASE_PATH}/video/gallery.mp4`;
const MOBILE_SRC = `${BASE_PATH}/video/gallery-mobile.mp4`;
const POSTER = `${BASE_PATH}/video/gallery-poster.jpg`;

/** How many screens of scroll the hero occupies before the room takes over. */
const HERO_SCREENS = 1.2;

/**
 * Ambient video gallery hero. A locked-off looping clip of a real room with
 * people, with the top artworks perspective-mapped onto its blank frames. Sits
 * above the untouched 3D room, fading out as the visitor scrolls into it.
 */
export function VideoHero({ artworks }: { artworks: GalleryArtwork[] }) {
  const [coverScale, setCoverScale] = useState(1);
  const [fade, setFade] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [failed, setFailed] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [editFrames, setEditFrames] = useState<FramePct[]>(HERO_FRAMES);

  const still = failed || prefersReducedMotion();

  useEffect(() => {
    setCalibrating(new URLSearchParams(window.location.search).get('calibrate') === '1');
    const mq = window.matchMedia('(max-width: 640px)');
    const onMq = () => setMobile(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);

    const onResize = () =>
      setCoverScale(
        Math.max(window.innerWidth / HERO_REF.width, window.innerHeight / HERO_REF.height),
      );
    onResize();
    window.addEventListener('resize', onResize);

    const onScroll = () =>
      setFade(Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const frames = calibrating ? editFrames : HERO_FRAMES;
  const overlays = useMemo(
    () => artworks.slice(0, frames.length).map((art, i) => ({ art, quad: frameToRefQuad(frames[i]) })),
    [artworks, frames],
  );

  const selected = artworks.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <section style={{ height: `${HERO_SCREENS * 100}vh` }} className="relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Fade/scale the whole scene out as the room scrolls in. */}
          <div
            className="absolute inset-0 bg-black"
            style={{
              opacity: 1 - fade,
              transform: `scale(${1 - fade * 0.06})`,
              pointerEvents: fade > 0.95 ? 'none' : undefined,
            }}
          >
            {/* Fixed reference box, scaled to cover the viewport (keeps overlay
                coordinates constant across screen sizes). */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: HERO_REF.width,
                height: HERO_REF.height,
                transform: `translate(-50%, -50%) scale(${coverScale})`,
              }}
            >
              <VideoBackdrop
                desktopSrc={DESKTOP_SRC}
                mobileSrc={MOBILE_SRC}
                poster={POSTER}
                mobile={mobile}
                still={still}
                paused={calibrating}
                onFail={() => setFailed(true)}
              />

              {!calibrating
                ? overlays.map(({ art, quad }) => (
                    <FrameOverlay key={art.id} artwork={art} quad={quad} onSelect={setSelectedId} />
                  ))
                : null}

              {calibrating ? (
                <CalibrationOverlay frames={editFrames} onChange={setEditFrames} coverScale={coverScale} />
              ) : null}
            </div>

            {/* Intro copy + scroll cue, outside the scaled box so text stays crisp. */}
            {!calibrating ? (
              <div className="pointer-events-none absolute inset-x-0 top-[14vh] px-6 text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">The ArtSpace Collection</p>
                <h2 className="mx-auto mt-3 max-w-2xl font-serif text-4xl leading-[1.05] tracking-tight text-white drop-shadow sm:text-6xl">
                  A living room of the most-loved work.
                </h2>
              </div>
            ) : null}

            {!calibrating ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2"
                style={{ opacity: 1 - fade * 2 }}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">
                  Scroll to enter the gallery
                </p>
                <span className="text-white/60">↓</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <HeroArtworkDetail artwork={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
