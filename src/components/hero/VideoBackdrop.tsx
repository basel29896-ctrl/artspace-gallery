'use client';

import { useEffect, useRef, useState } from 'react';

const XFADE = 0.5; // seconds of overlap to hide the imperfect AI loop seam

type Props = {
  desktopSrc: string;
  mobileSrc: string;
  poster: string;
  mobile: boolean;
  /** Reduced-motion or a failed load: show the poster still, no video. */
  still: boolean;
  /** Calibration mode pauses playback so corners can be dragged on a frozen frame. */
  paused: boolean;
  onFail: () => void;
};

/**
 * Two stacked, muted, looping-by-hand videos. As the front clip nears its end we
 * start the back clip from zero and cross-fade over 0.5s, so the visible seam of
 * the (imperfectly looping) AI video is hidden. The second element is created
 * lazily, only once the first is actually playing.
 */
export function VideoBackdrop({ desktopSrc, mobileSrc, poster, mobile, still, paused, onFail }: Props) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<'a' | 'b'>('a');
  const [bReady, setBReady] = useState(false); // lazy-init the 2nd video
  const [backVisible, setBackVisible] = useState(false);
  const crossing = useRef(false);

  const src = mobile ? mobileSrc : desktopSrc;

  // Pause/resume for calibration.
  useEffect(() => {
    for (const v of [aRef.current, bRef.current]) {
      if (!v) continue;
      if (paused) v.pause();
      else v.play().catch(() => {});
    }
  }, [paused, bReady]);

  if (still) {
    // eslint-disable-next-line @next/next/no-img-element -- full-bleed backdrop, no optimiser
    return <img src={poster} alt="" className="h-full w-full object-fill" draggable={false} />;
  }

  const onTimeUpdate = (which: 'a' | 'b') => {
    if (paused || crossing.current || which !== front || !bReady) return;
    const f = which === 'a' ? aRef.current : bRef.current;
    const b = which === 'a' ? bRef.current : aRef.current;
    if (!f || !b || !f.duration) return;
    if (f.duration - f.currentTime > XFADE) return;

    crossing.current = true;
    b.currentTime = 0;
    b.play().catch(() => {});
    setBackVisible(true);
    window.setTimeout(() => {
      f.pause();
      f.currentTime = 0;
      setFront(which === 'a' ? 'b' : 'a');
      setBackVisible(false);
      crossing.current = false;
    }, XFADE * 1000);
  };

  const style = (which: 'a' | 'b') => ({
    opacity: which === front || backVisible ? 1 : 0,
    transition: `opacity ${XFADE}s linear`,
  });

  return (
    <>
      <video
        ref={aRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        playsInline
        loop={!bReady}
        preload="auto"
        onPlaying={() => setBReady(true)}
        onEnded={(e) => {
          // Safety net if a crossfade did not fire (e.g. B not ready yet).
          const v = e.currentTarget;
          v.currentTime = 0;
          v.play().catch(() => {});
        }}
        onTimeUpdate={() => onTimeUpdate('a')}
        onError={onFail}
        className="absolute inset-0 h-full w-full object-fill"
        style={style('a')}
      />
      {bReady ? (
        <video
          ref={bRef}
          src={src}
          muted
          playsInline
          preload="auto"
          onEnded={(e) => {
            const v = e.currentTarget;
            v.currentTime = 0;
            v.play().catch(() => {});
          }}
          onTimeUpdate={() => onTimeUpdate('b')}
          className="absolute inset-0 h-full w-full object-fill"
          style={style('b')}
        />
      ) : null}
    </>
  );
}
