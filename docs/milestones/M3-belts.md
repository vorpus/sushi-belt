# Milestone 3: Belts Move Items

Reference: [Engineering Doc — Belt Simulation](../ENGINEERING.md#belt-simulation) | [PRD — Belt System](../PRD.md#belt-system-core-mechanic)

---

## Goal

The player can draw belts on the grid. Items from source buildings flow onto belts and move along them. The segment-based belt simulation is fully functional. Items reaching the end of a belt with no destination simply stop (back-pressure).

## Evaluation Criteria

- **Human**: Place a fishing boat, draw a belt path leading away from it. Watch fish appear and slide along the belt. Items stop at the end and back up — the belt pauses when full. Delete a belt segment and watch the path re-route.
- **AI**: Create a state with a boat and a belt path, run 600 ticks (10 seconds). Verify items are distributed along belt segments. Verify back-pressure works (items don't overlap). Inspect segment data to confirm correct topology.

---

## Tasks

### Task 3.1: Belt grid data structure

**Files:** `src/core/state.ts` (update), `src/core/types.ts` (update)

- Ensure `BeltTile`, `BeltSegment`, `BeltItem` types are fully defined per engineering doc
- Add helper functions:
  - `getBeltTile(state, pos)` — returns BeltTile or null
  - `setBeltTile(state, pos, direction)` — sets a belt tile
  - `removeBeltTile(state, pos)` — removes a belt tile
- Belt grid uses string key `"x,y"` for Map lookup

### Task 3.2: Segment graph builder

**Files:** `src/systems/segmentBuilder.ts`

This is the most critical piece of the belt system:
- `rebuildSegments(state)` — clears all segments and rebuilds from belt grid
  - Walk all belt tiles
  - Group contiguous same-direction tiles into segments
  - Break segments at: direction changes, junctions (multiple inputs/outputs), building I/O points
  - Create `BeltSegment` objects with ordered tile lists
  - Link `nextSegment` pointers between connected segments
  - Link `outputTarget` / `inputSource` to building entities at segment endpoints
  - Assign segment IDs to belt tiles in the belt grid
- Write test: `tests/systems/segmentBuilder.test.ts`
  - Straight line of 5 belts → 1 segment with 5 tiles
  - L-shaped belt path → 2 segments (direction change)
  - Belt ending at a building input → segment.outputTarget set correctly
  - Belt starting at a building output → segment.inputSource set correctly

### Task 3.3: Belt placement tool

**Files:** `src/input/tools.ts` (update), `src/input/inputManager.ts` (update)

- Add belt placement tool mode
- Click-and-drag to draw a belt path:
  - On mouse down: record start position
  - On mouse move (while dragging): compute an L-shaped path from start to current position (horizontal first, then vertical — or whichever makes a simpler path)
  - On mouse up: place all belt tiles along the path
  - Auto-determine direction for each tile based on path direction
- After placing belts, call `rebuildSegments(state)`
- Add keyboard shortcut to toggle between building tool and belt tool (e.g., `B` key)
- Right-click on a belt tile to delete it (call `removeBeltTile`, then `rebuildSegments`)

### Task 3.4: Belt renderer

**Files:** `src/rendering/beltRenderer.ts`

- Iterate belt grid, draw belt tiles as directional arrows/chevrons
- Use simple graphics: a rectangle with an arrow pointing in the belt's direction
- Color belts gray/silver
- Highlight belt under cursor
- Add to renderer layer ordering (grid → belts → buildings → items)

### Task 3.5: Belt system — item movement

**Files:** `src/systems/beltSystem.ts`

Implement the core tick algorithm per engineering doc:
- Process segments in topological order (sources first, sinks last)
- For each segment:
  1. **TRANSFER**: If front item reached end (`distanceToNext <= 0`):
     - Try push to `outputTarget` building (into its inventory)
     - Try push to `nextSegment` (if it has space at tail)
     - On success: remove item, adjust next item's gap
  2. **ADVANCE**: For each item (front to back):
     - `distanceToNext -= speed * dt`
     - Clamp to 0 (items compress but don't overlap)
  3. **SKIP optimization**: If segment fully packed and output blocked, mark as blocked
- Wire `beltSystem` into game loop (runs after `sourceSystem`)
- Write test: `tests/systems/beltSystem.test.ts`
  - Single segment with one item: item advances each tick
  - Item reaches segment end with no next: item stops at 0
  - Two connected segments: item transfers from first to second
  - Back-pressure: full segment blocks upstream items

### Task 3.6: Source system → belt integration

**Files:** `src/systems/sourceSystem.ts` (update)

- When a source produces an item, instead of buffering it, push it onto the belt segment connected to the building's output connection point
- Look up the segment via the belt grid tile adjacent to the output connection point
- If no belt connected or belt is full, buffer the item (existing behavior) — try again next tick
- Update tests to cover belt integration

### Task 3.7: Belt item rendering

**Files:** `src/rendering/beltRenderer.ts` (update), `src/rendering/spritePool.ts`

- Create `SpritePool` class per engineering doc — acquire/release/releaseAll
- Render items on belts by walking each visible segment's item list
- Compute world position: segment tile path + cumulative distance from segment end
- Use interpolation alpha from game loop for smooth rendering between ticks
- Items render as small colored circles on top of belt arrows
- Replace the temporary ground-item rendering from M2 — items now only render on belts

### Task 3.8: Delete tool for belts and buildings

**Files:** `src/input/tools.ts` (update)

- Right-click on a belt tile: remove it, rebuild segments
- Right-click on a building: remove it via `removeBuilding()`, rebuild segments
- Items on deleted belt segments are destroyed (they just disappear — no penalty per PRD)
- Add visual feedback: highlight in red on hover when delete would apply

### Task 3.9: Update CLAUDE.md

**Files:** `CLAUDE.md`

Update CLAUDE.md to reflect everything introduced in this milestone:
- Add `src/systems/beltSystem.ts` and `src/systems/segmentBuilder.ts` to key files with descriptions
- Add `src/rendering/beltRenderer.ts` and `src/rendering/spritePool.ts` to key files
- Document the belt simulation model: segment-based, not per-item; `rebuildSegments()` runs on belt placement, not per tick
- Note that `beltSystem` is now wired into the game loop (runs after `sourceSystem`)
- Update the system execution order to show `sourceSystem → beltSystem` as active
- Document how belt placement works (click-drag for L-shaped paths, right-click to delete)
