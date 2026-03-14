// ---------------------------------------------------------------------------
// Save/Load — serialize and deserialize game state
// ---------------------------------------------------------------------------

import type { GameState, BeltTile } from './state.ts';
import type { Entity } from './entity.ts';
import type { EntityId, ItemId } from './types.ts';
import { rebuildSegments } from '../systems/segmentBuilder.ts';
import { BUILDINGS } from '../data/buildings.ts';

const SAVE_KEY = 'sushi-belt-save';
const SAVE_VERSION = 1;

interface SerializedState {
  version: number;
  tick: number;
  funds: number;
  unlocks: string[];
  upgrades: Record<string, number>;
  stats: GameState['stats'];
  entities: SerializedEntity[];
  beltGrid: [string, BeltTile][];
  gridWidth: number;
  gridHeight: number;
}

interface SerializedEntity {
  id: string;
  position: { x: number; y: number };
  source?: Entity['source'];
  processor?: Entity['processor'];
  assembler?: {
    recipeId: string;
    progress: number;
    processing: boolean;
    inputSlots: [string, number][];
  };
  seller?: Entity['seller'];
  splitter?: Entity['splitter'];
  merger?: Entity['merger'];
  tunnel?: Entity['tunnel'];
  beltNode?: Entity['beltNode'];
  inventory?: Entity['inventory'];
  building?: Entity['building'];
}

/**
 * Serialize game state to a JSON-compatible object.
 */
export function serialize(state: GameState): string {
  const entities: SerializedEntity[] = [];

  for (const entity of state.entities.values()) {
    const se: SerializedEntity = {
      id: entity.id,
      position: entity.position,
    };

    if (entity.source) se.source = entity.source;
    if (entity.processor) se.processor = entity.processor;
    if (entity.assembler) {
      se.assembler = {
        recipeId: entity.assembler.recipeId,
        progress: entity.assembler.progress,
        processing: entity.assembler.processing,
        inputSlots: [...entity.assembler.inputSlots.entries()],
      };
    }
    if (entity.seller) se.seller = entity.seller;
    if (entity.splitter) se.splitter = entity.splitter;
    if (entity.merger) se.merger = entity.merger;
    if (entity.tunnel) se.tunnel = entity.tunnel;
    if (entity.beltNode) se.beltNode = entity.beltNode;
    if (entity.inventory) se.inventory = entity.inventory;
    if (entity.building) se.building = entity.building;

    entities.push(se);
  }

  const data: SerializedState = {
    version: SAVE_VERSION,
    tick: state.tick,
    funds: state.funds,
    unlocks: [...state.unlocks],
    upgrades: { ...state.upgrades },
    stats: { ...state.stats, itemsSoldByType: { ...state.stats.itemsSoldByType } },
    entities,
    beltGrid: [...state.beltGrid.entries()],
    gridWidth: state.grid[0]?.length ?? 0,
    gridHeight: state.grid.length,
  };

  return JSON.stringify(data);
}

/**
 * Deserialize a JSON string back into a GameState.
 * Reconstructs the grid from entity positions and rebuilds belt segments.
 */
export function deserialize(json: string): GameState {
  const data: SerializedState = JSON.parse(json);

  // Build grid
  const gridWidth = data.gridWidth;
  const gridHeight = data.gridHeight;
  const grid: GameState['grid'] = [];
  for (let y = 0; y < gridHeight; y++) {
    const row: GameState['grid'][0] = [];
    for (let x = 0; x < gridWidth; x++) {
      row.push({ terrain: y < 3 ? 'water' : 'land', entityId: null });
    }
    grid.push(row);
  }

  // Reconstruct entities
  const entities = new Map<EntityId, Entity>();
  for (const se of data.entities) {
    const entity: Entity = {
      id: se.id as EntityId,
      position: se.position,
    };

    if (se.source) entity.source = se.source;
    if (se.processor) entity.processor = se.processor;
    if (se.assembler) {
      entity.assembler = {
        recipeId: se.assembler.recipeId,
        progress: se.assembler.progress,
        processing: se.assembler.processing,
        inputSlots: new Map(se.assembler.inputSlots.map(([k, v]) => [k as ItemId, v])),
      };
    }
    if (se.seller) entity.seller = se.seller;
    if (se.splitter) entity.splitter = se.splitter;
    if (se.merger) entity.merger = se.merger;
    if (se.tunnel) entity.tunnel = se.tunnel;
    if (se.beltNode) entity.beltNode = se.beltNode;
    if (se.inventory) entity.inventory = se.inventory;
    if (se.building) entity.building = se.building;

    entities.set(entity.id, entity);

    // Mark grid cells as occupied
    if (entity.building) {
      const def = BUILDINGS[entity.building.buildingId as keyof typeof BUILDINGS];
      if (def) {
        for (let dy = 0; dy < def.size.h; dy++) {
          for (let dx = 0; dx < def.size.w; dx++) {
            const gy = entity.position.y + dy;
            const gx = entity.position.x + dx;
            if (grid[gy]?.[gx]) grid[gy][gx].entityId = entity.id;
          }
        }
      }
    }
  }

  // Reconstruct belt grid
  const beltGrid = new Map<string, BeltTile>();
  for (const [key, tile] of data.beltGrid) {
    beltGrid.set(key, { direction: tile.direction, segmentId: null });
  }

  const state: GameState = {
    tick: data.tick,
    funds: data.funds,
    unlocks: new Set(data.unlocks),
    entities,
    grid,
    beltGrid,
    segments: new Map(),
    upgrades: data.upgrades,
    stats: data.stats,
  };

  // Rebuild segments from belt grid
  rebuildSegments(state);

  return state;
}

/** Save state to localStorage. */
export function saveToStorage(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // localStorage might be full or unavailable
  }
}

/** Load state from localStorage. Returns null if no save exists. */
export function loadFromStorage(): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    return deserialize(json);
  } catch {
    return null;
  }
}

/** Clear saved state. */
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
