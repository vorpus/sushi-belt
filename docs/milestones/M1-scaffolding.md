# Milestone 1: Project Scaffolding & Core Types

Reference: [Engineering Doc — Stack](../ENGINEERING.md#stack-decision-summary) | [Engineering Doc — Project Structure](../ENGINEERING.md#project-structure)

---

## Goal

A working TypeScript + PixiJS project that builds, runs, and passes tests. Core type definitions and an empty game loop are in place. The browser shows a blank PixiJS canvas. All foundational infrastructure exists so subsequent milestones can focus on game logic.

## Evaluation Criteria

- `pnpm dev` launches Vite dev server and opens a blank PixiJS canvas (dark background)
- `pnpm build` produces a production bundle with no errors
- `pnpm test` runs and passes (at least one smoke test)
- `pnpm lint` passes
- Core types compile without errors
- Game loop runs at 60Hz (visible via console.log or requestAnimationFrame counter)

---

## Tasks

### Task 1.1: Initialize project with Vite + TypeScript

**Files:** `package.json`, `tsconfig.json`, `index.html`, `vite.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`

- Run `pnpm create vite` with vanilla-ts template (or set up manually)
- Configure `tsconfig.json` with strict mode, ES2022 target, paths
- Set up `vite.config.ts` per engineering doc (ES2022 build target, manual chunks for pixi, `__DEV__` define)
- Add `.eslintrc.cjs` and `.prettierrc` with standard config
- Update `.gitignore` to include `node_modules/`, `dist/`, `assets/atlas/`
- Add scripts to `package.json`: `dev`, `build`, `preview`, `lint`, `format`
- Install dependencies: `pixi.js`, `@pixi/viewport`
- Install dev dependencies: `vitest`, `eslint`, `prettier`, `typescript`

### Task 1.2: Core type definitions

**Files:** `src/core/types.ts`

Define all shared types used across the codebase:
- `GridPosition` (`{ x: number; y: number }`)
- `Direction` enum or union (`'north' | 'south' | 'east' | 'west'`)
- `EntityId` (string type alias)
- `SegmentId` (string type alias)
- `ItemId` (string type alias — will be narrowed in data layer)
- `Terrain` (`'water' | 'land'`)
- `GridCell` (`{ terrain: Terrain; entityId: EntityId | null }`)
- `Size` (`{ w: number; h: number }`)
- Direction utility helpers: `oppositeDirection()`, `directionToDelta()` (returns `{dx, dy}`)

### Task 1.3: Entity and component interfaces

**Files:** `src/core/entity.ts`

Define the Entity interface and all component interfaces per the engineering doc:
- `Entity` with `id`, `position`, and optional component fields
- `SourceComponent` — `{ produces: ItemId; interval: number; timer: number }`
- `ProcessorComponent` — `{ recipeId: string; progress: number; processing: boolean }`
- `AssemblerComponent` — `{ recipeId: string; progress: number; processing: boolean; inputSlots: Map<ItemId, number> }`
- `SellerComponent` — `{ acceptsCategories: string[] }`
- `BeltNodeComponent` — `{ inputs: ConnectionPoint[]; outputs: ConnectionPoint[] }`
- `InventoryComponent` — `{ items: ItemId[]; maxSize: number }`
- `BuildingComponent` — `{ buildingId: string; rotation: number }`
- `ConnectionPoint` — `{ side: Direction; offset: number }`
- `createEntity()` factory function that generates a unique ID

### Task 1.4: GameState interface and factory

**Files:** `src/core/state.ts`

- Define `GameState` interface per engineering doc (tick, funds, unlocks, entities, grid, beltGrid, segments, upgrades, stats)
- Define `BeltTile` — `{ direction: Direction; segmentId: SegmentId | null }`
- Define `BeltSegment` and `BeltItem` interfaces per engineering doc
- `createInitialState(gridWidth, gridHeight)` — creates a fresh state with an empty grid (water border, land center), zero funds, starter unlocks
- Grid initialization: top 3 rows are water, rest is land (simple starting layout)

### Task 1.5: Event bus

**Files:** `src/core/eventBus.ts`

- Implement `EventBus` class with typed event map (`GameEventMap`)
- `emit(type, payload)` — queues event
- `on(type, handler)` — registers handler
- `off(type, handler)` — unregisters handler
- `flush()` — dispatches all queued events to handlers, with max-iterations guard (10)
- Write a unit test: `tests/core/eventBus.test.ts`

### Task 1.6: Game loop (headless + rendered)

**Files:** `src/core/gameLoop.ts`

- Implement `GameLoop` class per engineering doc
- Fixed timestep at 60Hz with accumulator pattern
- `tick()` method — currently just increments `state.tick` (systems added in later milestones)
- `frame()` method — calls tick in accumulator loop, then calls renderer
- `start()` / `stop()` methods
- Max frame time cap at 250ms
- Support headless mode (no renderer) for testing
- Write a unit test: `tests/core/gameLoop.test.ts` — verify tick count after N simulated frames

### Task 1.7: Entry point with PixiJS canvas

**Files:** `src/main.ts`, `index.html`

- Initialize PixiJS `Application` with WebGL renderer
- Set canvas to fill viewport (CSS: `width: 100vw; height: 100vh; margin: 0`)
- Create `GameState` via `createInitialState()`
- Create `GameLoop` and start it
- The canvas should show a dark background — nothing else rendered yet
- Console log the tick count every second to verify the loop is running

### Task 1.8: Vitest configuration and smoke test

**Files:** `vitest.config.ts`, `tests/smoke.test.ts`

- Configure Vitest per engineering doc (node environment, coverage for `src/systems/` and `src/core/`)
- Write a smoke test that creates a `GameState`, runs 60 ticks, and asserts `state.tick === 60`
- Ensure `pnpm test` passes

### Task 1.9: Create CLAUDE.md

**Files:** `CLAUDE.md`

Create a `CLAUDE.md` file in the project root that serves as the quick-start guide for AI agents working on this codebase. This file is automatically read by Claude Code at session start and should contain everything an agent needs to be productive without reading the full engineering doc.

Contents to include:

#### Project overview (2-3 sentences)
- Sushi Belt is a cozy conveyor-belt automation game built with TypeScript + PixiJS v8
- Simulation runs headless (no rendering dependency) — core logic is fully testable without a browser
- All game content is data-driven — adding items/recipes/buildings requires zero system code changes

#### Commands
- `pnpm dev` — start Vite dev server
- `pnpm build` — type-check and build for production
- `pnpm test` — run all unit and integration tests (headless, no browser)
- `pnpm test:watch` — run tests in watch mode
- `pnpm lint` — lint with ESLint
- `pnpm format` — format with Prettier
- `pnpm atlas` — regenerate texture atlas from `assets/sprites/`

#### Architecture quick reference
Map of key directories and what they contain:
- `src/core/` — types, entity model, game state, game loop, event bus, save/load. **Start here** to understand the data model.
- `src/data/` — all game content (items, recipes, buildings, economy, upgrades). **Edit here** to add new content — no system code changes needed.
- `src/systems/` — simulation logic. Each system is a pure function: `(state, dt, events) => void`. Systems run in fixed order every tick.
- `src/rendering/` — PixiJS rendering layer. Read-only access to state. Never mutates game state.
- `src/input/` — mouse/keyboard handling, tool state, camera controls.
- `src/debug/` — dev-only inspection and commands. Not shipped in production.
- `tests/` — unit tests in `systems/`, integration tests in `integration/`, visual tests in `visual/`, helpers in `helpers/`.

#### Key files to know
- `src/core/types.ts` — all shared types (GridPosition, Direction, EntityId, etc.)
- `src/core/entity.ts` — Entity interface and component interfaces
- `src/core/state.ts` — GameState shape and factory function
- `src/core/gameLoop.ts` — fixed-timestep game loop (60Hz)
- `src/data/buildings.ts` — all building definitions (size, cost, components, connections)
- `src/data/recipes.ts` — all recipe definitions (inputs, outputs, processing time)
- `src/systems/beltSystem.ts` — segment-based belt simulation (the core of the game)
- `src/systems/segmentBuilder.ts` — rebuilds belt segment graph when belts are placed/removed

#### System execution order (per tick)
1. `sourceSystem` — sources produce items
2. `beltSystem` — items move along belt segments
3. `processorSystem` — single-recipe processing (e.g., cutting board)
4. `assemblerSystem` — multi-input assembly (e.g., nigiri press)
5. `sellerSystem` — items sold for money
6. `economySystem` — funds updated, unlocks checked
7. `events.flush()` — deferred event dispatch

#### Module boundary rules
- `core/` and `data/` must never import from `systems/`, `rendering/`, `input/`, or `debug/`
- `systems/` imports from `core/` and `data/` only
- `rendering/` imports from `core/` and `data/` only (read-only state access)
- This separation ensures the simulation can run headlessly in tests

#### Testing conventions
- Systems are pure functions — test by creating a minimal state, running the system, asserting state changes
- Use `createMinimalState()` and `createEntity()` helpers from test utilities
- Integration tests use `buildTestFactory()` to set up full production chains declaratively
- All tests run in Node (headless) — no browser needed for unit/integration tests
- Run `pnpm test` before pushing — all tests must pass

#### How to verify changes
- **Added/changed a system?** Run its unit test: `pnpm test -- tests/systems/<system>.test.ts`
- **Added content (item/recipe/building)?** Run data validation: `pnpm test -- tests/data/validation.test.ts`
- **Changed belt logic?** Run belt + integration tests: `pnpm test -- tests/systems/beltSystem.test.ts tests/integration/`
- **Changed rendering?** Manual verification: `pnpm dev` and visually inspect in browser
- **Any change:** `pnpm build` must succeed (type-checks the whole project)
