# Milestone 10: Polish & Debug Tools

Reference: [Engineering Doc — AI Development & Testing](../ENGINEERING.md#ai-development--testing) | [Engineering Doc — Performance Budget](../ENGINEERING.md#performance-budget) | [PRD — Shop Upgrades](../PRD.md#shop-upgrades-purchased-separately)

---

## Goal

The game has all shop upgrades (belt speed, bulk cutting, fast cooker, etc.), a debug overlay for development, a state inspection API for AI agents, and performance is optimized for the targets in the engineering doc. The game is feature-complete for v1.

## Evaluation Criteria

- **Human**: Purchase belt speed upgrade — belts visibly move faster. Toggle debug overlay — see segment IDs, throughput numbers, grid coords. Game runs smoothly even with multiple production lines. The whole experience feels polished and cozy.
- **AI**: Use `inspectState()` to get a full report. Use `dumpGrid()` for ASCII representation. Use dev commands to set funds, unlock all, fast-forward. Verify performance: tick time < 4ms with a moderately complex factory. Verify upgrade effects: belt speed upgrade increases item movement speed.

---

## Tasks

### Task 10.1: Shop upgrades — belt speed

**Files:** `src/systems/beltSystem.ts` (update), `src/data/upgrades.ts` (update)

- Belt speed upgrade modifies the global belt speed multiplier
- `UPGRADES` defines: Belt Speed I ($100, 1.25x), Belt Speed II ($400, 1.5x)
- Belt system reads `state.upgrades['belt_speed']` to determine speed multiplier
- Apply multiplier to all segment speeds during tick
- Write test: verify items move faster after upgrade

### Task 10.2: Shop upgrades — production bonuses

**Files:** `src/systems/processorSystem.ts` (update), `src/systems/assemblerSystem.ts` (update), `src/data/upgrades.ts` (update)

- Bulk Cutting ($250): cutting board outputs 3 fish cuts instead of 2
  - Modify recipe output count based on upgrade level
- Fast Cooker ($200): rice cooker processes 50% faster
  - Modify processing time based on upgrade level
- Efficient Assembly ($800): all assembly stations process 30% faster
  - Modify assembly processing time based on upgrade level
- Write tests for each upgrade effect

### Task 10.3: Shop upgrades — extra building slots

**Files:** `src/systems/buildingPlacement.ts` (update), `src/data/upgrades.ts` (update)

- Extra Boat Slot ($150): allows placing one additional fishing boat (default: 1 max)
- Extra Paddy Slot ($150): allows placing one additional rice paddy (default: 1 max)
- Building placement checks current count of that building type against max allowed
- Max = base count + upgrade level
- Write test: can't place second boat without upgrade, can after purchasing

### Task 10.4: State inspection API

**Files:** `src/debug/inspect.ts`

- `inspectState(state)` → returns `InspectionReport` per engineering doc:
  - tick, funds, entity count, segment count
  - total items on belts
  - throughput per segment (items transferred out per second, averaged over last 60 ticks)
  - bottlenecks: segments where items are backed up (front item at distance 0 for extended time)
  - production rates: items produced per source per minute
  - income per second
- `dumpGrid(state)` → ASCII grid representation per engineering doc
  - `~` water, `.` empty land, directional arrows for belts
  - Building abbreviations (BB = boat, CC = cutter, NP = nigiri press, etc.)
- Both functions are pure — no side effects, no rendering dependency

### Task 10.5: Dev console commands

**Files:** `src/debug/commands.ts`

- Implement dev commands per engineering doc:
  - `setFunds(state, amount)` — directly set funds
  - `unlockAll(state)` — unlock everything
  - `spawnItem(state, itemId, segmentId)` — place item on a belt
  - `fastForward(loop, seconds)` — run N seconds of ticks instantly
  - `getState(state)` — return serialized state as object
  - `inspectSegment(state, id)` — return segment details
  - `measureThroughput(state)` — items/sec per seller
- Expose on `window.sushi` in dev builds only (`import.meta.env.DEV`)
- Write test: each command works correctly

### Task 10.6: Debug overlay renderer

**Files:** `src/rendering/debugRenderer.ts`

- Toggle-able overlay (press `F3` or backtick key)
- Display layers:
  - Grid coordinates on each tile (small gray text)
  - Belt segment IDs on each belt tile
  - Item count per segment
  - Throughput numbers at each seller (items/sec)
  - Building state: processing progress, inventory contents
- Click any entity to show full component data as JSON panel
- Performance stats in corner: tick time (ms), render time (ms), FPS, entity count

### Task 10.7: Performance monitor

**Files:** `src/debug/perf.ts`, `src/core/gameLoop.ts` (update)

- `PerfMonitor` class per engineering doc:
  - Ring buffer of last 60 tick times and render times
  - `recordTick(ms)`, `recordRender(ms)`, `advance()`
  - Getters: `avgTickMs`, `avgRenderMs`, `maxTickMs`, `maxRenderMs`
- Game loop measures tick and render duration, feeds to PerfMonitor
- Exposed via `window.sushi.perf()` for AI querying
- Write test: perf monitor correctly calculates averages

### Task 10.8: Texture atlas pipeline

**Files:** `scripts/pack-atlas.mjs`, `assets/sprites/` (placeholder PNGs)

- Set up `free-tex-packer-core` script per engineering doc
- Create placeholder sprite PNGs for all items, buildings, belts, and UI elements
  - Simple colored rectangles with labels (can be replaced with real art later)
  - Organized in subdirectories: `items/`, `buildings/`, `belts/`, `ui/`
- Script reads all PNGs from `assets/sprites/`, outputs `assets/atlas/atlas.png` + `assets/atlas/atlas.json`
- Add `assets/atlas/` to `.gitignore` (generated, not committed)
- Update renderers to use atlas sprites instead of colored rectangles (where applicable)
- Wire into `pnpm atlas` script

### Task 10.9: Replace colored rectangles with sprites

**Files:** `src/rendering/gridRenderer.ts` (update), `src/rendering/buildingRenderer.ts` (update), `src/rendering/beltRenderer.ts` (update)

- Load the texture atlas in `main.ts` using PixiJS Assets loader
- Replace colored rectangle rendering with sprite-based rendering:
  - Grid: terrain tile sprites (water texture, land texture)
  - Buildings: building sprites from atlas
  - Belts: belt tile sprites (straight, corner variants based on direction)
  - Items: item sprites (fish, rice, etc.) on belts
- Sprite pool uses atlas textures

### Task 10.10: Final integration test — full game evaluation

**Files:** `tests/integration/fullGame.test.ts`

- The comprehensive end-to-end test:
  - Create initial state
  - Progress through entire unlock tree using `fastForward` and purchases
  - Build a factory with every building type
  - Verify all production chains work (every recipe produces output)
  - Verify all items can be sold (every item has a sell price and a valid seller)
  - Verify save/load round-trip preserves full state
  - Verify state inspection API returns reasonable values
  - Verify no items are permanently stuck anywhere
  - Verify funds are monotonically increasing (economy isn't broken)
- This is the "does the whole game work?" test
