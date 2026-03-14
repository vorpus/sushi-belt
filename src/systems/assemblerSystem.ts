// ---------------------------------------------------------------------------
// Assembler System — combines multiple inputs into assembled outputs
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import { beltKey } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { ItemId } from '../core/types.ts';
import { RECIPES } from '../data/recipes.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';

/**
 * Try to push an item from the outputBuffer onto a connected belt segment.
 */
function tryPushToBelt(state: GameState, entity: import('../core/entity.ts').Entity): boolean {
  if (!entity.source || entity.source.outputBuffer.length === 0) return false;
  if (!entity.beltNode || entity.beltNode.outputs.length === 0) return false;
  if (!entity.building) return false;

  const def = BUILDINGS[entity.building.buildingId as BuildingId];
  if (!def) return false;

  for (const output of entity.beltNode.outputs) {
    let cpX = entity.position.x;
    let cpY = entity.position.y;

    if (output.side === 'south') {
      cpX = entity.position.x + output.offset;
      cpY = entity.position.y + def.size.h;
    } else if (output.side === 'north') {
      cpX = entity.position.x + output.offset;
      cpY = entity.position.y - 1;
    } else if (output.side === 'east') {
      cpX = entity.position.x + def.size.w;
      cpY = entity.position.y + output.offset;
    } else if (output.side === 'west') {
      cpX = entity.position.x - 1;
      cpY = entity.position.y + output.offset;
    }

    const beltTile = state.beltGrid.get(beltKey({ x: cpX, y: cpY }));
    if (!beltTile || !beltTile.segmentId) continue;

    const segment = state.segments.get(beltTile.segmentId);
    if (!segment) continue;

    const segLength = segment.tiles.length;
    if (segment.items.length === 0) {
      const itemId = entity.source.outputBuffer.shift()!;
      segment.items.push({ itemId: itemId as ItemId, distanceToNext: segLength - 1 });
      return true;
    } else {
      let totalDist = 0;
      for (const item of segment.items) totalDist += item.distanceToNext;
      const spaceAtTail = segLength - 1 - totalDist;
      if (spaceAtTail >= 1) {
        const itemId = entity.source.outputBuffer.shift()!;
        segment.items.push({ itemId: itemId as ItemId, distanceToNext: spaceAtTail });
        return true;
      }
    }
  }

  return false;
}

/**
 * Assembler system tick: for each entity with an `assembler` component,
 * route inventory items to input slots, assemble when all inputs present,
 * produce outputs.
 */
export function assemblerSystem(
  state: GameState,
  dt: number,
  events: EventBus,
): void {
  for (const entity of state.entities.values()) {
    if (!entity.assembler || !entity.inventory) continue;

    const recipe = RECIPES[entity.assembler.recipeId as keyof typeof RECIPES];
    if (!recipe) continue;

    // Try to push any buffered output items onto belts first
    if (entity.source) {
      while (entity.source.outputBuffer.length > 0) {
        if (!tryPushToBelt(state, entity)) break;
      }
    }

    // Route items from inventory into input slots (item-type-based)
    for (let i = entity.inventory.items.length - 1; i >= 0; i--) {
      const itemId = entity.inventory.items[i];
      // Check if this item type is needed by the recipe
      for (const input of recipe.inputs) {
        if (itemId === input.item) {
          const current = entity.assembler.inputSlots.get(itemId) ?? 0;
          if (current < input.count) {
            entity.assembler.inputSlots.set(itemId, current + 1);
            entity.inventory.items.splice(i, 1);
            break;
          }
        }
      }
    }

    if (entity.assembler.processing) {
      // ASSEMBLING: advance progress
      entity.assembler.progress += dt;

      // Apply upgrade: efficient assembly (30% faster)
      let effectiveTime = recipe.processingTime;
      if ((state.upgrades['efficient_assembly'] ?? 0) > 0) {
        effectiveTime *= 0.7;
      }

      if (entity.assembler.progress >= effectiveTime) {
        // Complete — produce outputs
        entity.assembler.processing = false;
        entity.assembler.progress = 0;

        if (entity.source) {
          for (const output of recipe.outputs) {
            for (let i = 0; i < output.count; i++) {
              entity.source.outputBuffer.push(output.item as ItemId);
            }
          }

          events.emit('recipeCompleted', {
            recipeId: recipe.id,
            buildingId: entity.id,
          });

          while (entity.source.outputBuffer.length > 0) {
            if (!tryPushToBelt(state, entity)) break;
          }
        }
      }
    } else if (!entity.source || entity.source.outputBuffer.length === 0) {
      // WAITING: check if all input slots are filled
      let allFilled = true;
      for (const input of recipe.inputs) {
        const have = entity.assembler.inputSlots.get(input.item as ItemId) ?? 0;
        if (have < input.count) {
          allFilled = false;
          break;
        }
      }

      if (allFilled) {
        // Consume inputs from slots
        for (const input of recipe.inputs) {
          const current = entity.assembler.inputSlots.get(input.item as ItemId) ?? 0;
          const remaining = current - input.count;
          if (remaining <= 0) {
            entity.assembler.inputSlots.delete(input.item as ItemId);
          } else {
            entity.assembler.inputSlots.set(input.item as ItemId, remaining);
          }
        }

        entity.assembler.processing = true;
        entity.assembler.progress = 0;
      }
    }
  }
}
