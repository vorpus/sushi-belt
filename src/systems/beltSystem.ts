// ---------------------------------------------------------------------------
// Belt System — moves items along belt segments
// ---------------------------------------------------------------------------

import type { GameState, BeltSegment } from '../core/state.ts';
import { beltKey } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { EntityId, SegmentId } from '../core/types.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';

/**
 * Get segments in topological order (sources first, sinks last).
 * A segment is a "source" if no other segment feeds into it.
 */
function getTopologicalOrder(state: GameState): BeltSegment[] {
  const segments = [...state.segments.values()];
  if (segments.length === 0) return [];

  // Build in-degree map — count how many segments feed into each
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

  let totalDist = 0;
  for (const item of segment.items) {
    totalDist += item.distanceToNext;
  }
  const space = segLength - 1 - totalDist;
  return space >= 1 ? space : -1;
}

/**
 * Find the output belt segments connected to an entity's output connection points.
 */
function findOutputSegments(
  state: GameState,
  entityId: EntityId,
): SegmentId[] {
  const entity = state.entities.get(entityId);
  if (!entity || !entity.beltNode || !entity.building) return [];

  const def = BUILDINGS[entity.building.buildingId as BuildingId];
  if (!def) return [];

  const results: SegmentId[] = [];
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
    if (beltTile?.segmentId) {
      results.push(beltTile.segmentId);
    }
  }
  return results;
}

/**
 * Find the input belt segments connected to an entity's input connection points.
 */
function findInputSegments(
  state: GameState,
  entityId: EntityId,
): SegmentId[] {
  const entity = state.entities.get(entityId);
  if (!entity || !entity.beltNode || !entity.building) return [];

  const def = BUILDINGS[entity.building.buildingId as BuildingId];
  if (!def) return [];

  const results: SegmentId[] = [];
  for (const input of entity.beltNode.inputs) {
    // The belt tile that feeds INTO this input is one step in the input direction
    let cpX = entity.position.x;
    let cpY = entity.position.y;

    if (input.side === 'north') {
      cpX = entity.position.x + input.offset;
      cpY = entity.position.y - 1;
    } else if (input.side === 'south') {
      cpX = entity.position.x + input.offset;
      cpY = entity.position.y + def.size.h;
    } else if (input.side === 'west') {
      cpX = entity.position.x - 1;
      cpY = entity.position.y + input.offset;
    } else if (input.side === 'east') {
      cpX = entity.position.x + def.size.w;
      cpY = entity.position.y + input.offset;
    }

    const beltTile = state.beltGrid.get(beltKey({ x: cpX, y: cpY }));
    if (beltTile?.segmentId) {
      results.push(beltTile.segmentId);
    }
  }
  return results;
}

/**
 * Try to push a BeltItem into a segment. Returns true if successful.
 */
function tryPushToSegment(
  item: import('../core/state.ts').BeltItem,
  segment: BeltSegment,
  overshoot: number,
): boolean {
  const segLength = segment.tiles.length;

  if (segment.items.length === 0) {
    item.distanceToNext = Math.max(0, segLength - 1 - overshoot);
    segment.items.push(item);
    return true;
  }

  const dist = tailEntryDistance(segment);
  if (dist >= 0) {
    item.distanceToNext = Math.max(0, dist - overshoot);
    segment.items.push(item);
    return true;
  }

  return false;
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
        const overshoot = -frontItem.distanceToNext;

        // Try push to outputTarget entity
        if (segment.outputTarget) {
          const entity = state.entities.get(segment.outputTarget);
          if (entity) {
            // --- SPLITTER: round-robin to two output segments ---
            if (entity.splitter) {
              const outputs = findOutputSegments(state, segment.outputTarget);
              if (outputs.length >= 2) {
                const idx = entity.splitter.toggleState ? 1 : 0;
                const altIdx = entity.splitter.toggleState ? 0 : 1;
                const primary = state.segments.get(outputs[idx]);
                const secondary = state.segments.get(outputs[altIdx]);

                if (primary && tryPushToSegment(frontItem, primary, overshoot)) {
                  segment.items.shift();
                  entity.splitter.toggleState = !entity.splitter.toggleState;
                  transferred = true;
                } else if (secondary && tryPushToSegment(frontItem, secondary, overshoot)) {
                  segment.items.shift();
                  entity.splitter.toggleState = !entity.splitter.toggleState;
                  transferred = true;
                }
              } else if (outputs.length === 1) {
                const target = state.segments.get(outputs[0]);
                if (target && tryPushToSegment(frontItem, target, overshoot)) {
                  segment.items.shift();
                  transferred = true;
                }
              }
            }
            // --- TUNNEL: teleport to paired exit's output segment ---
            else if (entity.tunnel && entity.tunnel.pairedTunnelId) {
              const exitOutputs = findOutputSegments(state, entity.tunnel.pairedTunnelId);
              if (exitOutputs.length > 0) {
                const target = state.segments.get(exitOutputs[0]);
                if (target && tryPushToSegment(frontItem, target, overshoot)) {
                  segment.items.shift();
                  transferred = true;
                }
              }
            }
            // --- Regular building with inventory ---
            else if (entity.inventory && entity.inventory.items.length < entity.inventory.maxSize) {
              entity.inventory.items.push(frontItem.itemId);
              segment.items.shift();
              transferred = true;
            }
          }
        }

        // Try push to nextSegment
        if (!transferred && segment.nextSegment) {
          const nextSeg = state.segments.get(segment.nextSegment);
          if (nextSeg && tryPushToSegment(frontItem, nextSeg, overshoot)) {
            segment.items.shift();
            transferred = true;
          }
        }
      }
    }

    // 2. ADVANCE: for each item (front to back), reduce distanceToNext
    for (const item of segment.items) {
      const advance = segment.speed * dt;
      item.distanceToNext = Math.max(0, item.distanceToNext - advance);
    }
  }

  // 3. MERGER PULL: for each merger, pull items from input segments
  for (const entity of state.entities.values()) {
    if (!entity.merger) continue;

    const inputSegs = findInputSegments(state, entity.id);
    const outputSegs = findOutputSegments(state, entity.id);
    if (inputSegs.length === 0 || outputSegs.length === 0) continue;

    const outputSeg = state.segments.get(outputSegs[0]);
    if (!outputSeg) continue;

    // Try to pull one item per tick, alternating between inputs
    const attempts = Math.min(inputSegs.length, 2);
    for (let a = 0; a < attempts; a++) {
      const idx = (entity.merger.pullState + a) % inputSegs.length;
      const inputSeg = state.segments.get(inputSegs[idx]);
      if (!inputSeg || inputSeg.items.length === 0) continue;

      const frontItem = inputSeg.items[0];
      if (frontItem.distanceToNext > 0) continue; // not at end yet

      if (tryPushToSegment(frontItem, outputSeg, 0)) {
        inputSeg.items.shift();
        entity.merger.pullState = ((idx + 1) % inputSegs.length) as 0 | 1;
        break; // one item per tick
      }
    }
  }
}
