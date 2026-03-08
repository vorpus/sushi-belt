// ---------------------------------------------------------------------------
// Core type definitions for Sushi Belt
// ---------------------------------------------------------------------------

/** A position on the game grid. */
export type GridPosition = { x: number; y: number };

/** Cardinal direction. */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** Branded‑style string aliases – kept as plain strings for simplicity. */
export type EntityId = string & { readonly __brand: 'EntityId' };
export type SegmentId = string & { readonly __brand: 'SegmentId' };
export type ItemId = string & { readonly __brand: 'ItemId' };

/** Terrain type for a grid cell. */
export type Terrain = 'water' | 'land';

/** A single cell in the game grid. */
export type GridCell = { terrain: Terrain; entityId: EntityId | null };

/** Width / height pair. */
export type Size = { w: number; h: number };

// ---------------------------------------------------------------------------
// Direction utility helpers
// ---------------------------------------------------------------------------

const OPPOSITE_MAP: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/** Return the direction opposite to `dir`. */
export function oppositeDirection(dir: Direction): Direction {
  return OPPOSITE_MAP[dir];
}

const DELTA_MAP: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/** Convert a direction to a grid delta ({ dx, dy }). */
export function directionToDelta(dir: Direction): { dx: number; dy: number } {
  return DELTA_MAP[dir];
}
