import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { beltSystem } from '../../src/systems/beltSystem';
import { processorSystem } from '../../src/systems/processorSystem';
import { assemblerSystem } from '../../src/systems/assemblerSystem';
import { sellerSystem } from '../../src/systems/sellerSystem';
import { createEconomySystem } from '../../src/systems/economySystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

function createNigiriLoop() {
  const state = createInitialState(20, 16);
  // Unlock all buildings needed
  state.unlocks.add('cutting_board');
  state.unlocks.add('rice_paddy');
  state.unlocks.add('rice_cooker');
  state.unlocks.add('nigiri_press');
  state.unlocks.add('sushi_shop');
  const events = new EventBus();
  const economySystem = createEconomySystem();
  economySystem(state, events);
  return { state, events, economySystem };
}

function runTick(
  state: ReturnType<typeof createInitialState>,
  events: EventBus,
  economySystem: (state: ReturnType<typeof createInitialState>, events: EventBus) => void,
) {
  sourceSystem(state, TICK_DURATION_S, events);
  beltSystem(state, TICK_DURATION_S, events);
  processorSystem(state, TICK_DURATION_S, events);
  assemblerSystem(state, TICK_DURATION_S, events);
  sellerSystem(state, TICK_DURATION_S, events);
  economySystem(state, events);
  events.flush();
  state.tick++;
}

describe('nigiri production chain', () => {
  it('full chain: boat → cutter → press ← cooker ← paddy → shop produces nigiri income', () => {
    const { state, events, economySystem } = createNigiriLoop();

    // Layout (rows 0-2 water, 3+ land):
    //
    // Fish line:  Boat(0,0) → belt south → CuttingBoard(3,4) → belt east
    // Rice line:  RicePaddy(8,3) → belt east → RiceCooker(12,4) → belt south
    // Assembly:   NigiriPress(5,6) inputs from north and south
    // Selling:    SushiShop(9,6)
    //
    // Fish path: boat output (0,2) south → (0,4) east → cutter input (2,4)
    //            cutter output (4,4) south → (4,6) → press input north (5,5)?
    //
    // Let me design carefully:
    // Nigiri press at (5,6), size 2x1, inputs north offset 0 and south offset 0
    // North input connection at (5, 5), south input connection at (5, 7)
    // Output east at (7, 6)

    // Fish line:
    // Boat at (0,0), output south at (0,2)
    placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    // Cutting board at (3,4), input west at (2,4), output east at (4,4)
    placeBuilding(state, 'cutting_board', { x: 3, y: 4 }, 0, events);
    // Belt: (0,2) south to (0,4), then east to (2,4)
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'south');
    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');
    setBeltTile(state, { x: 2, y: 4 }, 'east');
    // Belt from cutter output (4,4) → south to (4,5) → (5,5) south = press north input
    setBeltTile(state, { x: 4, y: 4 }, 'south');
    setBeltTile(state, { x: 4, y: 5 }, 'east');
    setBeltTile(state, { x: 5, y: 5 }, 'south');

    // Rice line:
    // Rice paddy at (8,3), 2x2 land, output east at (10,3)
    placeBuilding(state, 'rice_paddy', { x: 8, y: 3 }, 0, events);
    // Rice cooker at (12,4), input west at (11,4), output east at (13,4)
    placeBuilding(state, 'rice_cooker', { x: 12, y: 4 }, 0, events);
    // Belt: paddy output (10,3) east to (11,3) south to (11,4) = cooker input
    setBeltTile(state, { x: 10, y: 3 }, 'south');
    setBeltTile(state, { x: 10, y: 4 }, 'east');
    setBeltTile(state, { x: 11, y: 4 }, 'east');
    // Belt from cooker output (13,4) south to (13,7) west to (5,7) = press south input
    setBeltTile(state, { x: 13, y: 4 }, 'south');
    setBeltTile(state, { x: 13, y: 5 }, 'south');
    setBeltTile(state, { x: 13, y: 6 }, 'south');
    setBeltTile(state, { x: 13, y: 7 }, 'west');
    for (let x = 12; x >= 5; x--) {
      setBeltTile(state, { x, y: 7 }, 'west');
    }
    // Final tile going north into press south input
    setBeltTile(state, { x: 5, y: 7 }, 'north');

    // Nigiri press at (5,6), size 2x1
    placeBuilding(state, 'nigiri_press', { x: 5, y: 6 }, 0, events);

    // Sushi shop at (9,6), input west at (8,6)
    placeBuilding(state, 'sushi_shop', { x: 9, y: 6 }, 0, events);
    // Belt from press output (7,6) east to (8,6) = shop input
    setBeltTile(state, { x: 7, y: 6 }, 'east');
    setBeltTile(state, { x: 8, y: 6 }, 'east');

    rebuildSegments(state);

    // Verify segments exist
    expect(state.segments.size).toBeGreaterThanOrEqual(3);

    // Run 3600 ticks (60 seconds)
    for (let i = 0; i < 3600; i++) {
      runTick(state, events, economySystem);
    }

    // Should have sold nigiri
    expect(state.funds).toBeGreaterThan(0);
    expect(state.stats.totalItemsSold).toBeGreaterThanOrEqual(1);
  });
});
