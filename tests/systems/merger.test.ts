import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { beltSystem } from '../../src/systems/beltSystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';
import type { ItemId } from '../../src/core/types';

function setupMerger() {
  const state = createInitialState(12, 12);
  state.unlocks.add('merger');
  const events = new EventBus();

  // Merger at (5,5), inputs north and south, output east
  const merger = placeBuilding(state, 'merger', { x: 5, y: 5 }, 0, events);

  // Input A (north): (5,3) south, (5,4) south → merger north input
  setBeltTile(state, { x: 5, y: 3 }, 'south');
  setBeltTile(state, { x: 5, y: 4 }, 'south');

  // Input B (south): (5,7) north, (5,6) north → merger south input
  setBeltTile(state, { x: 5, y: 7 }, 'north');
  setBeltTile(state, { x: 5, y: 6 }, 'north');

  // Output (east): (6,5) east, (7,5) east
  setBeltTile(state, { x: 6, y: 5 }, 'east');
  setBeltTile(state, { x: 7, y: 5 }, 'east');

  rebuildSegments(state);

  return { state, events, merger: merger! };
}

describe('merger', () => {
  it('merges items from two inputs onto one output', () => {
    const { state, events } = setupMerger();

    // Find input segments and add items
    const southSegs = [...state.segments.values()].filter(s => s.direction === 'south');
    const northSegs = [...state.segments.values()].filter(s => s.direction === 'north');

    // Add items to both inputs
    for (const seg of southSegs) {
      seg.items.push({ itemId: 'fish' as ItemId, distanceToNext: 0 });
      seg.items.push({ itemId: 'fish' as ItemId, distanceToNext: 1 });
    }
    for (const seg of northSegs) {
      seg.items.push({ itemId: 'rice' as ItemId, distanceToNext: 0 });
      seg.items.push({ itemId: 'rice' as ItemId, distanceToNext: 1 });
    }

    // Run enough ticks for merger to pull items
    for (let i = 0; i < 120; i++) {
      beltSystem(state, TICK_DURATION_S, events);
    }

    // Find output segment
    const outputSeg = [...state.segments.values()].find(s => s.direction === 'east');
    expect(outputSeg).toBeDefined();

    // Should have items from both inputs on the output
    const fishCount = outputSeg!.items.filter(i => i.itemId === 'fish').length;
    const riceCount = outputSeg!.items.filter(i => i.itemId === 'rice').length;

    expect(fishCount).toBeGreaterThanOrEqual(1);
    expect(riceCount).toBeGreaterThanOrEqual(1);
  });
});
