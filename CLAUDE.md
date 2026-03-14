# CLAUDE.md — Sushi Belt Quick-Start Guide

## Project Overview

Sushi Belt is a cozy conveyor-belt automation game built with TypeScript + PixiJS v8. Simulation runs headless (no rendering dependency) — core logic is fully testable without a browser. All game content is data-driven — adding items/recipes/buildings requires zero system code changes.

## Commands

- `pnpm dev` — start Vite dev server
- `pnpm build` — type-check and build for production
- `pnpm test` — run all unit and integration tests (headless, no browser)
- `pnpm test:watch` — run tests in watch mode
- `pnpm lint` — lint with ESLint
- `pnpm format` — format with Prettier
- `pnpm atlas` — regenerate texture atlas from `assets/sprites/`

## Architecture Quick Reference

- `src/core/` — types, entity model, game state, game loop, event bus, save/load. **Start here** to understand the data model.
- `src/data/` — all game content (items, recipes, buildings, economy, upgrades). **Edit here** to add new content — no system code changes needed.
- `src/systems/` — simulation logic. Each system is a pure function: `(state, dt, events) => void`. Systems run in fixed order every tick.
- `src/rendering/` — PixiJS rendering layer. Read-only access to state. Never mutates game state.
- `src/input/` — mouse/keyboard handling, tool state, camera controls.
- `src/debug/` — dev-only inspection and commands. Not shipped in production.
- `tests/` — unit tests in `systems/`, integration tests in `integration/`, visual tests in `visual/`, helpers in `helpers/`.

## Key Files

- `src/core/types.ts` — all shared types (GridPosition, Direction, EntityId, etc.)
- `src/core/entity.ts` — Entity interface and component interfaces (SourceComponent has `outputBuffer`)
- `src/core/state.ts` — GameState shape and factory function
- `src/core/state.ts` — also contains belt grid helpers: `getBeltTile()`, `setBeltTile()`, `removeBeltTile()`, `beltKey()`
- `src/core/gameLoop.ts` — fixed-timestep game loop (60Hz), runs `sourceSystem` → `beltSystem` → `processorSystem` → `sellerSystem` → `economySystem` each tick
- `src/data/items.ts` — item definitions (`ITEMS` const, `DataItemId` type)
- `src/data/buildings.ts` — building definitions (`BUILDINGS` const, `BuildingId` type, `BuildingDefinition` interface)
- `src/data/recipes.ts` — recipe definitions (`RECIPES` const, `RecipeId` type; `cut_fish`: 1 fish → 2 fish_cuts in 2s)
- `src/data/economy.ts` — sell prices (`SELL_PRICES`)
- `src/data/upgrades.ts` — upgrade definitions (`UPGRADES` const, `UpgradeId` type; `belt_speed`: $50, max level 3)
- `src/systems/sourceSystem.ts` — source buildings produce items; pushes to connected belt segments, falls back to `outputBuffer`; skips processor entities
- `src/systems/processorSystem.ts` — IDLE→PROCESSING→output state machine; consumes from inventory, produces to outputBuffer, pushes to belt
- `src/systems/assemblerSystem.ts` — multi-input assembly; routes inventory items to input slots by type, assembles when all inputs present, produces outputs
- `src/systems/beltSystem.ts` — moves items along belt segments (transfer → advance per tick), topological ordering; handles splitter (round-robin), merger (alternating pull), and tunnel (teleport) transfers
- `src/systems/segmentBuilder.ts` — `rebuildSegments(state)` builds segment graph from belt grid (runs on belt placement, not per tick)
- `src/systems/sellerSystem.ts` — sells items from building inventories; checks category match and emits `itemSold` events
- `src/systems/economySystem.ts` — `createEconomySystem()` factory; `purchaseUnlock()` / `purchaseUpgrade()` for shop purchases; listens for `itemSold` events
- `src/systems/buildingPlacement.ts` — `placeBuilding()` / `removeBuilding()` with terrain + occupancy + **unlock gating**; seller buildings auto-get inventory; processor buildings get inventory + source outputBuffer
- `src/rendering/renderer.ts` — orchestrates all rendering layers
- `src/rendering/gridRenderer.ts` — terrain tiles, grid lines, tile highlight, placement ghost
- `src/rendering/buildingRenderer.ts` — draws buildings as colored rectangles with labels
- `src/rendering/beltRenderer.ts` — draws belt tiles as directional arrows and items on belt segments
- `src/rendering/spritePool.ts` — `SpritePool` class for reusable sprite objects (acquire/release/releaseAll)
- `src/rendering/itemRenderer.ts` — draws items from entity output buffers at connection points
- `src/rendering/uiRenderer.ts` — HUD overlay: funds display (`$XX`) and income rate (`$X/sec`), drawn on top of everything
- `src/input/shop.ts` — HTML shop panel controller; shows buildings (locked/affordable/unlocked) and upgrades; click-to-purchase
- `src/input/camera.ts` — pixi-viewport setup with drag-to-pan and scroll-to-zoom
- `src/input/inputManager.ts` — mouse tracking, screen-to-grid conversion, tool actions
- `src/input/tools.ts` — tool type union and tool state

## Belt Simulation Model

