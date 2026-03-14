// ---------------------------------------------------------------------------
// Building definitions for Sushi Belt
// ---------------------------------------------------------------------------

import type { Direction } from '../core/types.ts';
import type { DataItemId } from './items.ts';

/** A connection point on a building. */
export interface BuildingConnectionPoint {
  side: Direction;
  offset: number;
}

/** Shape of a single building definition. */
export interface BuildingDefinition {
  id: string;
  name: string;
  size: { w: number; h: number };
  cost: number;
  terrain: 'water' | 'land';
  components: {
    source?: { produces: DataItemId; interval: number };
    processor?: { recipeId: string };
    assembler?: { recipeId: string };
    seller?: { acceptsCategories: string[] };
  };
  connectionPoints: {
    inputs?: BuildingConnectionPoint[];
    outputs?: BuildingConnectionPoint[];
  };
  unlockCost: number;
  sprite: string;
}

export const BUILDINGS = {
  fishing_boat: {
    id: 'fishing_boat',
    name: 'Fishing Boat',
    size: { w: 2, h: 2 },
    cost: 0,
    terrain: 'water',
    components: { source: { produces: 'fish', interval: 3.0 } },
    connectionPoints: { outputs: [{ side: 'south', offset: 0 }] },
    unlockCost: 0,
    sprite: 'building_fishing_boat',
  },
  fish_market: {
    id: 'fish_market',
    name: 'Fish Market',
    size: { w: 2, h: 2 },
    cost: 0,
    terrain: 'land',
    components: { seller: { acceptsCategories: ['raw', 'processed', 'sushi'] } },
    connectionPoints: { inputs: [{ side: 'north', offset: 0 }] },
    unlockCost: 0,
    sprite: 'building_fish_market',
  },
  cutting_board: {
    id: 'cutting_board',
    name: 'Cutting Board',
    size: { w: 1, h: 1 },
    cost: 0,
    terrain: 'land',
    components: { processor: { recipeId: 'cut_fish' } },
    connectionPoints: {
      inputs: [{ side: 'west', offset: 0 }],
      outputs: [{ side: 'east', offset: 0 }],
    },
    unlockCost: 25,
    sprite: 'building_cutting_board',
  },
} as const satisfies Record<string, BuildingDefinition>;

export type BuildingId = keyof typeof BUILDINGS;
