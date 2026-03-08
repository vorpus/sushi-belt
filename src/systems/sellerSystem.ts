// ---------------------------------------------------------------------------
// Seller System — sells items from building inventories
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import { ITEMS, type DataItemId } from '../data/items.ts';
import { SELL_PRICES } from '../data/economy.ts';
import type { ItemId } from '../core/types.ts';

/**
 * Iterate entities with `seller` and `inventory` components.
 * For each item in inventory that matches the seller's accepted categories,
 * emit an `itemSold` event and remove the item from inventory.
 */
export function sellerSystem(
  state: GameState,
  _dt: number,
  events: EventBus,
): void {
  for (const entity of state.entities.values()) {
    if (!entity.seller || !entity.inventory) continue;

    const accepts = entity.seller.acceptsCategories;

    // Process items in inventory (iterate backwards for safe removal)
    let i = 0;
    while (i < entity.inventory.items.length) {
      const itemId = entity.inventory.items[i] as DataItemId;
      const itemDef = ITEMS[itemId];

      if (!itemDef || !accepts.includes(itemDef.category)) {
        i++;
        continue;
      }

      const value = SELL_PRICES[itemId] ?? 0;
      if (value <= 0) {
        i++;
        continue;
      }

      // Remove item from inventory
      entity.inventory.items.splice(i, 1);

      // Emit sale event
      events.emit('itemSold', {
        itemId: itemId as unknown as ItemId,
        value,
        sellerId: entity.id,
      });
    }
  }
}
