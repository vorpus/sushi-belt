// ---------------------------------------------------------------------------
// Economy System — processes sale events and updates funds/stats
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import { UPGRADES, type UpgradeId } from '../data/upgrades.ts';

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

/**
 * Purchase a building unlock. Deducts funds and adds to state.unlocks.
 * Returns true if the purchase succeeded.
 */
export function purchaseUnlock(
  state: GameState,
  buildingId: BuildingId,
  events: EventBus,
): boolean {
  if (state.unlocks.has(buildingId)) return false;

  const def = BUILDINGS[buildingId];
  if (!def) return false;
  if (state.funds < def.unlockCost) return false;

  const oldAmount = state.funds;
  state.funds -= def.unlockCost;
  state.unlocks.add(buildingId);

  events.emit('unlockPurchased', { unlockId: buildingId });
  events.emit('fundsChanged', { oldAmount, newAmount: state.funds });

  return true;
}

/**
 * Purchase an upgrade level. Deducts funds and increments upgrade level.
 * Returns true if the purchase succeeded.
 */
export function purchaseUpgrade(
  state: GameState,
  upgradeId: UpgradeId,
  events: EventBus,
): boolean {
  const def = UPGRADES[upgradeId];
  if (!def) return false;

  const currentLevel = state.upgrades[upgradeId] ?? 0;
  if (currentLevel >= def.maxLevel) return false;
  if (state.funds < def.cost) return false;

  const oldAmount = state.funds;
  state.funds -= def.cost;
  state.upgrades[upgradeId] = currentLevel + 1;

  events.emit('fundsChanged', { oldAmount, newAmount: state.funds });

  return true;
}
