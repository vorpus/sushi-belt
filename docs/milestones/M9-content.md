# Milestone 9: Full Content & Save/Load

Reference: [PRD — Ingredient & Recipe Tree](../PRD.md#ingredient--recipe-tree) | [Engineering Doc — Save/Load](../ENGINEERING.md#state-management--saveload)

---

## Goal

All items, recipes, buildings, and the complete unlock tree from the PRD are playable. The game auto-saves and can be loaded from localStorage. A player can progress through the entire first hour of gameplay as described in the PRD walkthrough.

## Evaluation Criteria

- **Human**: Play through the full first-hour walkthrough from the PRD. Start with fish, progress through cutting board, rice, nigiri, nori, seasoning, maki, all the way to gunkan/veggie roll/temaki. Save the game, refresh the browser, load and continue. The entire unlock tree is accessible.
- **AI**: Create state, fast-forward through the progression. Verify all recipes produce correct outputs. Verify all sell prices match PRD. Serialize state, deserialize, verify state matches. Verify data integrity: every recipe references valid items, every building references valid recipes.

---

## Tasks

### Task 9.1: Complete item definitions

**Files:** `src/data/items.ts` (update)

- Add all remaining items per engineering doc:
  - `seasoned_rice`, `nori`, `vegetables`, `pickled_veg`
  - `maki`, `gunkan`, `veggie_roll`, `temaki`
- Ensure all item IDs, names, categories, and sprite references are correct

### Task 9.2: Complete recipe definitions

**Files:** `src/data/recipes.ts` (update)

- Add all remaining recipes per engineering doc:
  - `season_rice`: sushi_rice → seasoned_rice (2.0s, seasoning_station)
  - `pickle_veg`: vegetables → pickled_veg (4.0s, pickling_barrel)
  - `make_maki`: fish_cut + seasoned_rice + nori → maki (4.0s, maki_roller)
  - `make_gunkan`: fish_cut + sushi_rice + nori → gunkan (3.5s, gunkan_wrapper)
  - `make_veggie_roll`: pickled_veg + seasoned_rice + nori → veggie_roll (4.0s, veggie_roll_station)
  - `make_temaki`: fish_cut + sushi_rice + nori + pickled_veg → temaki (5.0s, temaki_station)

### Task 9.3: Complete building definitions

**Files:** `src/data/buildings.ts` (update)

- Add all remaining buildings per PRD:
  - Sources: `seaweed_farm` (nori, water, 2x2), `garden_plot` (vegetables, land, 2x2)
  - Processors: `seasoning_station` (1x1), `pickling_barrel` (1x1)
  - Assemblers: `maki_roller` (2x1, 3 inputs), `gunkan_wrapper` (2x1, 3 inputs), `veggie_roll_station` (2x1, 3 inputs), `temaki_station` (2x2, 4 inputs)
- Set correct unlock costs per PRD: seaweed farm $200, seasoning $300, maki roller $500, garden $500, pickling $600, gunkan $750, veggie roll $900, temaki $1500

### Task 9.4: Complete sell prices

**Files:** `src/data/economy.ts` (update)

- Add all remaining sell prices per PRD:
  - nori: $3, vegetables: $2, pickled_veg: $4
  - maki: $30, gunkan: $25, veggie_roll: $22, temaki: $50

### Task 9.5: Data validation test

**Files:** `tests/data/validation.test.ts`

- Write a build-time validation test per engineering doc:
  - Every recipe references valid item IDs (inputs and outputs exist in ITEMS)
  - Every building with a processor/assembler references a valid recipe ID
  - Every item has a sell price in SELL_PRICES
  - Every building has valid connection point geometry (sides are valid directions)
  - No circular recipe dependencies
  - All unlock costs are non-negative numbers
- This catches content errors automatically

### Task 9.6: Save system — serialize and deserialize

**Files:** `src/core/save.ts`

- Implement `serialize(state)` per engineering doc:
  - Convert Maps and Sets to arrays for JSON compatibility
  - Include schema version number
  - Exclude derived data (grid is reconstructed from entities)
- Implement `deserialize(json)`:
  - Parse JSON, reconstruct Maps and Sets
  - Call `rebuildGrid(state)` to reconstruct grid from entity positions
  - Call `rebuildSegments(state)` to reconstruct belt segment graph
  - Version migration support (check version, apply migrations)
- Write test: `tests/core/save.test.ts`
  - Round-trip: create state with entities + belts, serialize, deserialize, verify equality
  - Grid reconstruction: verify grid matches entity positions after load
  - Segment reconstruction: verify belt segments are correct after load

### Task 9.7: Auto-save and load UI

**Files:** `src/core/save.ts` (update), `src/core/gameLoop.ts` (update), `src/rendering/uiRenderer.ts` (update)

- Auto-save to `localStorage` every 60 seconds (track timer in game loop)
- Save key: `'sushi-belt-save'`
- On game start: check for existing save, offer to load or start new
- Add save/load indicator to HUD (small "Saved" flash when auto-save occurs)
- Add manual save button to UI
- Add "New Game" option that clears save and creates fresh state

### Task 9.8: Integration test — full progression

**Files:** `tests/integration/fullProgression.test.ts`

- Simulate the entire first-hour progression from the PRD:
  - Start fresh, place boat + market
  - Earn $25, buy cutting board, place it in chain
  - Earn $50, buy rice paddy, then $75 for rice cooker
  - Earn $100 for sushi shop, $150 for nigiri press
  - Build nigiri production line
  - Continue unlocking through nori, seasoning, maki, etc.
- Fast-forward through ticks as needed (don't run real-time)
- Assert each milestone of the progression produces expected income improvements
- This is the "full game test" — if this passes, the core game loop works end-to-end
