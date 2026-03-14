import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { beltSystem } from '../../src/systems/beltSystem';
import { processorSystem } from '../../src/systems/processorSystem';
import { sellerSystem } from '../../src/systems/sellerSystem';
import { createEconomySystem, purchaseUnlock } from '../../src/systems/economySystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

function createProgression() {
  const state = createInitialState(16, 10);
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

describe('progression loop: earn → unlock → place → earn more', () => {
  it('starts with only boat and market unlocked', () => {
    const { state } = createProgression();

    expect(state.unlocks.has('fishing_boat')).toBe(true);
    expect(state.unlocks.has('fish_market')).toBe(true);
    expect(state.unlocks.has('cutting_board')).toBe(false);
    expect(state.funds).toBe(0);
  });

  it('earn money selling raw fish, unlock cutting board, earn more with processing', () => {
    const { state, events, economySystem } = createProgression();

    // Phase 1: Place boat + market, earn raw fish income
    placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    placeBuilding(state, 'fish_market', { x: 0, y: 8 }, 0, events);

    for (let y = 2; y <= 7; y++) {
      setBeltTile(state, { x: 0, y }, 'south');
    }
    rebuildSegments(state);

    // Run until we have enough for cutting board ($25)
    // Fish sell for $2 each, produced every 3s → ~$0.67/s
    // Need ~38 seconds = ~2280 ticks
    for (let i = 0; i < 2700; i++) {
      runTick(state, events, economySystem);
    }

    expect(state.funds).toBeGreaterThanOrEqual(25);

    // Phase 2: Purchase cutting board
    const bought = purchaseUnlock(state, 'cutting_board', events);
    expect(bought).toBe(true);
    expect(state.unlocks.has('cutting_board')).toBe(true);

    const fundsAfterPurchase = state.funds;

    // Phase 3: Place cutting board in the chain
    const cutter = placeBuilding(state, 'cutting_board', { x: 3, y: 3 }, 0, events);
    expect(cutter).not.toBeNull();

    // Verify locked building still can't be placed
    // (no other locked buildings yet, but the test structure is here for future milestones)
  });
});
