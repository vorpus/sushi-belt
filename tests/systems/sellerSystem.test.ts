import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { createEntity } from '../../src/core/entity';
import { sellerSystem } from '../../src/systems/sellerSystem';
import type { EntityId, ItemId } from '../../src/core/types';

describe('sellerSystem', () => {
  it('sells fish from inventory and emits itemSold event', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    // Create a fish market entity with seller + inventory
    const entity = createEntity({ x: 5, y: 5 });
    entity.seller = { acceptsCategories: ['raw', 'processed', 'sushi'] };
    entity.inventory = { items: ['fish' as ItemId], maxSize: 5 };
    entity.building = { buildingId: 'fish_market', rotation: 0 };
    state.entities.set(entity.id, entity);

    const sold: { itemId: ItemId; value: number; sellerId: EntityId }[] = [];
    events.on('itemSold', (payload) => sold.push(payload));

    sellerSystem(state, 1 / 60, events);
    events.flush();

    expect(entity.inventory.items).toHaveLength(0);
    expect(sold).toHaveLength(1);
    expect(sold[0].itemId).toBe('fish');
    expect(sold[0].value).toBe(2);
    expect(sold[0].sellerId).toBe(entity.id);
  });

  it('does nothing when inventory is empty', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    const entity = createEntity({ x: 5, y: 5 });
    entity.seller = { acceptsCategories: ['raw'] };
    entity.inventory = { items: [], maxSize: 5 };
    state.entities.set(entity.id, entity);

    const sold: unknown[] = [];
    events.on('itemSold', (payload) => sold.push(payload));

    sellerSystem(state, 1 / 60, events);
    events.flush();

    expect(sold).toHaveLength(0);
  });

  it('sells multiple items in one tick', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();

    const entity = createEntity({ x: 5, y: 5 });
    entity.seller = { acceptsCategories: ['raw'] };
    entity.inventory = {
      items: ['fish' as ItemId, 'fish' as ItemId, 'fish' as ItemId],
      maxSize: 5,
    };
    state.entities.set(entity.id, entity);

    const sold: unknown[] = [];
    events.on('itemSold', (payload) => sold.push(payload));

    sellerSystem(state, 1 / 60, events);
    events.flush();

    expect(entity.inventory.items).toHaveLength(0);
    expect(sold).toHaveLength(3);
  });
});
