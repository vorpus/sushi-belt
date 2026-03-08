# Milestone 2: The Living Grid

Reference: [PRD — Map & Grid](../PRD.md#map--grid) | [Engineering Doc — Rendering Layer](../ENGINEERING.md#rendering-layer)

---

## Goal

A visible grid with water and land terrain, camera pan/zoom, the ability to place a fishing boat on water, and the source system producing fish. Items appear on the ground at the building's output point. No belts yet — items just pile up.

## Evaluation Criteria

- **Human**: Open the game, see a grid with blue water tiles at top and green/brown land tiles. Pan with click-drag, zoom with scroll wheel. Click to place a fishing boat on water. Watch fish items appear at its output every 3 seconds.
- **AI**: Create a state with a fishing boat, run 180 ticks (3 seconds), verify the source system produced a fish item. Inspect state to confirm entity count and item output.

---

## Tasks

### Task 2.1: Data layer — items and buildings (starter set)

**Files:** `src/data/items.ts`, `src/data/buildings.ts`, `src/data/recipes.ts`, `src/data/economy.ts`

- Define `ItemDefinition` type and the `ITEMS` const object — start with just `fish` for now (other items added in later milestones)
- Define `BuildingDefinition` type and `BUILDINGS` — start with `fishing_boat` and `fish_market` only
- Create empty `RECIPES` object (no processing yet)
- Create `SELL_PRICES` with just `fish: 2`
- Use `as const satisfies` pattern per engineering doc
- Export `ItemId` and `BuildingId` types derived from the const objects

### Task 2.2: Grid renderer — terrain tiles

**Files:** `src/rendering/gridRenderer.ts`, `src/rendering/renderer.ts`

- Create `Renderer` class that orchestrates all rendering layers
- Create `GridRenderer` that reads `state.grid` and draws terrain tiles
- Use simple colored rectangles for now (no sprites yet): blue for water, tan/beige for land
- Draw grid lines (subtle, low-opacity) to show tile boundaries
- Renderer receives `GameState` (read-only) and the PixiJS stage/container
- Wire `Renderer` into the game loop's `frame()` method

### Task 2.3: Camera — pan and zoom

**Files:** `src/input/camera.ts`, `src/main.ts`

- Set up `@pixi/viewport` with the PixiJS application
- Enable drag-to-pan (middle mouse or right mouse)
- Enable scroll-to-zoom with min/max zoom limits
- Center the camera on the grid initially
- Clamp camera to prevent scrolling too far off the grid edges
- Wire camera into `main.ts`

### Task 2.4: Input manager — mouse tracking and tool state

**Files:** `src/input/inputManager.ts`, `src/input/tools.ts`

- Create `InputManager` that tracks mouse position (screen and world/grid coordinates)
- Convert screen coordinates to grid coordinates using viewport transform
- Define `Tool` type union: `'select' | 'place_building' | 'place_belt' | 'delete'`
- Track current active tool and selected building type (for place_building tool)
- Emit tool actions on left-click based on current tool
- For now, default tool is `'place_building'` with `'fishing_boat'` selected

### Task 2.5: Building placement system

**Files:** `src/systems/buildingPlacement.ts`

- `placeBuilding(state, buildingId, position, rotation, events)` — validates and places a building
  - Check terrain compatibility (fishing boat requires water)
  - Check grid cells are unoccupied (for multi-tile buildings like 2x2 boat)
  - Create entity with appropriate components based on `BUILDINGS` definition
  - Mark grid cells as occupied
  - Emit `buildingPlaced` event
- `removeBuilding(state, entityId, events)` — removes a building, clears grid cells, emits `buildingRemoved`
- Write test: `tests/systems/buildingPlacement.test.ts` — place a boat on water (succeeds), place a boat on land (fails)

### Task 2.6: Building renderer

**Files:** `src/rendering/buildingRenderer.ts`

- Iterate `state.entities`, draw a sprite/rectangle for each building
- Use colored rectangles for now: dark blue for fishing boat, orange for fish market
- Draw at correct grid position, respecting building size (2x2 for boat)
- Show building label text (small, centered)
- Add to `Renderer` layer ordering (grid → buildings)

### Task 2.7: Source system — buildings produce items

**Files:** `src/systems/sourceSystem.ts`

- Iterate entities with `source` component
- Decrement timer by `dt`; when timer <= 0, produce an item:
  - Reset timer to `source.interval`
  - Try to push item onto the output belt (belt system doesn't exist yet)
  - For now: store produced items in a temporary output buffer on the entity (add `outputBuffer: ItemId[]` to `SourceComponent`)
- Wire `sourceSystem` into the game loop tick order (first system)
- Write test: `tests/systems/sourceSystem.test.ts` — fishing boat produces a fish after 3 seconds (180 ticks)

### Task 2.8: Item rendering (ground items)

**Files:** `src/rendering/itemRenderer.ts`

- Render items from entity output buffers as small colored circles/squares at the building's output connection point
- Stack multiple items visually (offset slightly) so you can see accumulation
- Use simple colored shapes: fish = blue circle
- Add to renderer layer ordering (grid → buildings → items)
- This is temporary — items will later render on belts instead

### Task 2.9: Tile highlight and placement preview

**Files:** `src/input/inputManager.ts` (update), `src/rendering/gridRenderer.ts` (update)

- Show a highlight on the tile under the mouse cursor
- When in building placement mode, show a ghost preview of the building footprint
- Color the ghost green if placement is valid, red if invalid (wrong terrain, occupied)
- On left-click, call `placeBuilding()` if valid
