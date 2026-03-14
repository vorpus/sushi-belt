// ---------------------------------------------------------------------------
// Segment Builder — constructs belt segment graph from belt grid
// ---------------------------------------------------------------------------

import type { GameState, BeltSegment } from '../core/state.ts';
import { beltKey } from '../core/state.ts';
import type { GridPosition, SegmentId, Direction } from '../core/types.ts';
import { directionToDelta, oppositeDirection } from '../core/types.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';

let nextSegmentId = 1;

function generateSegmentId(): SegmentId {
  return `seg_${nextSegmentId++}` as SegmentId;
}

/**
 * Find the building entity at the given grid position, if any.
 */
function getEntityAt(state: GameState, pos: GridPosition) {
  const row = state.grid[pos.y];
  if (!row) return null;
  const cell = row[pos.x];
  if (!cell || !cell.entityId) return null;
  return state.entities.get(cell.entityId) ?? null;
}

/**
 * Check if position `pos` is a connection output of the entity at that position,
 * receiving from direction `fromDir` (the direction the belt is coming FROM).
 * i.e., the belt tile is adjacent and feeds INTO this building.
 */
function findInputConnection(
  state: GameState,
  beltPos: GridPosition,
  beltDir: Direction,
): string | null {
  // The belt points in `beltDir`. The tile it feeds into is one step in that direction.
  const delta = directionToDelta(beltDir);
  const targetPos = { x: beltPos.x + delta.dx, y: beltPos.y + delta.dy };
  const entity = getEntityAt(state, targetPos);
  if (!entity || !entity.beltNode) return null;

  // The belt comes from the opposite side
  const inputSide = oppositeDirection(beltDir);

  for (const input of entity.beltNode.inputs) {
    if (input.side !== inputSide) continue;
    // Check if the belt tile is at the correct offset position for this input
    const def = entity.building
      ? BUILDINGS[entity.building.buildingId as BuildingId]
      : null;
    if (!def) continue;

    // Compute the world grid position of this input connection point
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

    if (cpX === beltPos.x && cpY === beltPos.y) {
      return entity.id;
    }
  }

  return null;
}

/**
 * Check if a building has an output connection that feeds into the given belt position.
 */
function findOutputConnection(
  state: GameState,
  beltPos: GridPosition,
  beltDir: Direction,
): string | null {
  // The belt at beltPos going in beltDir — check all adjacent cells for a building
  // whose output connection point is at beltPos
  const oppDir = oppositeDirection(beltDir);
  const delta = directionToDelta(oppDir);
  const sourcePos = { x: beltPos.x + delta.dx, y: beltPos.y + delta.dy };
  const entity = getEntityAt(state, sourcePos);
  if (!entity || !entity.beltNode) return null;

  for (const output of entity.beltNode.outputs) {
    if (output.side !== beltDir) continue;
    const def = entity.building
      ? BUILDINGS[entity.building.buildingId as BuildingId]
      : null;
    if (!def) continue;

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

    if (cpX === beltPos.x && cpY === beltPos.y) {
      return entity.id;
    }
  }

  return null;
}

/**
 * Rebuild the entire segment graph from the belt grid.
 * Clears existing segments and reconstructs them from scratch.
 */
