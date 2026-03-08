// ---------------------------------------------------------------------------
// Belt System — moves items along belt segments
// ---------------------------------------------------------------------------

import type { GameState, BeltSegment } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { ItemId, SegmentId } from '../core/types.ts';

/**
 * Get segments in topological order (sources first, sinks last).
 * A segment is a "source" if no other segment feeds into it.
 */
function getTopologicalOrder(state: GameState): BeltSegment[] {
  const segments = [...state.segments.values()];
  if (segments.length === 0) return [];

  // Build in-degree map
  const inDegree = new Map<SegmentId, number>();
  for (const seg of segments) {
    if (!inDegree.has(seg.id)) inDegree.set(seg.id, 0);
    if (seg.nextSegment && state.segments.has(seg.nextSegment)) {
      inDegree.set(seg.nextSegment, (inDegree.get(seg.nextSegment) ?? 0) + 1);
    }
  }

  // BFS from zero in-degree
  const queue: SegmentId[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: BeltSegment[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const seg = state.segments.get(id)!;
    result.push(seg);

    if (seg.nextSegment && state.segments.has(seg.nextSegment)) {
      const newDeg = (inDegree.get(seg.nextSegment) ?? 1) - 1;
      inDegree.set(seg.nextSegment, newDeg);
      if (newDeg === 0) queue.push(seg.nextSegment);
    }
  }

  // If some segments weren't reached (cycles), append them
  if (result.length < segments.length) {
    const visited = new Set(result.map((s) => s.id));
    for (const seg of segments) {
      if (!visited.has(seg.id)) result.push(seg);
    }
  }

  return result;
}

/**
 * Belt system tick: process all segments, transfer and advance items.
 */
export function beltSystem(
  state: GameState,
  dt: number,
  _events: EventBus,
): void {
  const ordered = getTopologicalOrder(state);

  for (const segment of ordered) {
    // 1. TRANSFER: if front item reached end
    if (segment.items.length > 0) {
      const frontItem = segment.items[0];
      if (frontItem.distanceToNext <= 0) {
        let transferred = false;

        // Try push to outputTarget building
        if (segment.outputTarget) {
          const entity = state.entities.get(segment.outputTarget);
          if (entity?.inventory && entity.inventory.items.length < entity.inventory.maxSize) {
            entity.inventory.items.push(frontItem.itemId);
            transferred = true;
          }
        }

        // Try push to nextSegment
        if (!transferred && segment.nextSegment) {
          const nextSeg = state.segments.get(segment.nextSegment);
          if (nextSeg) {
            // Check if there's space at the tail of the next segment
            const nextSegLength = nextSeg.tiles.length;
            if (nextSeg.items.length === 0) {
              // Empty segment — place item at the tail (full distance to end)
              nextSeg.items.push({
                itemId: frontItem.itemId,
                distanceToNext: nextSegLength - 1,
              });
              transferred = true;
            } else {
              // Calculate how much space there is behind the last item
              let totalDist = 0;
              for (const item of nextSeg.items) {
                totalDist += item.distanceToNext;
              }
              const spaceAtTail = nextSegLength - 1 - totalDist;
              if (spaceAtTail >= 1) {
                nextSeg.items.push({
                  itemId: frontItem.itemId,
                  distanceToNext: spaceAtTail,
                } as { itemId: ItemId; distanceToNext: number });
                transferred = true;
              }
            }
          }
        }

        if (transferred) {
          segment.items.shift();
          // Adjust the next item's gap — it now becomes the new front
          if (segment.items.length > 0) {
            // The next item's distanceToNext was the gap to the old front item.
            // Now it becomes the distance to the segment end.
            // No adjustment needed — the gap is already relative.
          }
        }
      }
    }

    // 2. ADVANCE: for each item (front to back), reduce distanceToNext
    for (const item of segment.items) {
      const advance = segment.speed * dt;
      item.distanceToNext = Math.max(0, item.distanceToNext - advance);
    }

    // Prevent overlapping: items behind a stopped item can't pass it
    for (let i = 1; i < segment.items.length; i++) {
      // If the item ahead is stopped (distanceToNext = 0), this item also stops
      // Actually, distanceToNext represents gap to the next item (or end).
      // Items compress but don't overlap, so minimum gap is 0.
      // This is already handled by clamping to 0 above.
    }
  }
}
