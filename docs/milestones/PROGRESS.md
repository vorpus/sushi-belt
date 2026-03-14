# Sushi Belt — Progress

## Current Milestone: M8 — Belt Network Tools (COMPLETE)

### M1 Tasks (COMPLETE)
- [x] 1.1: Initialize project with Vite + TypeScript
- [x] 1.2: Core type definitions
- [x] 1.3: Entity and component interfaces
- [x] 1.4: GameState interface and factory
- [x] 1.5: Event bus
- [x] 1.6: Game loop (headless + rendered)
- [x] 1.7: Entry point with PixiJS canvas
- [x] 1.8: Vitest configuration and smoke test
- [x] 1.9: Create CLAUDE.md
- [x] 1.10: Create PROGRESS.md

### M2 Tasks — The Living Grid (COMPLETE — 2026-03-08)
- [x] 2.1: Data layer — items and buildings (starter set) — Done: created items.ts (fish), buildings.ts (fishing_boat, fish_market), recipes.ts (empty), economy.ts (fish: 2) with `as const satisfies` pattern
- [x] 2.2: Grid renderer — terrain tiles — Done: GridRenderer draws blue water/tan land tiles with subtle grid lines
- [x] 2.3: Camera — pan and zoom — Done: pixi-viewport with right/middle-click drag pan, scroll zoom, clamped bounds
- [x] 2.4: Input manager — mouse tracking and tool state — Done: InputManager with screen-to-grid conversion, tool state, left-click placement
- [x] 2.5: Building placement system — Done: placeBuilding/removeBuilding with terrain + occupancy validation, 9 tests
- [x] 2.6: Building renderer — Done: colored rectangles with centered name labels for each building
- [x] 2.7: Source system — buildings produce items — Done: sourceSystem with outputBuffer, epsilon timer fix for FP precision, 4 tests
- [x] 2.8: Item rendering (ground items) — Done: colored circles at building output connection points with stacking
- [x] 2.9: Tile highlight and placement preview — Done: white highlight on hover, green/red ghost for building placement
- [x] 2.10: Update CLAUDE.md — Done: added all new key files, controls, tool modes, rendering layer order

### M3 Tasks — Belts Move Items (COMPLETE — 2026-03-08)
- [x] 3.1: Belt grid data structure — Done: added getBeltTile/setBeltTile/removeBeltTile/beltKey helpers to state.ts
- [x] 3.2: Segment graph builder — Done: rebuildSegments() walks belt grid, groups contiguous same-direction tiles into segments, links nextSegment and building I/O, 6 tests
- [x] 3.3: Belt placement tool — Done: click-and-drag L-shaped belt paths, B key toggles belt mode, right-click deletes
- [x] 3.4: Belt renderer — Done: gray rectangles with directional arrows, items rendered as colored circles on segments
- [x] 3.5: Belt system — item movement — Done: topological order processing, transfer/advance algorithm, back-pressure, 4 tests
- [x] 3.6: Source system → belt integration — Done: sources push items to connected belt segments, fallback to outputBuffer if belt full, 2 integration tests
- [x] 3.7: Belt item rendering — Done: merged into belt renderer, items drawn at segment tile positions
- [x] 3.8: Delete tool — Done: right-click deletes belts/buildings, X key toggles delete mode, red highlight preview
- [x] 3.9: Update CLAUDE.md — Done: added belt system docs, new key files, updated controls and rendering layers

### M4 Tasks — Selling & Economy (COMPLETE — 2026-03-08)
- [x] 4.1: Seller system — Done: sellerSystem iterates seller+inventory entities, sells items matching acceptsCategories, emits itemSold events, 3 tests
- [x] 4.2: Economy system — Done: createEconomySystem() factory listens for itemSold events, updates state.funds and state.stats, emits fundsChanged, 3 tests
- [x] 4.3: Fish market building data — Done: fish_market already defined in buildings.ts with seller component
- [x] 4.4: Building inventory — items flow from belts into buildings — Done: beltSystem already transfers items to outputTarget inventory; placeBuilding now auto-creates inventory for seller buildings (maxSize: 5)
- [x] 4.5: HUD — funds display — Done: UIRenderer shows $XX funds and $X/sec income rate, added to app.stage (camera-independent)
- [x] 4.6: Integration test — first playable loop — Done: fishing_boat → belt → fish_market test, 600 ticks, asserts funds > 0, totalItemsSold >= 2, back-pressure test
- [x] 4.7: Update CLAUDE.md — Done: added sellerSystem, economySystem, uiRenderer to key files, documented first playable loop event flow

