// ---------------------------------------------------------------------------
// Source System — produces items from source entities
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';

/**
 * Iterate entities with a `source` component. Decrement the timer by dt;
 * when timer <= 0, produce an item into the outputBuffer and reset the timer.
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
  }
}
