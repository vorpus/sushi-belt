import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { sourceSystem } from '../../src/systems/sourceSystem';
import { beltSystem } from '../../src/systems/beltSystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

function runTick(state: ReturnType<typeof createInitialState>, events: EventBus) {
  sourceSystem(state, TICK_DURATION_S, events);
  beltSystem(state, TICK_DURATION_S, events);
  events.flush();
  state.tick++;
}

describe('belt flow integration', () => {
  it('fishing boat produces fish that flows onto a belt', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Place fishing boat at (0,0) — outputs south at (0,2)
    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(boat).not.toBeNull();

    // Place belt at the output point going south
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'south');
    setBeltTile(state, { x: 0, y: 4 }, 'south');
    rebuildSegments(state);

    // Verify segment is connected to boat
    const segment = [...state.segments.values()][0];
    expect(segment.inputSource).toBe(boat!.id);

    // Run 180 ticks (3 seconds) — boat should produce a fish
    for (let i = 0; i < 180; i++) {
      runTick(state, events);
    }

    // Fish should be on the belt, not in the output buffer
    expect(boat!.source!.outputBuffer).toHaveLength(0);
    expect(segment.items.length).toBeGreaterThanOrEqual(1);
    expect(segment.items[segment.items.length - 1].itemId).toBe('fish');
  });

  it('items move along belt and stop at the end (back-pressure)', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Place fishing boat
    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(boat).not.toBeNull();

    // Short belt (3 tiles)
    setBeltTile(state, { x: 0, y: 2 }, 'south');
    setBeltTile(state, { x: 0, y: 3 }, 'south');
    setBeltTile(state, { x: 0, y: 4 }, 'south');
    rebuildSegments(state);

    // Run 600 ticks (10 seconds) — should produce items and they back up
    for (let i = 0; i < 600; i++) {
      runTick(state, events);
    }

    const segment = [...state.segments.values()][0];
    // Should have items on belt and/or backed up in buffer
    const totalItems = segment.items.length + boat!.source!.outputBuffer.length;
    expect(totalItems).toBeGreaterThanOrEqual(2); // At least 2 fish produced in 10s

    // Front item should be at end (distanceToNext = 0)
    if (segment.items.length > 0) {
      expect(segment.items[0].distanceToNext).toBe(0);
    }
  });
});
