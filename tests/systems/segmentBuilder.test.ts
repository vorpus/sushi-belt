import { describe, it, expect } from 'vitest';
import { createInitialState, setBeltTile } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { rebuildSegments } from '../../src/systems/segmentBuilder';
import { placeBuilding } from '../../src/systems/buildingPlacement';

describe('segmentBuilder', () => {
  it('straight line of 5 belts → 1 segment with 5 tiles', () => {
    const state = createInitialState(10, 10);

    // Place 5 east-facing belts on land (row 3+)
    for (let x = 0; x < 5; x++) {
      setBeltTile(state, { x, y: 4 }, 'east');
    }

    rebuildSegments(state);

    expect(state.segments.size).toBe(1);
    const segment = [...state.segments.values()][0];
    expect(segment.tiles).toHaveLength(5);
    expect(segment.direction).toBe('east');
    // Tiles should be ordered from start to end (west to east)
    expect(segment.tiles[0].x).toBeLessThan(segment.tiles[4].x);
  });

  it('L-shaped belt path → 2 segments (direction change)', () => {
    const state = createInitialState(10, 10);

    // 3 east-facing, then 3 south-facing
    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');
    setBeltTile(state, { x: 2, y: 4 }, 'east');
    setBeltTile(state, { x: 3, y: 4 }, 'south');
    setBeltTile(state, { x: 3, y: 5 }, 'south');
    setBeltTile(state, { x: 3, y: 6 }, 'south');

    rebuildSegments(state);

    expect(state.segments.size).toBe(2);
    const segments = [...state.segments.values()];
    const eastSeg = segments.find((s) => s.direction === 'east');
    const southSeg = segments.find((s) => s.direction === 'south');
    expect(eastSeg).toBeDefined();
    expect(southSeg).toBeDefined();
    expect(eastSeg!.tiles).toHaveLength(3);
    expect(southSeg!.tiles).toHaveLength(3);

    // East segment should link to south segment
    expect(eastSeg!.nextSegment).toBe(southSeg!.id);
  });

  it('belt ending at a building input → segment.outputTarget set', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Fish market at (2, 3) on land, has input on north side offset 0
    // That means the input connection point is at grid (2, 2)
    const market = placeBuilding(state, 'fish_market', { x: 2, y: 3 }, 0, events);
    expect(market).not.toBeNull();

    // Place belts leading south into the market's north input
    setBeltTile(state, { x: 2, y: 2 }, 'south');

    rebuildSegments(state);

    const segment = [...state.segments.values()][0];
    expect(segment).toBeDefined();
    expect(segment.outputTarget).toBe(market!.id);
  });

  it('belt starting at a building output → segment.inputSource set', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Fishing boat at (0, 0) on water, has output on south side offset 0
    // That means the output connection point is at grid (0, 2)
    const boat = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
    expect(boat).not.toBeNull();

    // Place belt at (0, 2) going south — this is where the boat outputs
    setBeltTile(state, { x: 0, y: 2 }, 'south');

    rebuildSegments(state);

    const segment = [...state.segments.values()][0];
    expect(segment).toBeDefined();
    expect(segment.inputSource).toBe(boat!.id);
  });

  it('assigns segmentId to belt tiles', () => {
    const state = createInitialState(10, 10);

    setBeltTile(state, { x: 0, y: 4 }, 'east');
    setBeltTile(state, { x: 1, y: 4 }, 'east');

    rebuildSegments(state);

    const segment = [...state.segments.values()][0];
    const tile0 = state.beltGrid.get('0,4');
    const tile1 = state.beltGrid.get('1,4');
    expect(tile0!.segmentId).toBe(segment.id);
    expect(tile1!.segmentId).toBe(segment.id);
  });

  it('empty belt grid → no segments', () => {
    const state = createInitialState(10, 10);
    rebuildSegments(state);
    expect(state.segments.size).toBe(0);
  });
});
