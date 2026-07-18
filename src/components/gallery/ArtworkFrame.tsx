'use client';

import { useEffect, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalleryArtwork } from '@/lib/artworks/queries';
import type { Placement } from '@/lib/gallery/layout';

const MAX_EDGE = 3.4;
const FRAME_DEPTH = 0.09;
const FRAME_BORDER = 0.16;

type Props = {
  artwork: GalleryArtwork;
  placement: Placement;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

/**
 * A single hung piece: frame, canvas, and its own spotlight. Suspends on its
 * texture, so each artwork streams in independently rather than blocking the
 * whole room on the slowest image.
 */
export function ArtworkFrame({ artwork, placement, isSelected, onSelect }: Props) {
  const texture = useTexture(artwork.displayUrl);
  const [hovered, setHovered] = useState(false);
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  // Spotlights need an explicit target object in the scene graph.
  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // Derive the canvas size from the image's real aspect ratio so nothing stretches.
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const width = aspect >= 1 ? MAX_EDGE : MAX_EDGE * aspect;
  const height = aspect >= 1 ? MAX_EDGE / aspect : MAX_EDGE;

  useFrame((_, delta) => {
    if (!glowRef.current) return;
    const target = hovered || isSelected ? 0.32 : 0;
    // Frame-rate independent ease toward the target emissive level.
    glowRef.current.emissiveIntensity = THREE.MathUtils.damp(
      glowRef.current.emissiveIntensity,
      target,
      6,
      delta,
    );
  });

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      <object3D ref={targetRef} position={[0, 0, 0]} />

      <spotLight
        ref={spotRef}
        position={[0, height / 2 + 1.9, 2.1]}
        angle={0.62}
        penumbra={0.85}
        intensity={26}
        distance={11}
        color="#fff2dc"
        castShadow
        shadow-mapSize={[512, 512]}
      />

      {/* frame */}
      <mesh position={[0, 0, -FRAME_DEPTH / 2]} castShadow>
        <boxGeometry args={[width + FRAME_BORDER * 2, height + FRAME_BORDER * 2, FRAME_DEPTH]} />
        <meshStandardMaterial
          ref={glowRef}
          color="#2b2622"
          roughness={0.55}
          metalness={0.15}
          emissive="#e8c893"
          emissiveIntensity={0}
        />
      </mesh>

      {/* canvas */}
      <mesh
        position={[0, 0, 0.005]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(artwork.id);
        }}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.72} toneMapped={false} />
      </mesh>
    </group>
  );
}
