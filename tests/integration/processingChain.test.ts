import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { beltSystem } from '../../src/systems/beltSystem';
import { processorSystem } from '../../src/systems/processorSystem';
import { sellerSystem } from '../../src/systems/sellerSystem';
import { createEconomySystem } from '../../src/systems/economySystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

function createProcessingLoop() {
  const state = createInitialState(16, 10);
  state.unlocks.add('cutting_board');
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
  sellerSystem(state, TICK_DURATION_S, events);
  economySystem(state, events);
  events.flush();
  state.tick++;
}

describe('processing chain: source → belt → processor → belt → seller', () => {
  it('fishing boat → cutting board → fish market produces processed income', () => {
    const { state, events, economySystem } = createProcessingLoop();

    // Layout (rows 0-2 water, 3+ land):
    // Boat at (0,0) 2x2 water, output south at (0,2)
    // Cutting board at (3,3) 1x1 land, input west at (2,3), output east at (4,3)
    // Fish market at (6,4) 2x2 land, input north at (6,3)

    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(boat).not.toBeNull();

    const cutter = placeBuilding(state, 'cutting_board', { x: 3, y: 3 }, 0, events);
    expect(cutter).not.toBeNull();
    expect(cutter!.processor).toBeDefined();
    expect(cutter!.inventory).toBeDefined();

    const market = placeBuilding(state, 'fish_market', { x: 6, y: 4 }, 0, events);
    expect(market).not.toBeNull();

    // Belt 1: boat output (0,2) → south to (0,3) → east to (2,3) → cutter input
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'east');
    setBeltTile(state, { x: 1, y: 3 }, 'east');
    setBeltTile(state, { x: 2, y: 3 }, 'east');

    // Belt 2: cutter output (4,3) → east to (6,3) → market input (south into market)
    setBeltTile(state, { x: 4, y: 3 }, 'east');
    setBeltTile(state, { x: 5, y: 3 }, 'east');
    setBeltTile(state, { x: 6, y: 3 }, 'south');

    rebuildSegments(state);

    // Verify segments exist
    expect(state.segments.size).toBeGreaterThanOrEqual(1);

    // Run 1800 ticks (30 seconds) — enough for fish to be produced, processed, and sold
    for (let i = 0; i < 1800; i++) {
      runTick(state, events, economySystem);
    }

    // Should have earned money
    expect(state.funds).toBeGreaterThan(0);
    expect(state.stats.totalItemsSold).toBeGreaterThanOrEqual(1);
  });

  it('processor without output belt buffers items', () => {
    const { state, events, economySystem } = createProcessingLoop();

    // Boat at (0,0), cutting board at (3,3) with input belt but no output belt
    placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    const cutter = placeBuilding(state, 'cutting_board', { x: 3, y: 3 }, 0, events);
    expect(cutter).not.toBeNull();

    // Belt from boat output to cutting board input
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'east');
    setBeltTile(state, { x: 1, y: 3 }, 'east');
    setBeltTile(state, { x: 2, y: 3 }, 'east');

    rebuildSegments(state);

    // Run 900 ticks (15 seconds)
    for (let i = 0; i < 900; i++) {
      runTick(state, events, economySystem);
    }

    // Processor should have produced items stuck in the output buffer
    expect(cutter!.source!.outputBuffer.length).toBeGreaterThanOrEqual(1);
    expect(cutter!.source!.outputBuffer[0]).toBe('fish_cut');
  });
});
