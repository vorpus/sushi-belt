// ---------------------------------------------------------------------------
// State Inspection API — pure functions for debugging and AI querying
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
// Building inspection uses entity.building.buildingId directly

export interface InspectionReport {
  tick: number;
  funds: number;
  entityCount: number;
  segmentCount: number;
  totalItemsOnBelts: number;
  unlocks: string[];
  upgrades: Record<string, number>;
  stats: GameState['stats'];
  buildings: { id: string; type: string; position: { x: number; y: number } }[];
  segments: { id: string; direction: string; tileCount: number; itemCount: number }[];
}

/** Get a full inspection report of the game state. */
export function inspectState(state: GameState): InspectionReport {
  let totalItemsOnBelts = 0;
  const segments: InspectionReport['segments'] = [];
  for (const seg of state.segments.values()) {
    totalItemsOnBelts += seg.items.length;
    segments.push({
      id: seg.id,
      direction: seg.direction,
      tileCount: seg.tiles.length,
      itemCount: seg.items.length,
    });
  }

  const buildings: InspectionReport['buildings'] = [];
  for (const entity of state.entities.values()) {
    if (entity.building) {
      buildings.push({
        id: entity.id,
        type: entity.building.buildingId,
        position: entity.position,
      });
    }
  }

  return {
    tick: state.tick,
    funds: state.funds,
    entityCount: state.entities.size,
    segmentCount: state.segments.size,
    totalItemsOnBelts,
    unlocks: [...state.unlocks],
    upgrades: { ...state.upgrades },
    stats: { ...state.stats },
    buildings,
    segments,
  };
}

/** Render a simple ASCII grid of the game state. */
export function dumpGrid(state: GameState): string {
  const BELT_CHARS: Record<string, string> = {
    north: '^', south: 'v', east: '>', west: '<',
  };
  const BUILDING_ABBREV: Record<string, string> = {
    fishing_boat: 'BB', fish_market: 'FM', cutting_board: 'CB',
    rice_paddy: 'RP', rice_cooker: 'RC', nigiri_press: 'NP',
    sushi_shop: 'SS', splitter: 'SP', merger: 'MG', tunnel: 'TN',
    seaweed_farm: 'SF', garden_plot: 'GP', seasoning_station: 'SN',
    pickling_barrel: 'PB', maki_roller: 'MR', gunkan_wrapper: 'GW',
    veggie_roll_station: 'VR', temaki_station: 'TM',
  };

  const rows: string[] = [];
  for (let y = 0; y < state.grid.length; y++) {
    let row = '';
    for (let x = 0; x < state.grid[y].length; x++) {
      const cell = state.grid[y][x];
      const beltTile = state.beltGrid.get(`${x},${y}`);

      if (cell.entityId) {
        const entity = state.entities.get(cell.entityId);
        if (entity?.building) {
          // Only show abbreviation at top-left of building
          if (entity.position.x === x && entity.position.y === y) {
            row += BUILDING_ABBREV[entity.building.buildingId] ?? '??';
          } else {
            row += '##';
          }
        } else {
          row += '??';
        }
      } else if (beltTile) {
        row += BELT_CHARS[beltTile.direction] + ' ';
      } else {
        row += cell.terrain === 'water' ? '~ ' : '. ';
      }
    }
    rows.push(row);
  }
  return rows.join('\n');
}