export function rebuildSegments(state: GameState): void {
  // Preserve existing items on segments before clearing
  const itemsByTileKey = new Map<string, { itemId: string; distanceToNext: number }[]>();
  for (const segment of state.segments.values()) {
    // Map items to their approximate tile positions within the segment
    // Items are ordered front-to-back; front item is closest to segment end
    let distFromEnd = 0;
    for (const item of segment.items) {
      distFromEnd += item.distanceToNext;
      const tileIndex = Math.min(
        Math.floor(segment.tiles.length - 1 - distFromEnd),
        segment.tiles.length - 1,
      );
      if (tileIndex >= 0 && tileIndex < segment.tiles.length) {
        const tile = segment.tiles[tileIndex];
        const key = beltKey(tile);
        if (!itemsByTileKey.has(key)) {
          itemsByTileKey.set(key, []);
        }
        itemsByTileKey.get(key)!.push(item);
      }
    }
  }

  // Clear existing segments
  state.segments.clear();

  // Track visited tiles
  const visited = new Set<string>();

  // Walk all belt tiles and group into segments
  for (const [key, tile] of state.beltGrid) {
    if (visited.has(key)) continue;

    // Start a new segment from this tile
    // First, walk backwards to find the start of this contiguous run
    const [startX, startY] = key.split(',').map(Number);
    const tiles: GridPosition[] = [];

    // Walk backward (against the direction) to find the beginning of this segment
    let walkPos = { x: startX, y: startY };
    const oppDelta = directionToDelta(oppositeDirection(tile.direction));

    // Collect tiles going backward
    const backwardTiles: GridPosition[] = [];
    let prevPos = { x: walkPos.x + oppDelta.dx, y: walkPos.y + oppDelta.dy };
    let prevKey = beltKey(prevPos);
    let prevTile = state.beltGrid.get(prevKey);

    while (prevTile && prevTile.direction === tile.direction && !visited.has(prevKey)) {
      backwardTiles.unshift(prevPos);
      prevPos = { x: prevPos.x + oppDelta.dx, y: prevPos.y + oppDelta.dy };
      prevKey = beltKey(prevPos);
      prevTile = state.beltGrid.get(prevKey);
    }

    // Add backward tiles, then the start tile
    tiles.push(...backwardTiles);
    tiles.push({ x: startX, y: startY });

    // Walk forward to find the end of this contiguous run
    const fwdDelta = directionToDelta(tile.direction);
    let nextPos = { x: startX + fwdDelta.dx, y: startY + fwdDelta.dy };
    let nextKey = beltKey(nextPos);
    let nextTile = state.beltGrid.get(nextKey);

    while (nextTile && nextTile.direction === tile.direction && !visited.has(nextKey)) {
      tiles.push(nextPos);
      nextPos = { x: nextPos.x + fwdDelta.dx, y: nextPos.y + fwdDelta.dy };
      nextKey = beltKey(nextPos);
      nextTile = state.beltGrid.get(nextKey);
    }

    // Mark all tiles as visited
    for (const t of tiles) {
      visited.add(beltKey(t));
    }

    // Create segment
    const segmentId = generateSegmentId();
    const segment: BeltSegment = {
      id: segmentId,
      tiles,
      direction: tile.direction,
      speed: 2, // 2 tiles per second default belt speed
      items: [],
      nextSegment: null,
      outputTarget: null,
      inputSource: null,
    };

    // Set segmentId on all belt tiles
    for (const t of tiles) {
      const bt = state.beltGrid.get(beltKey(t));
      if (bt) bt.segmentId = segmentId;
    }

    // Check for input source (building output feeding into the first tile)
    const firstTile = tiles[0];
    const inputSource = findOutputConnection(state, firstTile, tile.direction);
    if (inputSource) {
      segment.inputSource = inputSource as unknown as import('../core/types.ts').EntityId;
    }

    // Check for output target (building input receiving from the last tile)
    const lastTile = tiles[tiles.length - 1];
    const outputTarget = findInputConnection(state, lastTile, tile.direction);
    if (outputTarget) {
      segment.outputTarget = outputTarget as unknown as import('../core/types.ts').EntityId;
    }

    state.segments.set(segmentId, segment);
  }

  // Second pass: link nextSegment pointers between segments
  for (const segment of state.segments.values()) {
    if (segment.outputTarget) continue; // feeds into building, no next segment

    const lastTile = segment.tiles[segment.tiles.length - 1];
    const fwdDelta = directionToDelta(segment.direction);
    const nextPos = {
      x: lastTile.x + fwdDelta.dx,
      y: lastTile.y + fwdDelta.dy,
    };
    const nextBeltTile = state.beltGrid.get(beltKey(nextPos));
    if (nextBeltTile && nextBeltTile.segmentId) {
      // Don't link to a segment going the opposite direction (would send items backwards)
      if (nextBeltTile.direction !== oppositeDirection(segment.direction)) {
        segment.nextSegment = nextBeltTile.segmentId;
      }
    }
  }

  // Restore items to their new segments
  for (const segment of state.segments.values()) {
    const restoredItems: { itemId: string; tileIndex: number }[] = [];
    for (let i = 0; i < segment.tiles.length; i++) {
      const key = beltKey(segment.tiles[i]);
      const items = itemsByTileKey.get(key);
      if (items) {
        for (const item of items) {
          restoredItems.push({ itemId: item.itemId, tileIndex: i });
        }
        itemsByTileKey.delete(key);
      }
    }

    // Sort by tile index descending (front items first = higher index = closer to end)
    restoredItems.sort((a, b) => b.tileIndex - a.tileIndex);

    for (let i = 0; i < restoredItems.length; i++) {
      const ri = restoredItems[i];
      const distFromEnd = segment.tiles.length - 1 - ri.tileIndex;
      const prevDist = i === 0 ? 0 : segment.tiles.length - 1 - restoredItems[i - 1].tileIndex;
      const gap = i === 0 ? distFromEnd : distFromEnd - prevDist;
      segment.items.push({
        itemId: ri.itemId as import('../core/types.ts').ItemId,
        distanceToNext: Math.max(0, gap),
      });
    }
  }
}
