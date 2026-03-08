# Sushi Belt — Engineering Design Document

Reference: [PRD](./PRD.md)

---

## Table of Contents

1. [Stack Decision Summary](#stack-decision-summary)
2. [Rendering Engine](#rendering-engine)
3. [Architecture Overview](#architecture-overview)
4. [Belt Simulation](#belt-simulation)
5. [Data-Driven Content System](#data-driven-content-system)
6. [Game Loop](#game-loop)
7. [Event System](#event-system)
8. [State Management & Save/Load](#state-management--saveload)
9. [Rendering Layer](#rendering-layer)
10. [AI Development & Testing](#ai-development--testing)
11. [Build Tooling & Project Setup](#build-tooling--project-setup)
12. [Project Structure](#project-structure)
13. [Module Contracts](#module-contracts)
14. [Performance Budget](#performance-budget)

---

## Stack Decision Summary

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** (strict mode) | Type safety, AI-navigable, self-documenting |
| Renderer | **PixiJS v8** | Best-in-class 2D WebGL perf, TS-native, ~60KB gzipped, no opinions on game architecture |
| Camera/Viewport | **@pixi/viewport** | Pan, zoom, drag — handles camera math so we don't |
| Tilemap | **@pixi/tilemap** | Efficient tilemap rendering, or custom if needs diverge |
| Bundler | **Vite** | Instant HMR, native ESM, esbuild under the hood, zero-config TS |
| Test Runner | **Vitest** | Same Vite pipeline, native TS, fast watch mode, browser mode with Playwright |
| Visual Testing | **Playwright** (via Vitest browser mode) | Headless screenshots, pixel assertions, CI-friendly |
| Package Manager | **pnpm** | Fast, disk-efficient, strict dependency resolution |
| Linting | **ESLint** + **Prettier** | Consistent style, catch bugs statically |
| Asset Pipeline | **free-tex-packer-core** | Open-source texture atlas generation, scriptable |

### Why Not the Others

| Option | Reason to skip |
|---|---|
| **Phaser 3** | Opinionated Scene/GameObject model fights custom factory simulation. Ships ~300KB gzipped; we'd use <30% of it. TS types are community-maintained, not native. |
| **Godot HTML5** | HTML5 is a second-class export. 15-30MB WASM bundle. No TypeScript. Debugging browser export is painful. Locks us out of npm ecosystem. |
| **Excalibur.js** | Nice TS-native ECS, but smaller community and less battle-tested at high sprite counts. Built-in ECS can be replicated with lighter approach. |
| **Raw Canvas/WebGL** | Months of work to build what PixiJS gives day one. No upside for a cozy game. |
| **bitECS** | SoA TypedArray layout is overkill for our entity count. API is ergonomically painful for complex entities. Our hybrid approach gets composition without the ceremony. |

---

## Rendering Engine

### Why PixiJS v8

PixiJS is a pure 2D WebGL rendering engine — it draws sprites fast and stays out of our way. It does not impose a game loop, scene management, or entity architecture. We bring all of that.

Key capabilities we use:

- **Automatic sprite batching** — thousands of sprites sharing a texture atlas render in 1-2 draw calls.
- **ParticleContainer** — stripped-down container for massive sprite counts (belt items in late game). Supports 100K+ sprites at 60fps.
- **Container hierarchy** — serves as our scene graph and camera system. Pan/zoom = transform the root container.
- **Assets loader** — built-in spritesheet/atlas loading.
- **PixiJS v8's new renderer architecture** — improved batching, better WebGPU path for future.

### Rendering Strategy for Belt Items

Belt items are the performance-critical rendering case. Strategy:

1. **Texture atlas** — all item sprites packed into one atlas. One texture bind = one batch for all visible items.
2. **Object pool** — pre-allocate sprite objects. Items entering/leaving view take/return sprites from the pool. Zero GC pressure.
3. **Frustum culling** — only create sprites for items in visible belt segments. Simulation tracks 50K items; rendering touches ~500-2K.
4. **ParticleContainer fallback** — if standard Container batching isn't enough, belt items move to a ParticleContainer (limited features, maximum throughput).

---

## Architecture Overview

### Guiding Principles

- **Simulation is separate from rendering.** The simulation can run headlessly (tests, AI inspection) with no PixiJS dependency.
- **Systems are pure functions.** Each system takes `(state, dt, events)` and mutates state. No hidden globals, no singletons.
- **Data defines content.** Adding a new item/recipe/building = adding an entry to a data file. No system code changes.
- **Components compose entities.** A building that processes AND sells has both components. No class hierarchies.

### Hybrid Entity-Component Model

Not a full ECS framework — just typed component bags on plain objects:

```typescript
// core/entity.ts
type EntityId = string; // nanoid or incrementing

interface Entity {
  id: EntityId;
  position: GridPosition;
  // Component presence determines behavior
  source?: SourceComponent;        // produces items (boat, paddy, garden)
  processor?: ProcessorComponent;  // transforms items (cutting board, rice cooker)
  assembler?: AssemblerComponent;  // combines multiple inputs (nigiri press, maki roller)
  seller?: SellerComponent;        // consumes items for money (fish market, sushi shop)
  beltNode?: BeltNodeComponent;    // has belt connection points (inputs/outputs)
  inventory?: InventoryComponent;  // holds items being processed
  building?: BuildingComponent;    // grid footprint, sprite, rotation
}
```

Systems iterate entities and act on component presence:

```typescript
// systems/processorSystem.ts
export function processorSystem(state: GameState, dt: number, events: EventBus): void {
  for (const entity of state.entities.values()) {
    if (!entity.processor || !entity.inventory) continue;
    // ... processing logic
  }
}
```

This gives ECS-like composition (a building can be a processor AND a seller) without framework overhead. Components are plain interfaces — serializable, inspectable, testable.

---

## Belt Simulation

The belt system is the core of the game and the primary performance concern. We use the **segment-based simulation** approach proven by Factorio and Shapez.

### Why Not Per-Item Simulation

Naive approach: each item is an entity with a position, advancing each tick. O(n) where n = total items. At 10K items × 60 ticks/sec = 600K position updates/sec. The math is fine, but the overhead of entity lookups, component access, and cache misses makes this scale poorly.

### Segment-Based Model

A **belt segment** is a contiguous run of belt tiles in one direction, ending at a turn, junction, splitter, merger, or building I/O point.

```typescript
// core/beltSegment.ts
interface BeltSegment {
  id: SegmentId;
  tiles: GridPosition[];          // ordered tiles this segment covers
  direction: Direction;           // N, S, E, W
  speed: number;                  // tiles per second (from global belt speed tier)
  items: BeltItem[];              // ordered queue, front = index 0
  nextSegment: SegmentId | null;  // downstream segment
  outputTarget: EntityId | null;  // building this feeds into (if any)
  inputSource: EntityId | null;   // building this receives from (if any)
}

interface BeltItem {
  itemId: ItemId;
  distanceToNext: number;  // gap to item ahead, or to segment end
}
```

### Tick Algorithm

```
for each segment (in topological order, sources first):
  1. TRANSFER: if front item reached end (distanceToNext ≤ 0):
     - try push to outputTarget building, or
     - try push to nextSegment (if it has space at its tail)
     - on success: remove item, adjust next item's gap

  2. ADVANCE: for each item (front to back):
     - distanceToNext -= speed × dt
     - clamp to 0 (items don't overlap)

  3. OPTIMIZATION: if segment is fully packed (all gaps = 0)
     and output is blocked → skip entirely next tick
```

### Splitters & Mergers

- **Splitter**: one input segment, two output segments. Round-robin assignment (toggling flag). Filter upgrade changes assignment to item-type-based.
- **Merger**: two input segments, one output segment. Alternating pull (one item from each input per cycle). First-come-first-served when one input is empty.
- **Tunnel**: two segments connected logically, items teleport between exit points. Belt crossing without physical intersection.

### Segment Graph

When belts are placed/removed, rebuild the **segment graph**:

1. Walk connected belt tiles, break at direction changes and junctions.
2. Create `BeltSegment` objects.
3. Link `nextSegment` pointers.
4. Link `outputTarget` / `inputSource` to building entities at endpoints.

This rebuild happens on player action (placing/removing belts), not per tick. The tick just walks the pre-built graph.

---

## Data-Driven Content System

All game content (items, recipes, buildings) is defined in TypeScript data files using `as const satisfies` for type safety + literal inference.

### Items

```typescript
// data/items.ts
export const ITEMS = {
  fish:          { id: 'fish',          name: 'Fish',          category: 'raw',       sprite: 'item_fish' },
  fish_cut:      { id: 'fish_cut',      name: 'Fish Cut',      category: 'processed', sprite: 'item_fish_cut' },
  rice:          { id: 'rice',          name: 'Rice',          category: 'raw',       sprite: 'item_rice' },
  sushi_rice:    { id: 'sushi_rice',    name: 'Sushi Rice',    category: 'processed', sprite: 'item_sushi_rice' },
  seasoned_rice: { id: 'seasoned_rice', name: 'Seasoned Rice', category: 'processed', sprite: 'item_seasoned_rice' },
  nori:          { id: 'nori',          name: 'Nori',          category: 'raw',       sprite: 'item_nori' },
  vegetables:    { id: 'vegetables',    name: 'Vegetables',    category: 'raw',       sprite: 'item_vegetables' },
  pickled_veg:   { id: 'pickled_veg',   name: 'Pickled Veg',   category: 'processed', sprite: 'item_pickled_veg' },
  nigiri:        { id: 'nigiri',        name: 'Nigiri',        category: 'sushi',     sprite: 'item_nigiri' },
  maki:          { id: 'maki',          name: 'Maki Roll',     category: 'sushi',     sprite: 'item_maki' },
  gunkan:        { id: 'gunkan',        name: 'Gunkan',        category: 'sushi',     sprite: 'item_gunkan' },
  veggie_roll:   { id: 'veggie_roll',   name: 'Veggie Roll',   category: 'sushi',     sprite: 'item_veggie_roll' },
  temaki:        { id: 'temaki',        name: 'Temaki',        category: 'sushi',     sprite: 'item_temaki' },
} as const satisfies Record<string, ItemDefinition>;

export type ItemId = keyof typeof ITEMS;
```

### Recipes

```typescript
// data/recipes.ts
export const RECIPES = {
  cut_fish: {
    id: 'cut_fish',
    inputs: [{ item: 'fish', count: 1 }],
    outputs: [{ item: 'fish_cut', count: 2 }],
    processingTime: 2.0,
    building: 'cutting_board',
  },
  cook_rice: {
    id: 'cook_rice',
    inputs: [{ item: 'rice', count: 1 }],
    outputs: [{ item: 'sushi_rice', count: 1 }],
    processingTime: 3.0,
    building: 'rice_cooker',
  },
  season_rice: {
    id: 'season_rice',
    inputs: [{ item: 'sushi_rice', count: 1 }],
    outputs: [{ item: 'seasoned_rice', count: 1 }],
    processingTime: 2.0,
    building: 'seasoning_station',
  },
  pickle_veg: {
    id: 'pickle_veg',
    inputs: [{ item: 'vegetables', count: 1 }],
    outputs: [{ item: 'pickled_veg', count: 1 }],
    processingTime: 4.0,
    building: 'pickling_barrel',
  },
  make_nigiri: {
    id: 'make_nigiri',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }],
    outputs: [{ item: 'nigiri', count: 1 }],
    processingTime: 3.0,
    building: 'nigiri_press',
  },
  make_maki: {
    id: 'make_maki',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'seasoned_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'maki', count: 1 }],
    processingTime: 4.0,
    building: 'maki_roller',
  },
  make_gunkan: {
    id: 'make_gunkan',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'gunkan', count: 1 }],
    processingTime: 3.5,
    building: 'gunkan_wrapper',
  },
  make_veggie_roll: {
    id: 'make_veggie_roll',
    inputs: [{ item: 'pickled_veg', count: 1 }, { item: 'seasoned_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'veggie_roll', count: 1 }],
    processingTime: 4.0,
    building: 'veggie_roll_station',
  },
  make_temaki: {
    id: 'make_temaki',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }, { item: 'nori', count: 1 }, { item: 'pickled_veg', count: 1 }],
    outputs: [{ item: 'temaki', count: 1 }],
    processingTime: 5.0,
    building: 'temaki_station',
  },
} as const satisfies Record<string, RecipeDefinition>;
```

### Buildings

```typescript
// data/buildings.ts
export const BUILDINGS = {
  fishing_boat: {
    id: 'fishing_boat',
    name: 'Fishing Boat',
    size: { w: 2, h: 2 },
    cost: 0,
    terrain: 'water',
    components: { source: { produces: 'fish', interval: 3.0 } },
    connectionPoints: { outputs: [{ side: 'south', offset: 0 }] },
    unlockCost: 0,
    sprite: 'building_fishing_boat',
  },
  cutting_board: {
    id: 'cutting_board',
    name: 'Cutting Board',
    size: { w: 1, h: 1 },
    cost: 25,
    terrain: 'land',
    components: { processor: { recipeId: 'cut_fish' } },
    connectionPoints: {
      inputs: [{ side: 'west', offset: 0 }],
      outputs: [{ side: 'east', offset: 0 }],
    },
    unlockCost: 25,
    sprite: 'building_cutting_board',
  },
  // ... pattern repeats for all buildings
} as const satisfies Record<string, BuildingDefinition>;
```

### Sell Prices

```typescript
// data/economy.ts
export const SELL_PRICES: Record<ItemId, number> = {
  fish: 2,
  fish_cut: 5,
  rice: 1,
  sushi_rice: 3,
  seasoned_rice: 6,
  nori: 3,
  vegetables: 2,
  pickled_veg: 4,
  nigiri: 15,
  maki: 30,
  gunkan: 25,
  veggie_roll: 22,
  temaki: 50,
};
```

### Adding New Content

To add a new item (e.g., Shrimp Tempura):

1. Add entry to `data/items.ts` — defines ID, name, sprite.
2. Add entry to `data/recipes.ts` — defines inputs, outputs, processing time, building.
3. Add building entry to `data/buildings.ts` — defines size, cost, connection points.
4. Add sell price to `data/economy.ts`.
5. Add sprite to the texture atlas.

**Zero system code changes.** Systems operate on component types, not item/building identifiers.

---

## Game Loop

Fixed timestep simulation at 60Hz, decoupled from variable framerate rendering.

```typescript
// core/gameLoop.ts
const TICK_RATE = 60;
const TICK_DURATION_S = 1 / TICK_RATE;
const TICK_DURATION_MS = 1000 / TICK_RATE;
const MAX_FRAME_TIME_MS = 250; // cap to prevent spiral-of-death

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private state: GameState;
  private events: EventBus;
  private renderer: Renderer;

  tick(): void {
    // Fixed-order system execution — deterministic
    sourceSystem(this.state, TICK_DURATION_S, this.events);
    beltSystem(this.state, TICK_DURATION_S, this.events);
    processorSystem(this.state, TICK_DURATION_S, this.events);
    assemblerSystem(this.state, TICK_DURATION_S, this.events);
    sellerSystem(this.state, TICK_DURATION_S, this.events);
    economySystem(this.state, this.events);
    this.events.flush();
    this.state.tick++;
  }

  frame(currentTime: number): void {
    const frameTime = Math.min(currentTime - this.lastTime, MAX_FRAME_TIME_MS);
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    while (this.accumulator >= TICK_DURATION_MS) {
      this.tick();
      this.accumulator -= TICK_DURATION_MS;
    }

    const alpha = this.accumulator / TICK_DURATION_MS; // interpolation factor
    this.renderer.render(this.state, alpha);

    if (this.running) requestAnimationFrame((t) => this.frame(t));
  }
}
```

### System Execution Order

```
1. sourceSystem     — boats/paddies/farms produce items onto output belts
2. beltSystem       — move items along belt segments, handle transfers
3. processorSystem  — cutting boards, rice cookers consume + produce
4. assemblerSystem  — nigiri press, maki roller consume multiple inputs + produce
5. sellerSystem     — markets and shops consume items, queue payment events
6. economySystem    — process payment events, check unlock thresholds
7. events.flush()   — dispatch all queued events to listeners
```

Order matters: sources produce → belts move → machines consume → sellers sell → money arrives. This prevents items being created and consumed in the same tick (one-tick-delay principle).

### Headless Mode

For testing and AI inspection, the game loop runs without a renderer:

```typescript
// Can run N ticks instantly with no rendering
for (let i = 0; i < 1000; i++) {
  gameLoop.tick();
}
// Then inspect state
```

---

## Event System

Typed, synchronous event bus with deferred processing. Events are queued during system execution and flushed at the end of each tick.

```typescript
// core/eventBus.ts
interface GameEventMap {
  itemSold:         { itemId: ItemId; value: number; sellerId: EntityId };
  itemProduced:     { itemId: ItemId; sourceId: EntityId };
  recipeCompleted:  { recipeId: string; buildingId: EntityId };
  buildingPlaced:   { buildingDef: string; position: GridPosition; entityId: EntityId };
  buildingRemoved:  { entityId: EntityId };
  fundsChanged:     { oldAmount: number; newAmount: number };
  unlockPurchased:  { unlockId: string };
  beltPlaced:       { position: GridPosition; direction: Direction };
  beltRemoved:      { position: GridPosition };
  segmentRebuilt:   { affectedSegments: SegmentId[] };
}
```

### Why Deferred Flush

Systems run in a fixed order. If `sellerSystem` emits `itemSold` and `economySystem` handles it immediately (synchronous dispatch), the handler might mutate state that `sellerSystem` is still iterating. Deferred flush avoids re-entrancy:

1. Systems run, emitting events into a queue.
2. After all systems finish, `events.flush()` dispatches queued events to handlers.
3. Handlers may emit new events — those go into the next flush cycle.
4. Flush repeats until the queue is empty (bounded by a max-iterations guard).

---

## State Management & Save/Load

### GameState Shape

```typescript
// core/state.ts
interface GameState {
  tick: number;
  funds: number;
  unlocks: Set<string>;           // unlocked building/upgrade IDs
  entities: Map<EntityId, Entity>;
  grid: GridCell[][];             // 2D array — terrain + placed building ref
  beltGrid: Map<string, BeltTile>; // "x,y" → belt direction + segment ref
  segments: Map<SegmentId, BeltSegment>;
  upgrades: Record<string, number>; // upgrade ID → level
  stats: {
    totalItemsSold: number;
    totalMoneyEarned: number;
    totalTicksPlayed: number;
    itemsSoldByType: Record<string, number>;
  };
}
```

### Serialization

```typescript
// core/save.ts
export function serialize(state: GameState): string {
  return JSON.stringify({
    version: 1, // schema version for migrations
    tick: state.tick,
    funds: state.funds,
    unlocks: [...state.unlocks],
    entities: [...state.entities.entries()],
    beltGrid: [...Object.entries(state.beltGrid)],
    segments: [...state.segments.entries()],
    upgrades: state.upgrades,
    stats: state.stats,
    // grid is derived from entities on load — don't serialize
  });
}

export function deserialize(json: string): GameState {
  const raw = JSON.parse(json);
  // version migration logic here
  const state = buildStateFromRaw(raw);
  rebuildGrid(state);       // reconstruct grid from entities
  rebuildSegments(state);   // reconstruct segment graph from belt tiles
  return state;
}
```

Save to `localStorage`. Auto-save every 60 seconds. Manual save/load via UI.

---

## Rendering Layer

The rendering layer reads `GameState` and draws — it never mutates game state.

### Renderer Architecture

```
rendering/
  renderer.ts          — orchestrator: clears, draws layers in order
  gridRenderer.ts      — draws terrain tiles (water, land)
  beltRenderer.ts      — draws belt tiles (arrows/tracks) + items on belts
  buildingRenderer.ts  — draws building sprites at grid positions
  uiRenderer.ts        — HUD overlay: funds, stats, selected tool
  shopRenderer.ts      — shop panel UI
  debugRenderer.ts     — debug overlay (segment IDs, throughput, grid coords)
```

### Belt Item Rendering

Belt items are rendered from segment data, not from individual entity positions:

```
for each visible segment:
  walk segment's tile path
  for each item in segment.items:
    compute world position from tile path + cumulative distance
    grab sprite from object pool
    set sprite position (with interpolation using alpha)
    set sprite texture to item's atlas frame
```

Items off-screen get their pooled sprites returned. This keeps rendered sprite count proportional to visible area, not total items.

### Object Pool

```typescript
// rendering/spritePool.ts
class SpritePool {
  private available: Sprite[] = [];
  private active: Set<Sprite> = new Set();

  acquire(): Sprite { /* pop from available or create new */ }
  release(sprite: Sprite): void { /* remove from stage, push to available */ }
  releaseAll(): void { /* bulk return for frame reset */ }
}
```

Pre-warm pool with ~1000 sprites on startup. Grows on demand, never shrinks.

---

## AI Development & Testing

This game is built entirely by AI. Every architectural decision considers: *can an AI agent test this, inspect this, and modify this without playing the game visually?*

### Testing Strategy

#### Unit Tests (Vitest — headless, no browser)

Each system is a pure function. Test in isolation:

```typescript
// tests/systems/processorSystem.test.ts
test('cutting board produces 2 fish cuts from 1 fish', () => {
  const state = createMinimalState();
  const events = new EventBus();
  const cuttingBoard = createEntity('cutting_board', { x: 0, y: 0 });
  placeItemInInventory(cuttingBoard, 'fish');
  state.entities.set(cuttingBoard.id, cuttingBoard);

  // Run processor system for enough ticks to complete recipe
  for (let i = 0; i < 120; i++) { // 2 seconds × 60 ticks
    processorSystem(state, 1/60, events);
  }

  expect(getOutputItems(cuttingBoard)).toEqual([
    { itemId: 'fish_cut', count: 2 }
  ]);
});
```

#### Integration Tests (Vitest — headless)

Simulate full production chains without rendering:

```typescript
test('fish → cutting board → belt → nigiri press + rice → sushi shop produces income', () => {
  const state = buildTestFactory({
    // Declarative factory layout for testing
    buildings: [
      { type: 'fishing_boat', pos: { x: 0, y: 0 } },
      { type: 'cutting_board', pos: { x: 3, y: 0 } },
      { type: 'rice_paddy', pos: { x: 0, y: 3 } },
      { type: 'rice_cooker', pos: { x: 3, y: 3 } },
      { type: 'nigiri_press', pos: { x: 6, y: 1 } },
      { type: 'sushi_shop', pos: { x: 9, y: 1 } },
    ],
    belts: [
      // auto-route belts between buildings
      { from: { x: 0, y: 0 }, to: { x: 3, y: 0 } },
      { from: { x: 3, y: 0 }, to: { x: 6, y: 1, input: 0 } },
      { from: { x: 0, y: 3 }, to: { x: 3, y: 3 } },
      { from: { x: 3, y: 3 }, to: { x: 6, y: 1, input: 1 } },
      { from: { x: 6, y: 1 }, to: { x: 9, y: 1 } },
    ],
  });

  // Run 30 simulated seconds
  runTicks(state, 30 * 60);

  expect(state.funds).toBeGreaterThan(0);
  expect(state.stats.itemsSoldByType['nigiri']).toBeGreaterThan(0);
});
```

#### Visual Tests (Vitest Browser Mode + Playwright)

For rendering correctness, run in a real browser headlessly:

```typescript
// tests/visual/beltRendering.test.ts
test('belt items render at correct positions', async () => {
  const game = await launchGameInBrowser({ scenario: 'single_belt_with_items' });
  await game.waitForTicks(60);
  const screenshot = await game.screenshot();
  await expect(screenshot).toMatchSnapshot('belt-items-position');
});
```

### State Inspection API

A debug module exposes game state in formats AI can reason about:

```typescript
// debug/inspect.ts
export function inspectState(state: GameState): InspectionReport {
  return {
    tick: state.tick,
    funds: state.funds,
    entityCount: state.entities.size,
    segmentCount: state.segments.size,
    totalItemsOnBelts: countBeltItems(state),
    throughputPerSegment: measureThroughput(state),
    bottlenecks: findBottlenecks(state),  // segments where items are backed up
    productionRates: calculateProductionRates(state),
    incomePerSecond: calculateIncomeRate(state),
  };
}

// ASCII grid dump for terminal inspection
export function dumpGrid(state: GameState): string {
  // Returns a text representation:
  // ~~BB..CC..NP..SS
  // ~~BB..CC..NP..SS
  // ..RP..RK........
  // Legend: ~ water, B boat, C cutter, NP nigiri press, etc.
  // Belt directions shown as arrows: → ← ↑ ↓
}
```

### Dev Console / Cheat Commands

Available in dev builds, callable from browser console or from test code:

```typescript
// debug/commands.ts
export const devCommands = {
  setFunds: (state: GameState, amount: number) => { state.funds = amount; },
  unlockAll: (state: GameState) => { /* unlock everything */ },
  spawnItem: (state: GameState, itemId: ItemId, pos: GridPosition) => { /* place item */ },
  fastForward: (loop: GameLoop, seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) loop.tick();
  },
  getState: (state: GameState) => JSON.parse(serialize(state)),
  inspectSegment: (state: GameState, id: SegmentId) => { /* segment details */ },
  measureThroughput: (state: GameState) => { /* items/sec per seller */ },
};

// Exposed on window in dev builds
if (import.meta.env.DEV) {
  (window as any).sushi = devCommands;
}
```

### Debug Overlay

Toggle-able overlay rendered on top of the game (dev builds only):

- **Grid coordinates** on hover.
- **Belt segment IDs** and item counts per segment.
- **Throughput numbers** (items/sec) at each seller.
- **Building state** (processing progress bar, inventory contents).
- **Entity inspector** — click any building to see its full component data as JSON.

---

## Build Tooling & Project Setup

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,  // don't inline sprites as base64
    rollupOptions: {
      output: { manualChunks: { pixi: ['pixi.js'] } },
    },
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node', // headless by default — no browser needed for unit/integration
    coverage: { provider: 'v8', include: ['src/systems/**', 'src/core/**'] },
    // Browser mode config for visual tests
    browser: {
      enabled: false, // opt-in per test file
      provider: 'playwright',
      headless: true,
    },
  },
});
```

### Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:visual": "vitest run --browser.enabled",
    "lint": "eslint src/ tests/",
    "format": "prettier --write src/ tests/",
    "atlas": "node scripts/pack-atlas.mjs"
  }
}
```

### Asset Pipeline

Sprites are organized as individual PNGs in `assets/sprites/`. A script packs them into a texture atlas at build time using `free-tex-packer-core`:

```
assets/
  sprites/
    items/         — item_fish.png, item_rice.png, ...
    buildings/     — building_fishing_boat.png, ...
    belts/         — belt_straight.png, belt_corner.png, ...
    ui/            — button_buy.png, panel_bg.png, ...
  atlas/           — generated: atlas.png + atlas.json (gitignored)
```

The `pnpm atlas` script generates the atlas. Vite serves `assets/atlas/` in dev mode.

---

## Project Structure

```
sushi-belt/
├── docs/
│   ├── PRD.md                    # Product requirements
│   └── ENGINEERING.md            # This document
├── assets/
│   └── sprites/                  # Source PNGs (committed)
│       ├── items/
│       ├── buildings/
│       ├── belts/
│       └── ui/
├── src/
│   ├── main.ts                   # Entry point: init PixiJS, start game loop
│   ├── core/
│   │   ├── types.ts              # GridPosition, Direction, EntityId, etc.
│   │   ├── entity.ts             # Entity interface + component interfaces
│   │   ├── state.ts              # GameState interface + factory functions
│   │   ├── gameLoop.ts           # Fixed timestep loop
│   │   ├── eventBus.ts           # Typed event bus
│   │   └── save.ts               # Serialize / deserialize
│   ├── data/
│   │   ├── items.ts              # Item definitions
│   │   ├── recipes.ts            # Recipe definitions
│   │   ├── buildings.ts          # Building definitions
│   │   ├── economy.ts            # Sell prices, upgrade costs
│   │   └── upgrades.ts           # Upgrade definitions
│   ├── systems/
│   │   ├── sourceSystem.ts       # Source buildings produce items
│   │   ├── beltSystem.ts         # Belt segment simulation
│   │   ├── processorSystem.ts    # Single-recipe processors
│   │   ├── assemblerSystem.ts    # Multi-input assembly
│   │   ├── sellerSystem.ts       # Sell items for money
│   │   ├── economySystem.ts      # Fund management, unlock checks
│   │   └── buildingPlacement.ts  # Place/remove buildings, rebuild segments
│   ├── rendering/
│   │   ├── renderer.ts           # Orchestrator
│   │   ├── gridRenderer.ts       # Terrain tiles
│   │   ├── beltRenderer.ts       # Belt tiles + items
│   │   ├── buildingRenderer.ts   # Building sprites
│   │   ├── uiRenderer.ts         # HUD
│   │   ├── shopRenderer.ts       # Shop panel
│   │   ├── spritePool.ts         # Object pool for belt item sprites
│   │   └── debugRenderer.ts      # Debug overlay (dev only)
│   ├── input/
│   │   ├── inputManager.ts       # Mouse/keyboard event handling
│   │   ├── tools.ts              # Belt tool, building tool, delete tool
│   │   └── camera.ts             # Pan/zoom controls
│   └── debug/
│       ├── inspect.ts            # State inspection + ASCII dump
│       └── commands.ts           # Dev console commands
├── tests/
│   ├── systems/                  # Unit tests per system
│   │   ├── beltSystem.test.ts
│   │   ├── processorSystem.test.ts
│   │   ├── assemblerSystem.test.ts
│   │   └── sellerSystem.test.ts
│   ├── integration/              # Full chain integration tests
│   │   ├── productionChain.test.ts
│   │   └── progression.test.ts
│   ├── visual/                   # Browser-mode visual tests
│   │   └── beltRendering.test.ts
│   └── helpers/                  # Test utilities
│       ├── stateBuilder.ts       # Build test states declaratively
│       └── testFactory.ts        # Build test factory layouts
├── scripts/
│   └── pack-atlas.mjs            # Texture atlas generation script
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .eslintrc.cjs
└── .prettierrc
```

### Module Boundary Rules

| Module | May import from | May NOT import from |
|---|---|---|
| `core/` | Only `core/` and `data/` | `systems/`, `rendering/`, `input/`, `debug/` |
| `data/` | Only `core/types.ts` | Everything else |
| `systems/` | `core/`, `data/` | `rendering/`, `input/`, `debug/` |
| `rendering/` | `core/`, `data/` (read-only state access) | `systems/`, `input/` |
| `input/` | `core/`, `systems/` (calls placement functions) | `rendering/` (except querying viewport) |
| `debug/` | Everything (dev-only, not shipped in prod) | — |
| `tests/` | Everything | — |

This ensures the simulation (`core/` + `systems/` + `data/`) has zero rendering dependencies and can run headlessly.

---

## Module Contracts

### System Function Signature

Every system follows the same contract:

```typescript
type SystemFn = (state: GameState, dt: number, events: EventBus) => void;
```

- **state**: mutable reference to game state. Systems mutate in place.
- **dt**: fixed timestep delta in seconds (always `1/60`).
- **events**: event bus for emitting events. Never handle events during system execution — only emit.

### Building Registration

Buildings auto-register based on their component configuration in `data/buildings.ts`. No switch statements, no building-type-specific code in systems. The `processorSystem` doesn't know what a "cutting board" is — it only knows that an entity has a `processor` component with a `recipeId`, and it looks up that recipe in `RECIPES`.

### Recipe Validation (Build-Time)

A build-time script (or test) validates all data files:

- Every recipe references valid item IDs.
- Every building references a valid recipe ID (if it has a processor/assembler component).
- Every item has a sell price.
- Every building has valid connection point geometry.
- No circular recipe dependencies.

This catches content errors before runtime.

---

## Performance Budget

### Target: 60fps with 5,000 belt items visible, 50,000 total

| Metric | Budget | Strategy |
|---|---|---|
| Simulation tick | < 4ms | Segment-based belts, O(segments) not O(items) |
| Render frame | < 8ms | Sprite batching, object pool, frustum culling |
| Total frame | < 16ms | 4ms sim + 8ms render + 4ms headroom |
| Memory | < 200MB | Object pooling, no per-frame allocations |
| Draw calls | < 10 | Single texture atlas, batched rendering |
| GC pauses | < 1ms | Object pool, avoid allocations in hot paths |

### Hot Path Rules

In systems that run every tick:

- No object allocations (`new`, `{}`, `[]`, `.map()`, `.filter()`). Use pre-allocated buffers.
- No string concatenation for map keys. Use numeric IDs or pre-computed keys.
- No `Map.forEach()` — use `for...of` (avoids closure allocation).
- No `Array.push()` in tight loops if avoidable — use index-based writes to pre-allocated arrays.

### Profiling

PixiJS has built-in stats. Additionally:

```typescript
// debug/perf.ts
export class PerfMonitor {
  tickTimes: number[] = new Array(60).fill(0);
  renderTimes: number[] = new Array(60).fill(0);
  frameIndex = 0;

  recordTick(ms: number): void { this.tickTimes[this.frameIndex % 60] = ms; }
  recordRender(ms: number): void { this.renderTimes[this.frameIndex % 60] = ms; }
  advance(): void { this.frameIndex++; }

  get avgTickMs(): number { return avg(this.tickTimes); }
  get avgRenderMs(): number { return avg(this.renderTimes); }
}
```

Displayed in debug overlay. Also queryable via `window.sushi.perf()` for AI inspection.
