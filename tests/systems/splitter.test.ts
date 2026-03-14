import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { beltSystem } from '../../src/systems/beltSystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';
import type { ItemId } from '../../src/core/types';

function setupSplitter() {
  const state = createInitialState(12, 10);
  state.unlocks.add('splitter');
  const events = new EventBus();

  // Splitter at (5,5), input west, outputs north and south
  const splitter = placeBuilding(state, 'splitter', { x: 5, y: 5 }, 0, events);

  // Input belt: (3,5) east, (4,5) east → splitter input
  setBeltTile(state, { x: 3, y: 5 }, 'east');
  setBeltTile(state, { x: 4, y: 5 }, 'east');

  // Output A (north): (5,4) north, (5,3) north
  setBeltTile(state, { x: 5, y: 4 }, 'north');
  setBeltTile(state, { x: 5, y: 3 }, 'north');

  // Output B (south): (5,6) south, (5,7) south
  setBeltTile(state, { x: 5, y: 6 }, 'south');
  setBeltTile(state, { x: 5, y: 7 }, 'south');

  rebuildSegments(state);

  return { state, events, splitter: splitter! };
}

describe('splitter', () => {
  it('round-robins items between two outputs', () => {
    const { state, events } = setupSplitter();

    // Find input segment and manually add items
    const inputSeg = [...state.segments.values()].find(s => s.direction === 'east');
    expect(inputSeg).toBeDefined();

    // Add 4 items to the input
    for (let i = 0; i < 4; i++) {
      inputSeg!.items.push({ itemId: 'fish' as ItemId, distanceToNext: 0 });
    }

    // Run enough ticks for items to transfer through
    for (let i = 0; i < 120; i++) {
      beltSystem(state, TICK_DURATION_S, events);
    }

    // Find output segments
    const northSeg = [...state.segments.values()].find(
      s => s.direction === 'north' && s.tiles.length > 0,
    );
    const southSeg = [...state.segments.values()].find(
      s => s.direction === 'south' && s.tiles.length > 0,
    );

    const northItems = northSeg?.items.length ?? 0;
    const southItems = southSeg?.items.length ?? 0;

    // Items should be roughly split between the two outputs
    expect(northItems + southItems).toBeGreaterThanOrEqual(2);
    expect(northItems).toBeGreaterThanOrEqual(1);
    expect(southItems).toBeGreaterThanOrEqual(1);
  });
});
