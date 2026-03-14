// ---------------------------------------------------------------------------
// Processor System — transforms items according to recipes
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import { beltKey } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { ItemId } from '../core/types.ts';
import { RECIPES } from '../data/recipes.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';

/**
 * Try to push an item from the processor's output buffer onto a connected belt segment.
 * Reuses the same pattern as sourceSystem's tryPushToBelt.
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
      segment.items.push({
        itemId: itemId as ItemId,
        distanceToNext: segLength - 1,
      });
      return true;
    } else {
      let totalDist = 0;
      for (const item of segment.items) {
        totalDist += item.distanceToNext;
      }
      const spaceAtTail = segLength - 1 - totalDist;
      if (spaceAtTail >= 1) {
        const itemId = entity.source.outputBuffer.shift()!;
        segment.items.push({
          itemId: itemId as ItemId,
          distanceToNext: spaceAtTail,
        });
        return true;
      }
    }
  }

  return false;
}

/**
 * Processor system tick: for each entity with a `processor` component,
 * consume inputs from inventory, process over time, produce outputs.
 */
export function processorSystem(
  state: GameState,
  dt: number,
  events: EventBus,
): void {
  for (const entity of state.entities.values()) {
    if (!entity.processor || !entity.inventory) continue;

    const recipe = RECIPES[entity.processor.recipeId as keyof typeof RECIPES];
    if (!recipe) continue;

    // Try to push any buffered output items onto belts first
    if (entity.source) {
      while (entity.source.outputBuffer.length > 0) {
        if (!tryPushToBelt(state, entity)) break;
      }
    }

    if (entity.processor.processing) {
      // PROCESSING: advance progress
      entity.processor.progress += dt;

      // Apply upgrade: fast cooker (50% faster rice cooker)
      let effectiveTime = recipe.processingTime;
      if (recipe.id === 'cook_rice' && (state.upgrades['fast_cooker'] ?? 0) > 0) {
        effectiveTime *= 0.5;
      }

      if (entity.processor.progress >= effectiveTime) {
        // Processing complete — produce outputs into outputBuffer
        entity.processor.processing = false;
        entity.processor.progress = 0;

        if (entity.source) {
          for (const output of recipe.outputs) {
            // Apply upgrade: bulk cutting (3 fish cuts instead of 2)
            let count: number = output.count;
            if (recipe.id === 'cut_fish' && output.item === 'fish_cut' && (state.upgrades['bulk_cutting'] ?? 0) > 0) {
              count = 3;
            }
            for (let i = 0; i < count; i++) {
              entity.source.outputBuffer.push(output.item as ItemId);
            }
          }

          events.emit('recipeCompleted', {
            recipeId: recipe.id,
            buildingId: entity.id,
          });

          // Try to push outputs immediately
          while (entity.source.outputBuffer.length > 0) {
            if (!tryPushToBelt(state, entity)) break;
          }
        }
      }
    } else if (!entity.source || entity.source.outputBuffer.length === 0) {
      // IDLE: check if we have the required inputs
      // Only start processing if output buffer is clear (not blocked)
      let canProcess = true;
      for (const input of recipe.inputs) {
        let count = 0;
        for (const itemId of entity.inventory.items) {
          if (itemId === input.item) count++;
        }
        if (count < input.count) {
          canProcess = false;
          break;
        }
      }

      if (canProcess) {
        // Consume inputs from inventory
        for (const input of recipe.inputs) {
          let remaining = input.count;
          for (let i = entity.inventory.items.length - 1; i >= 0 && remaining > 0; i--) {
            if (entity.inventory.items[i] === input.item) {
              entity.inventory.items.splice(i, 1);
              remaining--;
            }
          }
        }

        entity.processor.processing = true;
        entity.processor.progress = 0;
      }
    }
  }
}
