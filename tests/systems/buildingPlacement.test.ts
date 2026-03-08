import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { placeBuilding, removeBuilding } from '../../src/systems/buildingPlacement';

describe('buildingPlacement', () => {
  describe('placeBuilding', () => {
    it('places a fishing boat on water successfully', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);

      expect(entity).not.toBeNull();
      expect(entity!.building?.buildingId).toBe('fishing_boat');
      expect(entity!.source).toBeDefined();
      expect(entity!.source!.produces).toBe('fish');
      expect(entity!.source!.interval).toBe(3.0);
      expect(entity!.source!.outputBuffer).toEqual([]);
      expect(state.entities.size).toBe(1);

      // Grid cells should be marked as occupied (2x2)
      expect(state.grid[0][0].entityId).toBe(entity!.id);
      expect(state.grid[0][1].entityId).toBe(entity!.id);
      expect(state.grid[1][0].entityId).toBe(entity!.id);
      expect(state.grid[1][1].entityId).toBe(entity!.id);
    });

    it('fails to place a fishing boat on land', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      // Row 3+ is land
      const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 3 }, 0, events);

      expect(entity).toBeNull();
      expect(state.entities.size).toBe(0);
    });

    it('fails when building footprint crosses terrain boundary', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      // Place 2x2 boat at row 2 — bottom row would be land (row 3)
      const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 2 }, 0, events);

      expect(entity).toBeNull();
    });

    it('fails when building overlaps existing building', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const first = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
      expect(first).not.toBeNull();

      // Try placing at overlapping position
      const second = placeBuilding(state, 'fishing_boat', { x: 1, y: 0 }, 0, events);
      expect(second).toBeNull();
      expect(state.entities.size).toBe(1);
    });

    it('fails when building is out of bounds', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const entity = placeBuilding(state, 'fishing_boat', { x: 9, y: 0 }, 0, events);
      expect(entity).toBeNull();
    });

    it('places a fish market on land successfully', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const entity = placeBuilding(state, 'fish_market', { x: 0, y: 3 }, 0, events);

      expect(entity).not.toBeNull();
      expect(entity!.building?.buildingId).toBe('fish_market');
      expect(entity!.seller).toBeDefined();
      expect(entity!.seller!.acceptsCategories).toContain('raw');
    });

    it('emits buildingPlaced event', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const placed: { buildingDef: string; entityId: string }[] = [];
      events.on('buildingPlaced', (payload) => placed.push(payload));

      placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
      events.flush();

      expect(placed).toHaveLength(1);
      expect(placed[0].buildingDef).toBe('fishing_boat');
    });
  });

  describe('removeBuilding', () => {
    it('removes a building and clears grid cells', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const entity = placeBuilding(state, 'fishing_boat', { x: 0, y: 0 }, 0, events);
      expect(entity).not.toBeNull();

      const removed = removeBuilding(state, entity!.id, events);
      expect(removed).toBe(true);
      expect(state.entities.size).toBe(0);
      expect(state.grid[0][0].entityId).toBeNull();
      expect(state.grid[0][1].entityId).toBeNull();
      expect(state.grid[1][0].entityId).toBeNull();
      expect(state.grid[1][1].entityId).toBeNull();
    });

    it('returns false for non-existent entity', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      const removed = removeBuilding(state, 'nonexistent' as any, events);
      expect(removed).toBe(false);
    });
  });
});
