'use client';

import { ROOM_HALF, ROOM_HEIGHT } from '@/lib/gallery/layout';

const SIZE = ROOM_HALF * 2;

/**
 * Shell of the gallery. Walls face inward (BackSide on a box would also work,
 * but separate planes let each surface take its own material response).
 */
export function Room() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#c9bfb2" roughness={0.85} metalness={0} />
      </mesh>

      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#f3efe8" roughness={1} />
      </mesh>

      {/* north */}
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_HALF]} receiveShadow>
        <planeGeometry args={[SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#efeae1" roughness={0.95} />
      </mesh>

      {/* south (behind the entry viewpoint) */}
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_HALF]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#e9e3d9" roughness={0.95} />
      </mesh>

      {/* east */}
      <mesh position={[ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#ece6dd" roughness={0.95} />
      </mesh>

      {/* west */}
      <mesh position={[-ROOM_HALF, ROOM_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[SIZE, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#ece6dd" roughness={0.95} />
      </mesh>
    </group>
  );
}