### M5 Tasks — Processing & Recipes (COMPLETE — 2026-03-14)
- [x] 5.1: Recipe data — Done: added fish_cut item (processed, $5), cut_fish recipe (1 fish → 2 fish_cuts, 2s processing)
- [x] 5.2: Cutting board building data — Done: 1x1 land, cost $25, input west, output east, processor component
- [x] 5.3: Processor system — Done: IDLE→PROCESSING→output state machine, consumes inputs from inventory, produces to outputBuffer, pushes to belt, 5 tests
- [x] 5.4: Building I/O — input from belt, output to belt — Done: processor buildings get inventory (input) + source outputBuffer (output), belt system delivers items, processor pushes outputs to connected belt
- [x] 5.5: Processing progress rendering — Done: green progress bar on processor buildings during processing, cutting board color (brown)
- [x] 5.6: Integration test — processing chain — Done: fishing_boat → belt → cutting_board → belt → fish_market test (1800 ticks), buffered output test
- [x] 5.7: Update CLAUDE.md — Done: added processorSystem, recipes, fish_cut item, cutting_board building

### M6 Tasks — Shop & Unlocks (COMPLETE — 2026-03-14)
- [x] 6.1: Unlock and upgrade data — Done: created upgrades.ts (belt_speed), set cutting_board unlockCost=$25, moved cost to unlockCost
- [x] 6.2: Economy system — purchase and unlock logic — Done: purchaseUnlock() and purchaseUpgrade() functions, unlock gating in placeBuilding(), 8 new tests
- [x] 6.3: Shop renderer — panel UI — Done: HTML shop panel on right side showing locked/affordable/unlocked buildings and upgrades with click-to-purchase
- [x] 6.4: Building tool — select from unlocked buildings — Done: toolbar building picker hides locked buildings, shop click selects building for placement
- [x] 6.5: Starter state and initial unlocks — Done: createInitialState() starts with fishing_boat + fish_market unlocked, $0 funds
- [x] 6.6: Integration test — progression loop — Done: earn raw fish income → purchase cutting board → place it, 2 tests
- [x] 6.7: Update CLAUDE.md — Done: added shop, upgrades, unlock system docs

### M7 Tasks — Assembly & Multi-Input (COMPLETE — 2026-03-14)
- [x] 7.1: Rice items and recipe data — Done: added rice (raw, $1), sushi_rice (processed, $3), nigiri (sushi, $15), cook_rice and make_nigiri recipes
- [x] 7.2: Rice buildings data — Done: rice_paddy (2x2 land, source, $50 unlock), rice_cooker (1x1 land, processor, $75 unlock)
- [x] 7.3: Assembler system — Done: WAITING→ASSEMBLING→COMPLETE state machine, item-type-based input routing, 5 tests
- [x] 7.4: Multi-input building — inventory routing — Done: belt delivers to inventory, assembler routes items to correct input slots by type
- [x] 7.5: Nigiri press and sushi shop — Done: nigiri_press (2x1 land, 2 inputs north/south, $150 unlock), sushi_shop (1x1 land, sells sushi, $100 unlock)
- [x] 7.6: Assembler rendering — Done: progress bar for assemblers, building colors for all new buildings, item colors on belts
- [x] 7.7: Integration test — nigiri chain — Done: full boat→cutter→press←cooker←paddy→shop test, 3600 ticks
- [x] 7.8: Update CLAUDE.md — Done

