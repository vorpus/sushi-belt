import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { createEconomySystem } from '../../src/systems/economySystem';
import type { EntityId, ItemId } from '../../src/core/types';

describe('economySystem', () => {
  it('updates funds and stats when itemSold event is processed', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();
    const economySystem = createEconomySystem();

    // Initialize the system (registers event handler)
    economySystem(state, events);

    // Emit an itemSold event
    events.emit('itemSold', {
      itemId: 'fish' as ItemId,
      value: 2,
      sellerId: 'entity_1' as EntityId,
    });

    // Flush so the handler captures it
    events.flush();

    // Run economy system to process pending sales
    economySystem(state, events);

    expect(state.funds).toBe(2);
    expect(state.stats.totalItemsSold).toBe(1);
    expect(state.stats.totalMoneyEarned).toBe(2);
    expect(state.stats.itemsSoldByType['fish']).toBe(1);
  });

  it('emits fundsChanged event', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();
    const economySystem = createEconomySystem();

    const fundsEvents: { oldAmount: number; newAmount: number }[] = [];
    events.on('fundsChanged', (payload) => fundsEvents.push(payload));

    economySystem(state, events);

    events.emit('itemSold', {
      itemId: 'fish' as ItemId,
      value: 2,
      sellerId: 'entity_1' as EntityId,
    });
    events.flush();

    economySystem(state, events);
    events.flush();

    expect(fundsEvents).toHaveLength(1);
    expect(fundsEvents[0].oldAmount).toBe(0);
    expect(fundsEvents[0].newAmount).toBe(2);
  });

  it('accumulates funds from multiple sales', () => {
    const state = createInitialState(10, 10);
    const events = new EventBus();
    const economySystem = createEconomySystem();

    economySystem(state, events);

    events.emit('itemSold', {
      itemId: 'fish' as ItemId,
      value: 2,
      sellerId: 'entity_1' as EntityId,
    });
    events.emit('itemSold', {
      itemId: 'fish' as ItemId,
      value: 2,
      sellerId: 'entity_1' as EntityId,
    });
    events.flush();

    economySystem(state, events);

    expect(state.funds).toBe(4);
    expect(state.stats.totalItemsSold).toBe(2);
    expect(state.stats.itemsSoldByType['fish']).toBe(2);
  });
});
