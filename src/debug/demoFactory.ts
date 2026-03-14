// ---------------------------------------------------------------------------
// Demo Factory — creates a pre-built factory state for testing/demo
// ---------------------------------------------------------------------------

import { createInitialState, setBeltTile } from '../core/state.ts';
import { EventBus } from '../core/eventBus.ts';
import { placeBuilding } from '../systems/buildingPlacement.ts';
import { rebuildSegments } from '../systems/segmentBuilder.ts';
import { BUILDINGS } from '../data/buildings.ts';
import type { GameState } from '../core/state.ts';

/**
 * Helper: place a belt path as a series of [x, y, direction] tuples.
 */
function belts(
  state: GameState,
  tiles: [number, number, 'north' | 'south' | 'east' | 'west'][],
): void {
  for (const [x, y, dir] of tiles) {
    setBeltTile(state, { x, y }, dir);
  }
}

/**
 * Create a demo GameState with a complex factory demonstrating all building types.
 *
 * Grid: 32x24, rows 0-2 water, rows 3+ land.
 *
 * FISH LINE (left side, flows right):
 *   Boat1(0,0) + Boat2(4,0) → Merger(2,4) → CuttingBoard(5,5) → Splitter(8,5)
 *     Splitter output A → FishMarket(11,3) (sells fish cuts)
 *     Splitter output B → NigiriPress(12,8) input 1
 *
 * RICE LINE (right side, flows left-down):
 *   RicePaddy(20,3) → RiceCooker(20,6) → belt → NigiriPress(12,8) input 2
 *
 * ASSEMBLY:
 *   NigiriPress(12,8) → SushiShop(16,8)
 */