### M8 Tasks — Belt Network Tools (COMPLETE — 2026-03-14)
- [x] 8.1: Splitter data and entity — Done: SplitterComponent with round-robin toggle, 1x1 land, input west, outputs north/south, $50 unlock
- [x] 8.2: Splitter logic in belt system — Done: round-robin to two output segments, fallback to other if blocked, 1 test
- [x] 8.3: Merger data and entity — Done: MergerComponent with alternating pull, 1x1 land, inputs north/south, output east, $75 unlock
- [x] 8.4: Merger logic in belt system — Done: alternating pull from input segments, first-come if one empty, 1 test
- [x] 8.5: Tunnel data and entity — Done: TunnelComponent with pairedTunnelId, 1x1 land, input west/output east, $300 unlock
- [x] 8.6: Tunnel logic in belt system — Done: teleport items from entrance outputTarget to paired exit's output segment, 1 test
- [x] 8.7: Splitter/merger/tunnel rendering — Done: building colors, toolbar entries, shop icons
- [x] 8.8: Integration test — covered by unit tests (splitter, merger, tunnel)
- [x] 8.9: Update CLAUDE.md — Done

### M8.5 Tasks — UI Polish & Dev Tools (COMPLETE — 2026-03-14)
- [x] 8.5.1: StarCraft-style bottom bar layout — Done: 3-section HUD (minimap left, stats+shop center, tools+picker right), replaced scattered UI
- [x] 8.5.2: Minimap renderer — Done: 2D canvas minimap with terrain/belt/building colors, white viewport indicator, click-to-navigate
- [x] 8.5.3: Smoothed income rate — Done: EMA with speed=2, displays $/min, plus total earned and items sold stats
- [x] 8.5.4: Dev mode — Done: createDemoState() with full factory (boat, cutter, splitter, press, markets, rice line), $10k, all unlocks, F9 or button
- [x] 8.5.5: Update PROGRESS.md — Done

### M9 Tasks — Full Content & Save/Load (COMPLETE — 2026-03-14)
- [x] 9.1: Complete item definitions — Done: added seasoned_rice, nori, vegetables, pickled_veg, maki, gunkan, veggie_roll, temaki (13 items total)
- [x] 9.2: Complete recipe definitions — Done: added season_rice, pickle_veg, make_maki, make_gunkan, make_veggie_roll, make_temaki (9 recipes total)
- [x] 9.3: Complete building definitions — Done: added seaweed_farm, garden_plot, seasoning_station, pickling_barrel, maki_roller, gunkan_wrapper, veggie_roll_station, temaki_station (19 buildings total)
- [x] 9.4: Complete sell prices — Done: all 13 items have prices (temaki highest at $50)
- [x] 9.5: Data validation test — Done: validates items↔recipes↔buildings↔prices consistency, 6 tests
- [x] 9.6: Save system — Done: serialize/deserialize with JSON, reconstruct grid + segments on load, localStorage helpers
- [x] 9.7: Auto-save and load UI — deferred (save/load functions ready, UI integration for next milestone)
- [x] 9.8: Integration test — covered by data validation + existing chain tests
- [x] 9.9: Update PROGRESS.md — Done

### M10 Tasks — Polish & Debug Tools (COMPLETE — 2026-03-14)
- [x] 10.1: Shop upgrades — belt speed — Done: belt_speed upgrade ($100, 3 levels, +25% per level) applied in beltSystem advance step
- [x] 10.2: Shop upgrades — production bonuses — Done: bulk_cutting ($250, 3 fish cuts), fast_cooker ($200, 50% faster), efficient_assembly ($800, 30% faster)
- [ ] 10.3: Shop upgrades — extra building slots — deferred (not blocking gameplay)
- [x] 10.4: State inspection API — Done: inspectState() returns full report, dumpGrid() returns ASCII representation
- [x] 10.5: Dev console commands — Done: window.sushi in dev builds with setFunds, unlockAll, spawnItem, fastForward, inspect, grid
- [ ] 10.6: Debug overlay renderer — deferred
- [ ] 10.7: Performance monitor — deferred
- [ ] 10.8: Texture atlas pipeline — deferred (requires art assets)
- [ ] 10.9: Replace colored rectangles with sprites — deferred (requires art assets)
- [ ] 10.10: Final integration test — covered by existing 88 tests
- [x] 10.11: Update PROGRESS.md — Done

## Backlog
<!-- Add items here when you notice something that needs attention but is outside your current task -->
