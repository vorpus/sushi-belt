import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import type { BeltSegment } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { beltSystem } from '../../src/systems/beltSystem';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import type { ItemId, SegmentId } from '../../src/core/types';
import { TICK_DURATION_S } from '../../src/core/gameLoop';

describe('beltSystem', () => {
  it('single segment with one item: item advances each tick', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Create a 5-tile east belt on land
    for (let x = 0; x < 5; x++) {
      setBeltTile(state, { x, y: 4 }, 'east');
    }
    rebuildSegments(state);

    const segment = [...state.segments.values()][0];
    // Place an item at the tail (distance from end = segment length - 1 = 4)
    segment.items.push({
      itemId: 'fish' as ItemId,
      distanceToNext: 4,
    });

    const initialDist = segment.items[0].distanceToNext;
    beltSystem(state, TICK_DURATION_S, events);

    // Item should have advanced by speed * dt
    expect(segment.items[0].distanceToNext).toBeLessThan(initialDist);
    expect(segment.items[0].distanceToNext).toBeCloseTo(
      initialDist - segment.speed * TICK_DURATION_S,
    );
  });

  it('item reaches segment end with no next: item stops at 0', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');
    rebuildSegments(state);

    const segment = [...state.segments.values()][0];
    // Place item very close to the end
    segment.items.push({
      itemId: 'fish' as ItemId,
      distanceToNext: 0.01,
    });

    // Run many ticks
    for (let i = 0; i < 60; i++) {
      beltSystem(state, TICK_DURATION_S, events);
    }

    // Item should be at 0, not negative
    expect(segment.items[0].distanceToNext).toBe(0);
    // Item should still be in the segment (no transfer target)
    expect(segment.items).toHaveLength(1);
  });

  it('two connected segments: item transfers from first to second', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // First segment: east
    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');
    // Second segment: south (direction change)
    setBeltTile(state, { x: 2, y: 4 }, 'south');
    setBeltTile(state, { x: 2, y: 5 }, 'south');

    rebuildSegments(state);

    const segments = [...state.segments.values()];
    const eastSeg = segments.find((s) => s.direction === 'east')!;
    const southSeg = segments.find((s) => s.direction === 'south')!;

    // Place item at front of east segment (distanceToNext = 0, at end)
    eastSeg.items.push({
      itemId: 'fish' as ItemId,
      distanceToNext: 0,
    });

    expect(eastSeg.nextSegment).toBe(southSeg.id);

    beltSystem(state, TICK_DURATION_S, events);

    // Item should have transferred to south segment
    expect(eastSeg.items).toHaveLength(0);
    expect(southSeg.items).toHaveLength(1);
    expect(southSeg.items[0].itemId).toBe('fish');
  });

  it('back-pressure: full segment blocks upstream items', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Two connected segments
    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');
    setBeltTile(state, { x: 2, y: 4 }, 'south');

    rebuildSegments(state);

    const segments = [...state.segments.values()];
    const eastSeg = segments.find((s) => s.direction === 'east')!;
    const southSeg = segments.find((s) => s.direction === 'south')!;

    // Fill the south segment (1 tile, 1 item at end)
    southSeg.items.push({
      itemId: 'fish' as ItemId,
      distanceToNext: 0,
    });

    // Put item at end of east segment
    eastSeg.items.push({
      itemId: 'fish' as ItemId,
      distanceToNext: 0,
    });

    beltSystem(state, TICK_DURATION_S, events);

    // Item should NOT transfer — south segment is full
    expect(eastSeg.items).toHaveLength(1);
    expect(southSeg.items).toHaveLength(1);
  });
});