export function createDemoState(gridWidth = 32, gridHeight = 24): {
  state: GameState;
  events: EventBus;
} {
  const state = createInitialState(gridWidth, gridHeight);
  const events = new EventBus();

  // Unlock everything
  for (const id of Object.keys(BUILDINGS)) {
    state.unlocks.add(id);
  }
  state.funds = 10000;

  // ── BUILDINGS ──

  // Fish sources
  placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);   // output south (0,2)
  placeBuilding(state, 'fishing_boat', { x: 4, y: 0 }, 0, events);   // output south (4,2)

  // Merger at (2,4) — inputs north(2,3) and south(2,5), output east(3,4)
  placeBuilding(state, 'merger', { x: 2, y: 4 }, 0, events);

  // Cutting board at (5,4) — input west(4,4), output east(6,4)
  placeBuilding(state, 'cutting_board', { x: 5, y: 4 }, 0, events);

  // Splitter at (8,4) — input west(7,4), outputs north(8,3) and south(8,5)
  placeBuilding(state, 'splitter', { x: 8, y: 4 }, 0, events);

  // Fish market at (11,3) — 2x2, input north at (11,2)... wait that's water.
  // Fish market at (11,5) — 2x2, input north at (11,4)
  placeBuilding(state, 'fish_market', { x: 11, y: 5 }, 0, events);

  // Nigiri press at (12,9) — 2x1, inputs north(12,8) and south(12,10), output east(14,9)
  placeBuilding(state, 'nigiri_press', { x: 12, y: 9 }, 0, events);

  // Rice source
  placeBuilding(state, 'rice_paddy', { x: 20, y: 3 }, 0, events);  // 2x2, output east at (22,3)

  // Rice cooker at (20,6) — input west(19,6), output east(21,6)
  placeBuilding(state, 'rice_cooker', { x: 20, y: 6 }, 0, events);

  // Sushi shop at (16,9) — input west(15,9)
  placeBuilding(state, 'sushi_shop', { x: 16, y: 9 }, 0, events);

  // ── BELTS ──

  // Boat1 (0,0) output at (0,2) → south → east → merger north input (2,3)
  belts(state, [
    [0, 2, 'east'],
    [1, 2, 'south'],
    [1, 3, 'east'],
    [2, 3, 'south'],  // feeds merger north input
  ]);

  // Boat2 (4,0) output at (4,2) → south → west → merger south input (2,5)
  belts(state, [
    [4, 2, 'south'],
    [4, 3, 'south'],
    [4, 4, 'south'],
    [4, 5, 'west'],
    [3, 5, 'west'],
    [2, 5, 'north'],  // feeds merger south input
  ]);

  // Merger output east (3,4) → cutting board input west (4,4)
  belts(state, [
    [3, 4, 'east'],
    [4, 4, 'east'],  // feeds cutting board
  ]);

  // Cutting board output east (6,4) → splitter input west (7,4)
  belts(state, [
    [6, 4, 'east'],
    [7, 4, 'east'],  // feeds splitter
  ]);

  // Splitter north output (8,3) → east → south → fish market input north (11,4)
  belts(state, [
    [8, 3, 'east'],
    [9, 3, 'east'],
    [10, 3, 'east'],
    [11, 3, 'south'],
    [11, 4, 'south'],  // feeds fish market north input
  ]);

  // Splitter south output (8,5) → south → east → nigiri press north input (12,8)
  belts(state, [
    [8, 5, 'south'],
    [8, 6, 'south'],
    [8, 7, 'south'],
    [8, 8, 'east'],
    [9, 8, 'east'],
    [10, 8, 'east'],
    [11, 8, 'east'],
    [12, 8, 'south'],  // feeds press north input
  ]);

  // Rice paddy output east (22,3) → south → west → rice cooker input west (19,6)
  belts(state, [
    [22, 3, 'south'],
    [22, 4, 'south'],
    [22, 5, 'south'],
    [22, 6, 'west'],
    [21, 6, 'west'],
    [19, 6, 'east'],  // wait, need to go west into cooker
  ]);
  // Fix: rice cooker at (20,6), input west at (19,6). Belt should arrive going east at (19,6)
  // The path from (22,6) west: (21,6)W, (20,6) is the cooker itself, (19,6) is the input point.
  // So belt at (19,6) needs to go east into the cooker. But (21,6)W → (20,6) is occupied by cooker.
  // Let me route differently: (22,6)W → belt goes west but (20,6) is cooker.
  // Route: (22,3)S → (22,6)W → (21,6)W → but 21,6 is west of 20,6 which is the cooker...
  // Wait, input west means connection point is at (19,6), which is one tile west of the building.
  // So belt at (19,6) going east would feed into the cooker.
  // Route: paddy output at (22,3), go south to (22,5), west to (19,5), south to (19,6) going east? No.
  // Simpler: go south to row 5, then west to x=19, then south one tile.

  // Let me redo rice belts properly
  state.beltGrid.delete('22,3');
  state.beltGrid.delete('22,4');
  state.beltGrid.delete('22,5');
  state.beltGrid.delete('22,6');
  state.beltGrid.delete('21,6');
  state.beltGrid.delete('19,6');

  belts(state, [
    [22, 3, 'south'],
    [22, 4, 'south'],
    [22, 5, 'west'],
    [21, 5, 'west'],
    [20, 5, 'west'],
    [19, 5, 'south'],
    [19, 6, 'east'],  // feeds rice cooker west input
  ]);

  // Rice cooker output east (21,6) → south → west → nigiri press south input (12,10)
  belts(state, [
    [21, 6, 'south'],
    [21, 7, 'south'],
    [21, 8, 'south'],
    [21, 9, 'south'],
    [21, 10, 'west'],
    [20, 10, 'west'],
    [19, 10, 'west'],
    [18, 10, 'west'],
    [17, 10, 'west'],
    [16, 10, 'west'],
    [15, 10, 'west'],
    [14, 10, 'west'],
    [13, 10, 'west'],
    [12, 10, 'north'],  // feeds press south input
  ]);

  // Nigiri press output east (14,9) → sushi shop input west (15,9)
  belts(state, [
    [14, 9, 'east'],
    [15, 9, 'east'],  // feeds sushi shop
  ]);

  rebuildSegments(state);

  return { state, events };
}
