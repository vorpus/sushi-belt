import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

describe('sourceSystem', () => {
  it('fishing boat produces a fish after 3 seconds (180 ticks)', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Place a fishing boat on water (top-left corner, row 0-1 are water)
    const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(entity).not.toBeNull();
    expect(entity!.source).toBeDefined();
    expect(entity!.source!.outputBuffer).toEqual([]);

    // Run 179 ticks — should not produce yet
    for (let i = 0; i < 179; i++) {
      sourceSystem(state, TICK_DURATION_S, events);
    }
    expect(entity!.source!.outputBuffer).toEqual([]);

    // Run 1 more tick (180 total = 3 seconds at 60Hz) — should produce a fish
    sourceSystem(state, TICK_DURATION_S, events);
    expect(entity!.source!.outputBuffer).toEqual(['fish']);
  });

  it('produces multiple items over time', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(entity).not.toBeNull();

    // Run 360 ticks (6 seconds) — should produce 2 fish
    for (let i = 0; i < 360; i++) {
      sourceSystem(state, TICK_DURATION_S, events);
    }
    expect(entity!.source!.outputBuffer).toHaveLength(2);
  });

  it('emits itemProduced event when producing', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(entity).not.toBeNull();

    const produced: { itemId: string; sourceId: string }[] = [];
    events.on('itemProduced', (payload) => produced.push(payload));

    // Run 180 ticks
    for (let i = 0; i < 180; i++) {
      sourceSystem(state, TICK_DURATION_S, events);
      events.flush();
    }

    expect(produced).toHaveLength(1);
    expect(produced[0].itemId).toBe('fish');
    expect(produced[0].sourceId).toBe(entity!.id);
  });

  it('skips entities without source component', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Place a fish market (has seller, not source) on land
    const entity = placeBuilding(state, 'fish_market', { x: 0, y: 3 }, 0, events);
    expect(entity).not.toBeNull();
    expect(entity!.source).toBeUndefined();

    // Should not throw or produce anything
    for (let i = 0; i < 180; i++) {
      sourceSystem(state, TICK_DURATION_S, events);
    }
  });
});
