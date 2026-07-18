'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EYE_HEIGHT } from '@/lib/gallery/layout';

/**
 * Sweep limits, in radians of azimuth. 0 faces the north wall; negative swings
 * west, positive swings east. Stopping at ~±1.9rad covers all three hung walls
 * and deliberately never reaches the bare south wall, so there is no dead zone
 * at either end of the scroll.
 */
// The side walls sit at exactly ±pi/2 (±1.5708). Stopping a touch beyond them
// starts and ends the sweep square-on to a wall rather than staring into a
// corner, and still never reaches the bare south wall.
const AZIMUTH_MIN = -1.62;
const AZIMUTH_MAX = 1.62;

/** Camera sits just off dead-centre so the room reads with some depth. */
const CAMERA_ORIGIN = new THREE.Vector3(0, EYE_HEIGHT, 1.2);
const LOOK_DISTANCE = 14;

/** How far a pointer drag may nudge the view on top of the scroll position. */
const DRAG_AZIMUTH_CLAMP = 0.55;
const DRAG_PITCH_CLAMP = 0.28;

export type FocusTarget = {
  position: [number, number, number];
  target: [number, number, number];
} | null;

type Props = {
  /** Ref holding 0–1 scroll progress. A ref, not state — this updates every
   *  scroll event and must not re-render the React tree. */
  progressRef: React.MutableRefObject<number>;
  dragRef: React.MutableRefObject<{ azimuth: number; pitch: number }>;
  focus: FocusTarget;
};

export function CameraRig({ progressRef, dragRef, focus }: Props) {
  const { camera } = useThree();

  const lookAt = useRef(new THREE.Vector3(0, EYE_HEIGHT, -LOOK_DISTANCE));
  const desiredPos = useRef(new THREE.Vector3().copy(CAMERA_ORIGIN));
  const desiredLook = useRef(new THREE.Vector3(0, EYE_HEIGHT, -LOOK_DISTANCE));

  useEffect(() => {
    camera.position.copy(CAMERA_ORIGIN);
    camera.lookAt(lookAt.current);
  }, [camera]);

  useFrame((_, delta) => {
    if (focus) {
      desiredPos.current.set(...focus.position);
      desiredLook.current.set(...focus.target);
    } else {
      const progress = THREE.MathUtils.clamp(progressRef.current, 0, 1);
      const azimuth =
        THREE.MathUtils.lerp(AZIMUTH_MIN, AZIMUTH_MAX, progress) +
        THREE.MathUtils.clamp(dragRef.current.azimuth, -DRAG_AZIMUTH_CLAMP, DRAG_AZIMUTH_CLAMP);
      const pitch = THREE.MathUtils.clamp(
        dragRef.current.pitch,
        -DRAG_PITCH_CLAMP,
        DRAG_PITCH_CLAMP,
      );

      // Camera stays at the room's centre and looks outward, so walls are read
      // head-on. Orbiting around the centre instead would point the camera at
      // the middle of the room, leaving the art in the periphery.
      desiredPos.current.copy(CAMERA_ORIGIN);
      desiredLook.current.set(
        CAMERA_ORIGIN.x + Math.sin(azimuth) * LOOK_DISTANCE,
        EYE_HEIGHT + pitch * LOOK_DISTANCE * 0.5,
        CAMERA_ORIGIN.z - Math.cos(azimuth) * LOOK_DISTANCE,
      );
    }

    // Exponential damping: frame-rate independent, unlike a fixed-alpha lerp.
    const ease = 1 - Math.exp(-(focus ? 3.4 : 5.5) * delta);
    camera.position.lerp(desiredPos.current, ease);
    lookAt.current.lerp(desiredLook.current, ease);
    camera.lookAt(lookAt.current);
  });

  return null;
}
