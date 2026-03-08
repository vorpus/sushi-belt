// ---------------------------------------------------------------------------
// Economy System — processes sale events and updates funds/stats
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';

/**
 * Listen for `itemSold` events and update funds and stats.
 * This system registers an event handler on first call and processes
 * pending sales each tick.
 */
export function createEconomySystem(): (state: GameState, events: EventBus) => void {
  let initialized = false;
  let pendingSales: { itemId: string; value: number }[] = [];

  return function economySystem(state: GameState, events: EventBus): void {
    if (!initialized) {
      events.on('itemSold', (payload) => {
        pendingSales.push({ itemId: payload.itemId, value: payload.value });
      });
      initialized = true;
    }

    // Process pending sales from last flush
    for (const sale of pendingSales) {
      const oldAmount = state.funds;
      state.funds += sale.value;
      state.stats.totalItemsSold++;
      state.stats.totalMoneyEarned += sale.value;
      state.stats.itemsSoldByType[sale.itemId] =
        (state.stats.itemsSoldByType[sale.itemId] ?? 0) + 1;

      events.emit('fundsChanged', {
        oldAmount,
        newAmount: state.funds,
      });
    }

    pendingSales = [];
  };
}
