// ---------------------------------------------------------------------------
// GameState interface and factory for Sushi Belt
// ---------------------------------------------------------------------------

import type {
  Direction,
  EntityId,
  GridCell,
  GridPosition,
  ItemId,
  SegmentId,
} from './types.ts';
import type { Entity } from './entity.ts';

// ---------------------------------------------------------------------------
// Belt‑related types
// ---------------------------------------------------------------------------

/** Per‑tile belt information stored in the belt grid. */
export type BeltTile = {
  direction: Direction;
  segmentId: SegmentId | null;
};

/** An item travelling along a belt segment. */
export type BeltItem = {
  itemId: ItemId;
  distanceToNext: number;
};

/** A contiguous run of belt tiles sharing the same direction. */
export type BeltSegment = {
  id: SegmentId;
  tiles: GridPosition[];
  direction: Direction;
  speed: number;
  items: BeltItem[];
  nextSegment: SegmentId | null;
  outputTarget: EntityId | null;
  inputSource: EntityId | null;
};

// ---------------------------------------------------------------------------
// GameState
// ---------------------------------------------------------------------------

export interface GameState {
  tick: number;
  funds: number;
  unlocks: Set<string>;
  entities: Map<EntityId, Entity>;
  grid: GridCell[][];
  beltGrid: Map<string, BeltTile>;
  segments: Map<SegmentId, BeltSegment>;
  upgrades: Record<string, number>;
  stats: {
    totalItemsSold: number;
    totalMoneyEarned: number;
    totalTicksPlayed: number;
    itemsSoldByType: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Belt grid helpers
// ---------------------------------------------------------------------------

/** Convert a grid position to a belt grid map key. */
export function beltKey(pos: GridPosition): string {
  return `${pos.x},${pos.y}`;
}

/** Get the belt tile at a position, or null if none exists. */
export function getBeltTile(state: GameState, pos: GridPosition): BeltTile | null {
  return state.beltGrid.get(beltKey(pos)) ?? null;
}

/** Set a belt tile at a position. */
export function setBeltTile(state: GameState, pos: GridPosition, direction: Direction): void {
  state.beltGrid.set(beltKey(pos), { direction, segmentId: null });
}

/** Remove the belt tile at a position. Returns true if a tile was removed. */
export function removeBeltTile(state: GameState, pos: GridPosition): boolean {
  return state.beltGrid.delete(beltKey(pos));
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh game state with an empty grid.
 * The top 3 rows are water; the remaining rows are land.
 */
export function createInitialState(
  gridWidth: number,
  gridHeight: number,
): GameState {
  const grid: GridCell[][] = [];

  for (let y = 0; y < gridHeight; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < gridWidth; x++) {
      row.push({
        terrain: y < 3 ? 'water' : 'land',
        entityId: null,
      });
    }
    grid.push(row);
  }

  return {
    tick: 0,
    funds: 0,
    unlocks: new Set<string>(),
    entities: new Map<EntityId, Entity>(),
    grid,
    beltGrid: new Map<string, BeltTile>(),
    segments: new Map<SegmentId, BeltSegment>(),
    upgrades: {},
    stats: {
      totalItemsSold: 0,
      totalMoneyEarned: 0,
      totalTicksPlayed: 0,
      itemsSoldByType: {},
    },
  };
}
