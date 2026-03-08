// ---------------------------------------------------------------------------
// Source System — produces items from source entities
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import { beltKey } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import type { ItemId } from '../core/types.ts';

/**
 * Try to push an item from a source's output buffer onto a connected belt segment.
 * Returns true if the item was successfully placed on a belt.
 */
function tryPushToBelt(state: GameState, entity: import('../core/entity.ts').Entity): boolean {
  if (!entity.source || entity.source.outputBuffer.length === 0) return false;
  if (!entity.beltNode || entity.beltNode.outputs.length === 0) return false;
  if (!entity.building) return false;

  const def = BUILDINGS[entity.building.buildingId as BuildingId];
  if (!def) return false;

  // Find the belt tile at the output connection point
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

    // Check if segment has space at its tail
    const segLength = segment.tiles.length;
    if (segment.items.length === 0) {
      // Empty segment — place item at tail
      const itemId = entity.source.outputBuffer.shift()!;
      segment.items.push({
        itemId: itemId as ItemId,
        distanceToNext: segLength - 1,
      });
      return true;
    } else {
      // Check space at tail
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
 * Iterate entities with a `source` component. Decrement the timer by dt;
 * when timer <= 0, produce an item into the outputBuffer and reset the timer.
 * Then try to push buffered items onto connected belt segments.
 */
export function sourceSystem(
  state: GameState,
  dt: number,
  events: EventBus,
): void {
  for (const entity of state.entities.values()) {
    if (!entity.source) continue;

    entity.source.timer -= dt;

    const EPSILON = 1e-6;
    if (entity.source.timer <= EPSILON) {
      entity.source.timer += entity.source.interval;
      entity.source.outputBuffer.push(entity.source.produces);
      events.emit('itemProduced', {
        itemId: entity.source.produces,
        sourceId: entity.id,
      });
    }

    // Try to push buffered items onto belts
    while (entity.source.outputBuffer.length > 0) {
      if (!tryPushToBelt(state, entity)) break;
    }
  }
}
