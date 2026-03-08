// ---------------------------------------------------------------------------
// Event Bus — typed, queue-based event system for Sushi Belt
// ---------------------------------------------------------------------------

import type { Direction, ItemId, EntityId, SegmentId, GridPosition } from './types';

/** Map of every game event name to its payload shape. */
export interface GameEventMap {
  itemSold: { itemId: ItemId; value: number; sellerId: EntityId };
  itemProduced: { itemId: ItemId; sourceId: EntityId };
  recipeCompleted: { recipeId: string; buildingId: EntityId };
  buildingPlaced: { buildingDef: string; position: GridPosition; entityId: EntityId };
  buildingRemoved: { entityId: EntityId };
  fundsChanged: { oldAmount: number; newAmount: number };
  unlockPurchased: { unlockId: string };
  beltPlaced: { position: GridPosition; direction: Direction };
  beltRemoved: { position: GridPosition };
  segmentRebuilt: { affectedSegments: SegmentId[] };
}

type Handler<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

interface QueuedEvent {
  type: keyof GameEventMap;
  payload: GameEventMap[keyof GameEventMap];
}

const MAX_FLUSH_ITERATIONS = 10;

export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<keyof GameEventMap, Set<Handler<any>>>();
  private queue: QueuedEvent[] = [];

  /** Queue an event for delivery on the next `flush()`. */
  emit<K extends keyof GameEventMap>(type: K, payload: GameEventMap[K]): void {
    this.queue.push({ type, payload });
  }

  /** Register a handler for a specific event type. */
  on<K extends keyof GameEventMap>(type: K, handler: Handler<K>): void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
  }

  /** Unregister a previously-registered handler. */
  off<K extends keyof GameEventMap>(type: K, handler: Handler<K>): void {
    const set = this.handlers.get(type);
    if (set) {
      set.delete(handler);
    }
  }

  /**
   * Dispatch all queued events to their registered handlers.
   *
   * Handlers may emit new events during processing; those are collected and
   * dispatched in subsequent iterations up to a maximum of {@link MAX_FLUSH_ITERATIONS}
   * to prevent infinite loops.
   */
  flush(): void {
    for (let iteration = 0; iteration < MAX_FLUSH_ITERATIONS; iteration++) {
      const batch = this.queue;
      this.queue = [];

      if (batch.length === 0) {
        return;
      }

      for (const event of batch) {
        const set = this.handlers.get(event.type);
        if (set) {
          for (const handler of set) {
            handler(event.payload);
          }
        }
      }
    }

    // If we reach here, we exhausted the iteration budget — drop remaining
    // queued events to prevent infinite loops.
    this.queue = [];
  }
}
