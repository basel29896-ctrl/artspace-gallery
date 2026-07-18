export const ROOM_HALF = 10;
export const ROOM_HEIGHT = 8;
/** Eye height, and the vertical center every canvas is hung at. */
export const EYE_HEIGHT = 3.4;
/** Gap between the wall plane and the artwork, so frames never z-fight. */
const WALL_INSET = 0.12;

export type WallId = 'east' | 'north' | 'west';

export type Placement = {
  wall: WallId;
  /** World position of the artwork center. */
  position: [number, number, number];
  /** Y-rotation that turns the plane inward, toward the room center. */
  rotationY: number;
  /** Point the camera flies to when this artwork is selected. */
  viewpoint: [number, number, number];
};

/**
 * 3-4-3 across three walls, read left-to-right by a visitor who enters facing
 * north. The south wall is intentionally left bare — it is behind the entry
 * viewpoint, so hanging work there would be unreadable from the room center.
 */
const WALL_CAPACITY: Array<{ wall: WallId; count: number }> = [
  { wall: 'east', count: 3 },
  { wall: 'north', count: 4 },
  { wall: 'west', count: 3 },
];

/** How far in front of the wall the camera parks when zooming to a piece. */
const VIEW_DISTANCE = 5.5;

function spreadAlong(count: number, index: number) {
  // Evenly space `count` items across the usable wall span, centered on 0.
  const span = ROOM_HALF * 1.5;
  if (count === 1) return 0;
  const step = span / (count - 1);
  return -span / 2 + step * index;
}

function place(wall: WallId, count: number, index: number): Placement {
  const offset = spreadAlong(count, index);
  const inset = ROOM_HALF - WALL_INSET;

  switch (wall) {
    case 'north':
      return {
        wall,
        position: [offset, EYE_HEIGHT, -inset],
        rotationY: 0,
        viewpoint: [offset, EYE_HEIGHT, -inset + VIEW_DISTANCE],
      };
    case 'east':
      return {
        wall,
        position: [inset, EYE_HEIGHT, offset],
        rotationY: -Math.PI / 2,
        viewpoint: [inset - VIEW_DISTANCE, EYE_HEIGHT, offset],
      };
    case 'west':
      return {
        wall,
        position: [-inset, EYE_HEIGHT, offset],
        rotationY: Math.PI / 2,
        viewpoint: [-inset + VIEW_DISTANCE, EYE_HEIGHT, offset],
      };
  }
}

/** Deterministic wall assignment for up to 10 artworks. */
export function buildPlacements(count: number): Placement[] {
  const placements: Placement[] = [];
  let remaining = Math.min(count, 10);

  for (const { wall, count: capacity } of WALL_CAPACITY) {
    const onThisWall = Math.min(capacity, remaining);
    for (let i = 0; i < onThisWall; i += 1) {
      placements.push(place(wall, onThisWall, i));
    }
    remaining -= onThisWall;
    if (remaining <= 0) break;
  }

  return placements;
}
