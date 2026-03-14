import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { createEconomySystem, purchaseUnlock, purchaseUpgrade } from '../../src/systems/economySystem';
import { placeBuilding } from '../../src/systems/buildingPlacement';
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

  describe('purchaseUnlock', () => {
    it('succeeds with sufficient funds', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 30;

      const result = purchaseUnlock(state, 'cutting_board', events);

      expect(result).toBe(true);
      expect(state.funds).toBe(5); // 30 - 25
      expect(state.unlocks.has('cutting_board')).toBe(true);
    });

    it('fails with insufficient funds', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 10;

      const result = purchaseUnlock(state, 'cutting_board', events);

      expect(result).toBe(false);
      expect(state.funds).toBe(10);
      expect(state.unlocks.has('cutting_board')).toBe(false);
    });

    it('fails if already unlocked', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 50;
      state.unlocks.add('cutting_board');

      const result = purchaseUnlock(state, 'cutting_board', events);

      expect(result).toBe(false);
      expect(state.funds).toBe(50); // no deduction
    });

    it('emits unlockPurchased and fundsChanged events', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 30;

      let unlockEvent = false;
      let fundsEvent = false;
      events.on('unlockPurchased', () => { unlockEvent = true; });
      events.on('fundsChanged', () => { fundsEvent = true; });

      purchaseUnlock(state, 'cutting_board', events);
      events.flush();

      expect(unlockEvent).toBe(true);
      expect(fundsEvent).toBe(true);
    });
  });

  describe('purchaseUpgrade', () => {
    it('succeeds and increments level', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 200;

      const result = purchaseUpgrade(state, 'belt_speed', events);

      expect(result).toBe(true);
      expect(state.funds).toBe(100);
      expect(state.upgrades['belt_speed']).toBe(1);
    });

    it('fails at max level', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.funds = 200;
      state.upgrades['belt_speed'] = 3; // max

      const result = purchaseUpgrade(state, 'belt_speed', events);

      expect(result).toBe(false);
      expect(state.funds).toBe(200);
    });
  });

  describe('unlock gating', () => {
    it('cannot place a locked building', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();

      // cutting_board is not in unlocks
      const entity = placeBuilding(state, 'cutting_board', { x: 3, y: 3 }, 0, events);
      expect(entity).toBeNull();
    });

    it('can place an unlocked building', () => {
      const state = createInitialState(10, 10);
      const events = new EventBus();
      state.unlocks.add('cutting_board');

      const entity = placeBuilding(state, 'cutting_board', { x: 3, y: 3 }, 0, events);
      expect(entity).not.toBeNull();
    });
  });
});
