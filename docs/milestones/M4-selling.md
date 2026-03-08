# Milestone 4: Selling & Economy

Reference: [PRD — Progression & Economy](../PRD.md#progression--economy) | [Engineering Doc — Game Loop](../ENGINEERING.md#game-loop)

---

## Goal

Fish flow from a fishing boat, along belts, into a fish market that sells them for money. The player sees their funds increase. This completes the first playable loop: **source → belt → seller = income**.

## Evaluation Criteria

- **Human**: Place a fishing boat, draw belts to a fish market, watch funds tick up by $2 every time a fish arrives. The HUD shows current funds clearly.
- **AI**: Create state with boat + belt + fish market. Run 600 ticks. Assert `state.funds > 0`. Assert `state.stats.totalItemsSold > 0`. Assert `state.stats.itemsSoldByType['fish'] > 0`.

---

## Tasks

### Task 4.1: Seller system

**Files:** `src/systems/sellerSystem.ts`

- Iterate entities with `seller` component and `inventory` component
- For each item in inventory:
  - Look up sell price from `SELL_PRICES`
  - Check item category matches seller's `acceptsCategories`
  - Emit `itemSold` event with item ID, value, seller entity ID
  - Remove item from inventory
- Wire into game loop after `assemblerSystem` (even though assembler doesn't exist yet — placeholder position)
- Write test: `tests/systems/sellerSystem.test.ts`
  - Fish market with fish in inventory → emits `itemSold` with value 2, fish removed

### Task 4.2: Economy system

**Files:** `src/systems/economySystem.ts`

- Listen for `itemSold` events
- Add sale value to `state.funds`
- Update `state.stats`: increment `totalItemsSold`, `totalMoneyEarned`, `itemsSoldByType[itemId]`
- Emit `fundsChanged` event
- Wire into game loop (runs after seller system)
- Write test: `tests/systems/economySystem.test.ts`
  - Process an `itemSold` event → funds increase, stats update

### Task 4.3: Fish market building data

**Files:** `src/data/buildings.ts` (update)

- Add `fish_market` building definition:
  - Size: 1x1
  - Cost: 0, unlockCost: 0
  - Terrain: land
  - Components: `seller` with `acceptsCategories: ['raw', 'processed']`
  - Connection points: 1 input on west side
  - Sprite: `building_fish_market`
- This enables placing fish markets in the game

### Task 4.4: Building inventory — items flow from belts into buildings

**Files:** `src/systems/beltSystem.ts` (update), `src/core/entity.ts` (update)

- When a belt segment's `outputTarget` is set and the front item reaches the end:
  - Look up the target entity
  - If entity has an `inventory` component and inventory is not full:
    - Add item to inventory
    - Remove item from belt segment
  - If inventory is full: item stays on belt (back-pressure)
- Ensure fish market entities are created with an `inventory` component (maxSize of e.g. 5)
- Update segment builder to detect building input connection points and set `outputTarget`

### Task 4.5: HUD — funds display

**Files:** `src/rendering/uiRenderer.ts`

- Create `UIRenderer` that draws a HUD overlay (not affected by camera pan/zoom)
- Display current funds: `$XX` in the top-left corner
- Use PixiJS `Text` object with a clean font
- Display income rate: `$X/sec` (calculated from recent sales over last 60 ticks)
- Add to renderer layer ordering (drawn last, on top of everything)
- Wire into `Renderer`

### Task 4.6: Integration test — first playable loop

**Files:** `tests/integration/firstLoop.test.ts`

- Build a complete test scenario: fishing boat → 5-tile belt → fish market
- Create test helpers: `buildTestFactory()` function per engineering doc that sets up buildings and auto-routes belts between them
- Run 600 ticks (10 simulated seconds)
- Assert:
  - `state.funds > 0`
  - `state.stats.totalItemsSold >= 2` (at least 2 fish sold in 10 seconds with 3s production interval)
  - Fish market inventory is cycling (items come in and get sold)
  - Belt segments have correct topology (source → belt → market)
