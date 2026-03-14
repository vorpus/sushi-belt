import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding } from '../../src/systems/buildingPlacement';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { beltSystem } from '../../src/systems/beltSystem';
import { TICK_DURATION_S } from '../../src/core/gameLoop';
import type { ItemId } from '../../src/core/types';

function setupTunnel() {
  const state = createInitialState(16, 10);
  state.unlocks.add('tunnel');
  const events = new EventBus();

  // Tunnel entrance at (4,5), input west, output east
  const entrance = placeBuilding(state, 'tunnel', { x: 4, y: 5 }, 0, events);
  // Tunnel exit at (8,5), input west, output east
  const exit = placeBuilding(state, 'tunnel', { x: 8, y: 5 }, 0, events);

  // Pair them
  entrance!.tunnel!.pairedTunnelId = exit!.id;

  // Input belt: (2,5) east, (3,5) east → entrance input
  setBeltTile(state, { x: 2, y: 5 }, 'east');
  setBeltTile(state, { x: 3, y: 5 }, 'east');

  // Output belt from exit: (9,5) east, (10,5) east
  setBeltTile(state, { x: 9, y: 5 }, 'east');
  setBeltTile(state, { x: 10, y: 5 }, 'east');

  rebuildSegments(state);

  return { state, events, entrance: entrance!, exit: exit! };
}

describe('tunnel', () => {
  it('teleports items from entrance to exit output', () => {
    const { state, events } = setupTunnel();

    // Find input segment and add an item
    const inputSeg = [...state.segments.values()].find(
      s => s.direction === 'east' && s.tiles.some(t => t.x === 2),
    );
    expect(inputSeg).toBeDefined();
    inputSeg!.items.push({ itemId: 'fish' as ItemId, distanceToNext: 0 });

    // Run ticks for the item to transfer through the tunnel
    for (let i = 0; i < 120; i++) {
      beltSystem(state, TICK_DURATION_S, events);
    }

    // Find output segment (after exit)
    const outputSeg = [...state.segments.values()].find(
      s => s.direction === 'east' && s.tiles.some(t => t.x === 9),
    );
    expect(outputSeg).toBeDefined();
    expect(outputSeg!.items.length).toBeGreaterThanOrEqual(1);
    expect(outputSeg!.items[0].itemId).toBe('fish');
  });
});
