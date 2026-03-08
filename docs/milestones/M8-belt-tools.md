# Milestone 8: Belt Network Tools

Reference: [PRD — Belt Primitives](../PRD.md#belt-primitives) | [Engineering Doc — Splitters & Mergers](../ENGINEERING.md#splitters--mergers)

---

## Goal

Splitters, mergers, and tunnels are functional. The player can build complex belt networks: split one production line to feed multiple destinations, merge multiple sources into one belt, and cross belts underground. This is where "belt spaghetti" truly becomes the game.

## Evaluation Criteria

- **Human**: Split a fish cut belt to feed both a nigiri press and a direct sale. Merge two fish boat outputs into one belt. Use a tunnel to cross belts without intersection. The layout is now a real routing puzzle.
- **AI**: Create state with splitter feeding two destinations. Run ticks, verify items alternate between outputs (round-robin). Create state with merger, verify items from both inputs appear on output. Create tunnel, verify items pass through correctly.

---

## Tasks

### Task 8.1: Splitter data and entity

**Files:** `src/data/buildings.ts` (update), `src/core/entity.ts` (update)

- Add `SplitterComponent` to entity: `{ mode: 'round-robin' | 'filter'; filterItem?: ItemId; toggleState: boolean }`
- Add `splitter` building definition:
  - Size: 1x1, cost: 50 (unlock cost per PRD)
  - Components: `splitter` (new component type)
  - Connection points: 1 input (west), 2 outputs (northeast, southeast — or east-top, east-bottom)
- Splitters are unlocked via shop upgrade, not building unlock

### Task 8.2: Splitter logic in belt system

**Files:** `src/systems/beltSystem.ts` (update), `src/systems/segmentBuilder.ts` (update)

- When a segment ends at a splitter entity:
  - Splitter has two downstream segments (output A and output B)
  - Round-robin mode: alternate items between A and B (toggle flag)
  - If one output is blocked, send to the other; if both blocked, back-pressure
- Segment builder: when building segments, splitter creates a break point. One input segment connects to the splitter, two output segments start from it.
- Write test: `tests/systems/splitter.test.ts`
  - 4 items through splitter → 2 go to output A, 2 to output B
  - One output blocked → all items go to the other
  - Both blocked → items back up

### Task 8.3: Merger data and entity

**Files:** `src/data/buildings.ts` (update), `src/core/entity.ts` (update)

- Add `MergerComponent` to entity: `{ pullState: 0 | 1 }` (which input to pull from next)
- Add `merger` building definition:
  - Size: 1x1, cost: 75
  - Components: `merger`
  - Connection points: 2 inputs (northwest, southwest), 1 output (east)

### Task 8.4: Merger logic in belt system

**Files:** `src/systems/beltSystem.ts` (update), `src/systems/segmentBuilder.ts` (update)

- When a segment starts at a merger entity:
  - Merger has two upstream segments (input A and input B)
  - Alternating pull: take one item from A, then one from B
  - If one input is empty, take from the other (first-come-first-served)
  - If output is full, don't pull from either (back-pressure propagates upstream)
- Segment builder: merger creates two input segments ending at it and one output segment starting from it
- Write test: `tests/systems/merger.test.ts`
  - Items from both inputs alternate on output
  - One input empty → output gets all items from the other
  - Output blocked → neither input is consumed

### Task 8.5: Tunnel data and entity

**Files:** `src/data/buildings.ts` (update), `src/core/entity.ts` (update)

- Add `TunnelComponent` to entity: `{ pairedTunnelId: EntityId | null; length: number }`
- Tunnels are placed as entrance/exit pairs
- Add `tunnel_entrance` building definition:
  - Size: 1x1, cost: 300 (unlock cost)
  - Components: `tunnel`
  - Connection points: 1 input, 1 output (items teleport to paired exit)
- Tunnel placement: player places entrance, then exit. They auto-pair.

### Task 8.6: Tunnel logic in belt system

**Files:** `src/systems/beltSystem.ts` (update), `src/systems/segmentBuilder.ts` (update)

- Tunnel entrance and exit act as segment endpoints
- When an item reaches a tunnel entrance:
  - Teleport it to the paired tunnel exit's output segment (if there's space)
  - If exit belt is full, back-pressure
- Segment builder: tunnel entrance ends a segment, tunnel exit starts a new segment. They're linked logically but items don't traverse intermediate tiles.
- Write test: `tests/systems/tunnel.test.ts`
  - Items enter tunnel, appear at exit on next tick
  - Exit blocked → entrance blocks

### Task 8.7: Splitter/merger/tunnel rendering

**Files:** `src/rendering/beltRenderer.ts` (update)

- Splitter: draw as a Y-shape or fork icon, showing input and two output directions
- Merger: draw as an inverted Y-shape, showing two inputs merging into one output
- Tunnel entrance: draw as a downward arrow or hole icon
- Tunnel exit: draw as an upward arrow icon
- Connected tunnel pairs should have matching color or visual indicator

### Task 8.8: Integration test — complex belt network

**Files:** `tests/integration/beltNetwork.test.ts`

- Build a scenario with:
  - 2 fishing boats merging into 1 belt via merger
  - Belt goes to cutting board
  - Splitter after cutting board: one output to fish market, one to nigiri press
  - Rice line crosses the fish line using a tunnel
  - Nigiri output goes to sushi shop
- Run 3600 ticks
- Assert all pathways are functional: fish sold, fish cuts sold, nigiri sold
- Assert throughput is roughly balanced between splitter outputs
