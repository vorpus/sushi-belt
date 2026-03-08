# Milestone 6: Shop & Unlocks

Reference: [PRD — Unlock Tree](../PRD.md#unlock-tree-linear-first-hour) | [PRD — Shop Upgrades](../PRD.md#shop-upgrades-purchased-separately)

---

## Goal

A shop panel where the player spends earned funds to unlock new buildings. The unlock tree gates what can be placed. The player experiences the progression loop: earn money → buy unlock → place new building → earn more money.

## Evaluation Criteria

- **Human**: Start with only fishing boat and fish market available. Earn money selling fish. Open the shop, see the cutting board costs $25 and is grayed out until affordable. Buy it, then place it. The shop shows the next unlock. Feel the progression loop.
- **AI**: Start state with default unlocks (boat + market). Set funds to $30 via `state.funds = 30`. Call purchase function for cutting board. Assert unlock succeeds, funds decrease by $25, cutting board is now placeable. Assert purchasing something you can't afford fails.

---

## Tasks

### Task 6.1: Unlock and upgrade data

**Files:** `src/data/upgrades.ts`, `src/data/buildings.ts` (update)

- Define `UpgradeDefinition` type: `{ id, name, description, cost, effect }`
- Populate `UPGRADES` with belt speed upgrades, extra slots, splitter/merger/tunnel unlocks per PRD
- Ensure all buildings in `BUILDINGS` have correct `unlockCost` values per PRD unlock tree
- Define unlock order / prerequisites (linear for first hour): boat → market → cutting board → rice paddy → rice cooker → sushi shop → nigiri press → ...

### Task 6.2: Economy system — purchase and unlock logic

**Files:** `src/systems/economySystem.ts` (update)

- `purchaseUnlock(state, unlockId, events)`:
  - Check if already unlocked
  - Check if player has enough funds
  - Deduct cost from `state.funds`
  - Add to `state.unlocks`
  - Emit `unlockPurchased` and `fundsChanged` events
  - Return success/failure
- `purchaseUpgrade(state, upgradeId, events)`:
  - Similar pattern but increments `state.upgrades[upgradeId]`
  - Upgrades can be purchased multiple times (leveled)
- Gate building placement: `placeBuilding()` should check if the building type is unlocked
- Write test: `tests/systems/economySystem.test.ts` (update)
  - Purchase with sufficient funds → success
  - Purchase with insufficient funds → failure
  - Purchase already unlocked → failure
  - Place locked building → failure

### Task 6.3: Shop renderer — panel UI

**Files:** `src/rendering/shopRenderer.ts`

- Draw a shop panel on the right side of the screen (fixed position, not affected by camera)
- List all buildings and upgrades, grouped by category:
  - **Buildings**: Show name, cost, locked/unlocked state
  - **Upgrades**: Show name, cost, current level
- Locked items: grayed out with lock icon, show cost
- Affordable but locked: highlighted to indicate purchasable
- Already unlocked: show checkmark, no cost
- Clicking a purchasable item calls `purchaseUnlock()` / `purchaseUpgrade()`
- After purchasing a building unlock, auto-switch to building placement tool with that building selected

### Task 6.4: Building tool — select from unlocked buildings

**Files:** `src/input/tools.ts` (update), `src/input/inputManager.ts` (update)

- Building placement tool now shows which building type is selected
- Only allow placing buildings that are in `state.unlocks`
- Add a building picker: keyboard shortcuts (1-9) or clicking in the shop panel to select building type
- Show the selected building name somewhere on the HUD
- Cycle through available buildings with Tab or number keys

### Task 6.5: Starter state and initial unlocks

**Files:** `src/core/state.ts` (update)

- `createInitialState()` now gives the player:
  - Starting funds: $0 (per PRD — earn everything)
  - Starting unlocks: `fishing_boat`, `fish_market` (free, available from start)
- All other buildings are locked until purchased
- Verify the PRD unlock costs are correct in building data

### Task 6.6: Integration test — progression loop

**Files:** `tests/integration/progression.test.ts`

- Start with initial state (just boat + market unlocked)
- Place boat + market + belts
- Run until funds >= $25 (enough for cutting board)
- Purchase cutting board
- Place cutting board in the chain
- Run until funds >= $50 (enough for rice paddy)
- Assert progression is working: each purchase unlocks new capability, income increases
- This test verifies the unlock tree and economy are properly connected

### Task 6.7: Update CLAUDE.md

**Files:** `CLAUDE.md`

Update CLAUDE.md to reflect everything introduced in this milestone:
- Add `src/rendering/shopRenderer.ts` to key files
- Add `src/data/upgrades.ts` to key files
- Document the unlock/purchase system: `purchaseUnlock()` and `purchaseUpgrade()` in `economySystem`
- Note that building placement now checks `state.unlocks` — locked buildings can't be placed
- Document starting state: player starts with $0 funds and only fishing_boat + fish_market unlocked
- Add keyboard shortcuts for building selection (1-9, Tab) to Controls section
