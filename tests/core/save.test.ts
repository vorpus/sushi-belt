import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { serialize, deserialize } from '../../src/core/save';

describe('save/load', () => {
  it('round-trips a state with entities, belts, and progression', () => {
    const state = createInitialState(16, 10);
    const events = new EventBus();

    state.funds = 500;
    state.unlocks.add('cutting_board');
    state.stats.totalItemsSold = 42;
    state.stats.totalMoneyEarned = 200;
    state.upgrades['belt_speed'] = 2;

    placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    placeBuilding(state, 'fish_market', { x: 4, y: 4 }, 0, events);

    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'south');
    rebuildSegments(state);

    state.tick = 1000;

    // Serialize and deserialize
    const json = serialize(state);
    const loaded = deserialize(json);

    // Verify core state
    expect(loaded.tick).toBe(1000);
    expect(loaded.funds).toBe(500);
    expect(loaded.unlocks.has('cutting_board')).toBe(true);
    expect(loaded.unlocks.has('fishing_boat')).toBe(true);
    expect(loaded.stats.totalItemsSold).toBe(42);
    expect(loaded.upgrades['belt_speed']).toBe(2);

    // Verify entities
    expect(loaded.entities.size).toBe(2);

    // Verify belt grid
    expect(loaded.beltGrid.size).toBe(2);

    // Verify segments were rebuilt
    expect(loaded.segments.size).toBeGreaterThan(0);

    // Verify grid occupation
    expect(loaded.grid[0][0].entityId).not.toBeNull();
    expect(loaded.grid[4][4].entityId).not.toBeNull();
  });

  it('handles empty state', () => {
    const state = createInitialState(10, 10);
    const json = serialize(state);
    const loaded = deserialize(json);

    expect(loaded.tick).toBe(0);
    expect(loaded.funds).toBe(0);
    expect(loaded.entities.size).toBe(0);
    expect(loaded.beltGrid.size).toBe(0);
  });
});
