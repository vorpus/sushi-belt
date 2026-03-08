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
- `src/core/gameLoop.ts` — fixed-timestep game loop (60Hz), runs `sourceSystem` each tick
- `src/data/items.ts` — item definitions (`ITEMS` const, `DataItemId` type)
- `src/data/buildings.ts` — building definitions (`BUILDINGS` const, `BuildingId` type, `BuildingDefinition` interface)
- `src/data/recipes.ts` — recipe definitions (`RECIPES` const, empty for now)
- `src/data/economy.ts` — sell prices (`SELL_PRICES`)
- `src/systems/sourceSystem.ts` — source buildings produce items into `outputBuffer`
- `src/systems/buildingPlacement.ts` — `placeBuilding()` / `removeBuilding()` with terrain + occupancy validation
- `src/rendering/renderer.ts` — orchestrates all rendering layers
- `src/rendering/gridRenderer.ts` — terrain tiles, grid lines, tile highlight, placement ghost
- `src/rendering/buildingRenderer.ts` — draws buildings as colored rectangles with labels
- `src/rendering/itemRenderer.ts` — draws items from entity output buffers at connection points
- `src/input/camera.ts` — pixi-viewport setup with drag-to-pan and scroll-to-zoom
- `src/input/inputManager.ts` — mouse tracking, screen-to-grid conversion, tool actions
- `src/input/tools.ts` — tool type union and tool state

## System Execution Order (per tick)

1. `sourceSystem` — sources produce items
2. `beltSystem` — items move along belt segments
3. `processorSystem` — single-recipe processing (e.g., cutting board)
4. `assemblerSystem` — multi-input assembly (e.g., nigiri press)
5. `sellerSystem` — items sold for money
6. `economySystem` — funds updated, unlocks checked
7. `events.flush()` — deferred event dispatch

## Controls

- **Left-click** — place building (when in `place_building` tool mode)
- **Right-click / middle-click drag** — pan camera
- **Scroll wheel** — zoom in/out

## Tool Modes

- `select` — default selection tool
- `place_building` — place a building on the grid (default on startup, with `fishing_boat` selected)
- `place_belt` — place belt segments (not yet implemented)
- `delete` — remove buildings and belts (not yet implemented)

## Rendering Layer Order

1. Grid (terrain tiles + grid lines)
2. Buildings (colored rectangles + labels)
3. Items (colored circles at building output points)
4. UI overlays (ghost preview, tile highlight)

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
