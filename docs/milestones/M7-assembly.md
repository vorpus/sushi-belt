# Milestone 7: Assembly & Multi-Input

Reference: [PRD — Assembly Stations](../PRD.md#assembly-stations) | [PRD — First Hour Minutes 10-25](../PRD.md#minutes-1018-second-ingredient)

---

## Goal

Rice paddy and rice cooker work as a second production line. The nigiri press combines fish cuts + sushi rice into nigiri. The sushi shop sells assembled sushi for premium prices. The game now has its core routing challenge: multiple ingredient streams converging on assembly stations.

## Evaluation Criteria

- **Human**: Build two parallel production lines (fish + rice). Route both into a nigiri press. Watch nigiri come out and sell at the sushi shop for $15. Experience the "aha" moment of multi-input routing. The layout requires thought — belts can't cross without tunnels (not yet available).
- **AI**: Create state with boat + cutter + rice paddy + rice cooker + nigiri press + sushi shop, all connected with belts. Run 1800 ticks (30 seconds). Assert `state.stats.itemsSoldByType['nigiri'] > 0`. Assert `state.funds` reflects nigiri income ($15 each). Verify both input slots of the nigiri press are being fed.

---

## Tasks

### Task 7.1: Rice items and recipe data

**Files:** `src/data/items.ts` (update), `src/data/recipes.ts` (update), `src/data/economy.ts` (update)

- Add to `ITEMS`: `rice`, `sushi_rice`
- Add recipe `cook_rice`: input `rice` × 1, output `sushi_rice` × 1, processing time 3.0s, building `rice_cooker`
- Add to `SELL_PRICES`: `rice: 1`, `sushi_rice: 3`

### Task 7.2: Rice buildings data

**Files:** `src/data/buildings.ts` (update)

- Add `rice_paddy`:
  - Size: 2x2, cost: 50, terrain: land
  - Components: `source` with `produces: 'rice', interval: 4.0`
  - Connection points: output on east side
- Add `rice_cooker`:
  - Size: 1x1, cost: 75, terrain: land
  - Components: `processor` with `recipeId: 'cook_rice'`
  - Connection points: input west, output east

### Task 7.3: Assembler system

**Files:** `src/systems/assemblerSystem.ts`

- Iterate entities with `assembler` and `inventory` components
- Assembler has multiple input slots (defined by recipe inputs)
- State machine:
  1. **WAITING**: Check if all required input items are present in `assembler.inputSlots`. Items arriving via belt go into the correct slot based on item type.
  2. **ASSEMBLING**: When all inputs are present, consume them, start processing timer (`progress += dt`)
  3. **COMPLETE**: When `progress >= recipe.processingTime`, produce output items, push to output belt
  4. **BLOCKED**: If output belt full, wait
- Wire into game loop between `processorSystem` and `sellerSystem`
- Write test: `tests/systems/assemblerSystem.test.ts`
  - Nigiri press with fish_cut + sushi_rice → produces nigiri after 3 seconds
  - Nigiri press with only fish_cut → waits indefinitely
  - Nigiri press with full output → blocks after completion

### Task 7.4: Multi-input building — inventory routing

**Files:** `src/systems/beltSystem.ts` (update), `src/core/entity.ts` (update)

- Buildings with assembler components need multiple input connection points
- When a belt delivers an item to an assembler's input:
  - Determine which input slot the item maps to (based on recipe inputs and which connection point the belt is connected to)
  - Alternative simpler approach: assembler accepts any valid input item and routes it to the correct slot automatically (item-type-based, not position-based)
  - Reject items that don't match any input slot (item stays on belt — back-pressure)
- Update segment builder to handle buildings with multiple input connection points

### Task 7.5: Nigiri press and sushi shop building data

**Files:** `src/data/buildings.ts` (update), `src/data/recipes.ts` (update), `src/data/items.ts` (update), `src/data/economy.ts` (update)

- Add `nigiri` to `ITEMS`
- Add `make_nigiri` recipe: inputs `fish_cut` × 1 + `sushi_rice` × 1, output `nigiri` × 1, processing time 3.0s
- Add `nigiri: 15` to `SELL_PRICES`
- Add `nigiri_press` building:
  - Size: 2x1, cost: 150, terrain: land
  - Components: `assembler` with `recipeId: 'make_nigiri'`
  - Connection points: 2 inputs (north, south or west-top, west-bottom), 1 output (east)
- Add `sushi_shop` building:
  - Size: 1x1, cost: 100, terrain: land
  - Components: `seller` with `acceptsCategories: ['sushi']`
  - Connection points: 1 input (west)

### Task 7.6: Assembler rendering — input slots and progress

**Files:** `src/rendering/buildingRenderer.ts` (update)

- For assembler buildings, show:
  - Input slot indicators near each input connection point (small icons showing what's needed)
  - Fill/empty state for each slot (show a checkmark or filled circle when an input is present)
  - Processing progress bar (same as processor buildings)
  - Output item icon when complete

### Task 7.7: Integration test — nigiri production chain

**Files:** `tests/integration/nigiriChain.test.ts`

- Build full chain:
  - Fishing boat → belt → cutting board → belt → nigiri press (input 1)
  - Rice paddy → belt → rice cooker → belt → nigiri press (input 2)
  - Nigiri press → belt → sushi shop
- Run 3600 ticks (60 seconds)
- Assert:
  - `state.stats.itemsSoldByType['nigiri'] >= 2`
  - `state.funds >= 30` (at least 2 nigiri × $15)
  - Both production lines are flowing (fish cuts AND sushi rice being consumed)
  - No items permanently stuck in any building

### Task 7.8: Update CLAUDE.md

**Files:** `CLAUDE.md`

Update CLAUDE.md to reflect everything introduced in this milestone:
- Add `src/systems/assemblerSystem.ts` to key files
- Update system execution order to show `assemblerSystem` as active (runs between `processorSystem` and `sellerSystem`)
- Document the assembler vs processor distinction: assemblers accept multiple input types into named slots, processors accept one input type
- Note that assembler input routing is item-type-based (items auto-route to the correct slot)
- Document the rice production chain as a second parallel line
- Note that all systems in the game loop are now active and running