- Segment-based simulation (not per-item): contiguous same-direction belt tiles form a `BeltSegment`
- `rebuildSegments(state)` runs on belt placement/removal, NOT per tick — the tick just walks the pre-built graph
- Each segment has an ordered item queue; items advance by `speed × dt` each tick
- Transfer: front item reaching segment end pushes to `nextSegment` or `outputTarget` building
- Back-pressure: if output is blocked, items compress (gap clamped to 0) but don't overlap
- Segments process in topological order (sources first, sinks last)

## System Execution Order (per tick)

1. `sourceSystem` — sources produce items, push to connected belt segments (skips processors)
2. `beltSystem` — items move along belt segments (transfer → advance), delivers items to building inventories
3. `processorSystem` — consumes inputs from inventory, processes over time, produces outputs to belt
4. `assemblerSystem` — routes items to input slots by type, assembles when all slots filled, produces outputs
5. `sellerSystem` — iterates seller+inventory entities, sells matching items, emits `itemSold` events
6. `economySystem` — listens for `itemSold` events, updates `state.funds` and `state.stats`, emits `fundsChanged`
7. `events.flush()` — deferred event dispatch

## Controls

- **Left-click** — place building or start belt drag (depending on tool mode)
- **Left-click drag** — draw L-shaped belt path (in `place_belt` mode: horizontal first, then vertical)
- **Right-click** — delete belt tile or building under cursor
- **Right-click / middle-click drag** — pan camera
- **Scroll wheel** — zoom in/out
- **B key** — toggle between building and belt placement tools
- **X key** — toggle delete tool
- **Escape** — return to select mode

## Tool Modes

- `select` — default selection tool
- `place_building` — place a building on the grid (default on startup, with `fishing_boat` selected)
- `place_belt` — click-and-drag to draw L-shaped belt paths
- `delete` — click to remove buildings and belts

## First Playable Loop

Source → Belt → Seller = Income. The event flow:
1. `sourceSystem` produces items into belt segments
2. `beltSystem` moves items along belts and delivers to building inventories via `outputTarget`
3. `sellerSystem` finds items in seller inventories, removes them, emits `itemSold`
4. `economySystem` handles `itemSold` → updates `state.funds` and `state.stats` → emits `fundsChanged`

## Rendering Layer Order

1. Grid (terrain tiles + grid lines)
2. Belts (gray rectangles with directional arrows + items as colored circles)
3. Buildings (colored rectangles + labels)
4. Items (colored circles at building output points — for unbuffered items)
5. UI overlays (ghost preview, tile highlight)
6. HUD (funds display + income rate — fixed on screen, not affected by camera)

## Module Boundary Rules

- `core/` and `data/` must never import from `systems/`, `rendering/`, `input/`, or `debug/`
- `systems/` imports from `core/` and `data/` only
- `rendering/` imports from `core/` and `data/` only (read-only state access)
- This separation ensures the simulation can run headlessly in tests

## Testing Conventions

- Systems are pure functions — test by creating a minimal state, running the system, asserting state changes
- Use `createMinimalState()` and `createEntity()` helpers from test utilities
- Integration tests use `buildTestFactory()` to set up full production chains declaratively
- All tests run in Node (headless) — no browser needed for unit/integration tests
- Run `pnpm test` before pushing — all tests must pass

## How to Verify Changes

- **Added/changed a system?** Run its unit test: `pnpm test -- tests/systems/<system>.test.ts`
- **Added content (item/recipe/building)?** Run data validation: `pnpm test -- tests/data/validation.test.ts`
- **Changed belt logic?** Run belt + integration tests: `pnpm test -- tests/systems/beltSystem.test.ts tests/integration/`
- **Changed rendering?** Manual verification: `pnpm dev` and visually inspect in browser
- **Any change:** `pnpm build` must succeed (type-checks the whole project)

## Development Workflow

### Progress Tracking

- Milestone and task progress is tracked in `docs/milestones/PROGRESS.md`
- When you **start** a task, mark it `[x]` in PROGRESS.md and note the date
- When you **complete** a task, update PROGRESS.md with a short summary of what was done (e.g., "Done — added sourceSystem with tests")
- Before starting work, always read PROGRESS.md to understand what's already been completed and what's next
- Milestone docs live in `docs/milestones/M1-scaffolding.md` through `M10-polish.md` — read the relevant milestone doc for full task details

### Stay Focused — Don't Refactor Mid-Task

- If you notice something suboptimal, a potential bug, a design smell, or code that should be refactored — **do not fix it now**
- Instead, add it to the `## Backlog` section at the bottom of PROGRESS.md with a short description of what you noticed and where
- Examples: "Belt segment rebuild is O(n^2) — could use incremental rebuild (src/systems/segmentBuilder.ts)", "ProcessorComponent.progress should probably be clamped (src/systems/processorSystem.ts:45)"
- These items will be triaged and addressed in a future task or milestone
- The only exception: if the issue directly blocks your current task, fix it and note what you did

### Scope Discipline

- Each task targets a small number of files (typically 1-4). Stick to the files listed in the task
- Do not add features, refactor surrounding code, or "improve" things outside the task scope
- If the task description is ambiguous, check the engineering doc or PRD for clarification — don't guess
- Write tests for the code you add. Do not write tests for code you didn't change

### Handoff Between Sessions

- At the end of your session, ensure PROGRESS.md is up to date with exactly what you completed, what's in progress, and any blockers
- If you didn't finish a task, note what remains in PROGRESS.md so the next agent can pick up seamlessly
- Always commit and push your work before ending a session — even partial progress
