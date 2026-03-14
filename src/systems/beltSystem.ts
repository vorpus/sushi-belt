// ---------------------------------------------------------------------------
// Belt System — moves items along belt segments
// ---------------------------------------------------------------------------

import type { GameState, BeltSegment } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { SegmentId } from '../core/types.ts';

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
 * Check if there is space to add an item at the tail (entry end) of a segment.
 * Returns the distance the new item should have, or -1 if no space.
 */
function tailEntryDistance(segment: BeltSegment): number {
  const segLength = segment.tiles.length;
  if (segment.items.length === 0) return segLength - 1;

  // Sum all gaps to find where the last item sits relative to the start
  let totalDist = 0;
  for (const item of segment.items) {
    totalDist += item.distanceToNext;
  }
  // The last item is at position (segLength - 1 - totalDist) from the start.
  // A new item needs at least 1 tile gap behind it, OR the segment needs to
  // have room for at least one more item.
  const space = segLength - 1 - totalDist;
  return space >= 1 ? space : -1;
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
        // Leftover distance past the segment end (how far past 0 the item went)
        const overshoot = -frontItem.distanceToNext;

        // Try push to outputTarget building
        if (segment.outputTarget) {
          const entity = state.entities.get(segment.outputTarget);
          if (entity?.inventory && entity.inventory.items.length < entity.inventory.maxSize) {
            entity.inventory.items.push(frontItem.itemId);
            segment.items.shift();
            transferred = true;
          }
        }

        // Try push to nextSegment — reuse the same object for visual smoothing
        if (!transferred && segment.nextSegment) {
          const nextSeg = state.segments.get(segment.nextSegment);
          if (nextSeg) {
            const nextSegLength = nextSeg.tiles.length;
            let canEnter = false;
            let entryDist = 0;

            if (nextSeg.items.length === 0) {
              // Empty segment — always accept
              canEnter = true;
              entryDist = Math.max(0, nextSegLength - 1 - overshoot);
            } else {
              const dist = tailEntryDistance(nextSeg);
              if (dist >= 0) {
                canEnter = true;
                entryDist = Math.max(0, dist - overshoot);
              }
            }

            if (canEnter) {
              // Reuse the same BeltItem object (preserves renderer WeakMap reference)
              frontItem.distanceToNext = entryDist;
              segment.items.shift();
              nextSeg.items.push(frontItem);
              transferred = true;
            }
          }
        }
      }
    }

    // 2. ADVANCE: for each item (front to back), reduce distanceToNext
    for (const item of segment.items) {
      const advance = segment.speed * dt;
      item.distanceToNext = Math.max(0, item.distanceToNext - advance);
    }

    // 3. BACK-PRESSURE: items behind a stopped item compress but don't overlap
    // distanceToNext represents gap to next item (or end), clamped to 0 above
  }
}
