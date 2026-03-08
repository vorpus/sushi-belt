# Milestone 5: Processing & Recipes

Reference: [PRD — Processing Stations](../PRD.md#processing-stations) | [Engineering Doc — Data-Driven Content](../ENGINEERING.md#data-driven-content-system)

---

## Goal

The cutting board transforms fish into fish cuts. The player can build a production chain: fishing boat → cutting board → fish market, earning $10 per fish instead of $2. The recipe/processing system is generic and data-driven — adding new processors later requires zero system code changes.

## Evaluation Criteria

- **Human**: Place boat → belt → cutting board → belt → fish market. Watch fish enter the cutter, a progress bar fills, then 2 fish cuts come out the other side. Funds increase by $10 per cycle instead of $2.
- **AI**: Create state with boat + cutter + market chain. Run 600 ticks. Assert fish_cut items are produced. Assert income is higher than raw fish chain (~$10 per cycle vs $2). Assert `state.stats.itemsSoldByType['fish_cut'] > 0`.

---

## Tasks

### Task 5.1: Recipe data

**Files:** `src/data/recipes.ts` (update), `src/data/items.ts` (update)

- Add `fish_cut` to `ITEMS`
- Add `cut_fish` recipe to `RECIPES`: input `fish` × 1, output `fish_cut` × 2, processing time 2.0s, building `cutting_board`
- Add `fish_cut: 5` to `SELL_PRICES` in `src/data/economy.ts`
- Define `RecipeDefinition` type if not yet defined: `{ id, inputs: {item, count}[], outputs: {item, count}[], processingTime, building }`

### Task 5.2: Cutting board building data

**Files:** `src/data/buildings.ts` (update)

- Add `cutting_board` building definition:
  - Size: 1x1
  - Cost: 25, unlockCost: 25
  - Terrain: land
  - Components: `processor` with `recipeId: 'cut_fish'`
  - Connection points: input on west, output on east
- For now, skip unlock gating — make it immediately available (shop/unlock system comes in M6)

### Task 5.3: Processor system

**Files:** `src/systems/processorSystem.ts`

- Iterate entities with `processor` and `inventory` components
- State machine per processor:
  1. **IDLE**: Check inventory for required recipe inputs. If all present, consume them, set `processing: true`, `progress: 0`
  2. **PROCESSING**: Increment `progress` by `dt`. When `progress >= recipe.processingTime`:
     - Set `processing: false`
     - Push output items to entity's output buffer (or directly onto output belt segment)
     - Emit `recipeCompleted` event
  3. **BLOCKED**: If outputs can't be pushed (belt full), wait and retry next tick
- Wire into game loop between `beltSystem` and `sellerSystem`
- Write test: `tests/systems/processorSystem.test.ts`
  - Cutting board with 1 fish: after 120 ticks (2s), produces 2 fish_cut
  - Cutting board with no fish: nothing happens
  - Cutting board with full output belt: stays in BLOCKED state

### Task 5.4: Building I/O — input from belt, output to belt

**Files:** `src/systems/beltSystem.ts` (update), `src/systems/sourceSystem.ts` (update)

- When a belt delivers an item to a building's input, add it to the building's inventory
- When a processor produces output items, push them onto the belt segment connected to the building's output connection point
- The processor's output connection point connects to the belt grid tile adjacent to it
- If no belt connected on output side, items buffer in the entity (similar to source buffering)
- Ensure the segment builder correctly links segments to building output points for processors (not just sources)

### Task 5.5: Processing progress rendering

**Files:** `src/rendering/buildingRenderer.ts` (update)

- For entities with a `processor` component that is actively processing:
  - Draw a small progress bar above the building
  - Fill proportional to `progress / recipe.processingTime`
  - Color: green fill on dark background
- Show input/output item icons near the building's connection points

### Task 5.6: Integration test — processing chain

**Files:** `tests/integration/processingChain.test.ts`

- Build: fishing boat → belt → cutting board → belt → fish market
- Run 1200 ticks (20 simulated seconds)
- Assert:
  - `state.stats.itemsSoldByType['fish_cut'] > 0`
  - `state.funds >= 10` (at least one complete cycle: fish → 2 cuts × $5 = $10)
  - No fish_cut items stuck indefinitely in the cutting board
  - Raw fish are consumed, not sold directly (they go through the cutter)
