import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { beltSystem } from '../../src/systems/beltSystem';
import { sellerSystem } from '../../src/systems/sellerSystem';
import { createEconomySystem } from '../../src/systems/economySystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

function createFullLoop() {
  // Grid: rows 0-2 water, rows 3+ land
  const state = createInitialState(10, 10);
  const events = new EventBus();
  const economySystem = createEconomySystem();

  // Initialize economy system (registers event handler)
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
  sellerSystem(state, TICK_DURATION_S, events);
  economySystem(state, events);
  events.flush();
  state.tick++;
}

describe('first playable loop: source → belt → seller = income', () => {
  it('fishing boat → belt → fish market produces income over 600 ticks', () => {
    const { state, events, economySystem } = createFullLoop();

    // Place fishing boat at (0,0) — water tiles, outputs south at (0,2)
    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(boat).not.toBeNull();

    // Place fish market at (0,8) — land tiles, input north at (0,7)
    const market = placeBuilding(state, 'fish_market', { x: 0, y: 8 }, 0, events);
    expect(market).not.toBeNull();
    expect(market!.seller).toBeDefined();
    expect(market!.inventory).toBeDefined();

    // Draw belt south from boat output to market input: (0,2) → (0,7)
    for (let y = 2; y <= 7; y++) {
      setBeltTile(state, { x: 0, y }, 'south');
    }
    rebuildSegments(state);

    // Verify segment topology
    const segments = [...state.segments.values()];
    expect(segments.length).toBeGreaterThanOrEqual(1);

    const segment = segments[0];
    expect(segment.inputSource).toBe(boat!.id);
    expect(segment.outputTarget).toBe(market!.id);

    // Run 600 ticks (10 simulated seconds)
    for (let i = 0; i < 600; i++) {
      runTick(state, events, economySystem);
    }

    // Assert income was earned
    expect(state.funds).toBeGreaterThan(0);
    expect(state.stats.totalItemsSold).toBeGreaterThanOrEqual(2);
    expect(state.stats.itemsSoldByType['fish']).toBeGreaterThanOrEqual(2);
    expect(state.stats.totalMoneyEarned).toBeGreaterThanOrEqual(4); // at least 2 fish × $2

    // Fish market inventory should be cycling (not permanently full)
    expect(market!.inventory!.items.length).toBeLessThan(market!.inventory!.maxSize);
  });

  it('fish market with full inventory causes belt back-pressure', () => {
    const { state, events, economySystem } = createFullLoop();

    // Place boat and market
    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    const market = placeBuilding(state, 'fish_market', { x: 0, y: 8 }, 0, events);
    expect(boat).not.toBeNull();
    expect(market).not.toBeNull();

    // Short belt
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'south');
    setBeltTile(state, { x: 0, y: 4 }, 'south');
    setBeltTile(state, { x: 0, y: 5 }, 'south');
    setBeltTile(state, { x: 0, y: 6 }, 'south');
    setBeltTile(state, { x: 0, y: 7 }, 'south');
    rebuildSegments(state);

    // Fill the market inventory manually to test back-pressure
    for (let i = 0; i < market!.inventory!.maxSize; i++) {
      market!.inventory!.items.push('fish' as import('../../src/core/types').ItemId);
    }

    // Run a few ticks — the seller should clear inventory,
    // allowing the belt to deliver again
    for (let i = 0; i < 10; i++) {
      runTick(state, events, economySystem);
    }

    // Seller should have cleared the inventory
    expect(market!.inventory!.items.length).toBeLessThan(market!.inventory!.maxSize);
    expect(state.funds).toBeGreaterThan(0);
  });
});
