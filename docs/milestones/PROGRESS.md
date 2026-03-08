# Sushi Belt — Progress

## Current Milestone: M2 — The Living Grid (COMPLETE)

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

### M3 Tasks — Belts Move Items
- [ ] 3.1: Belt grid data structure
- [ ] 3.2: Segment graph builder
- [ ] 3.3: Belt placement tool
- [ ] 3.4: Belt renderer
- [ ] 3.5: Belt system — item movement
- [ ] 3.6: Source system → belt integration
- [ ] 3.7: Belt item rendering
- [ ] 3.8: Delete tool for belts and buildings
- [ ] 3.9: Update CLAUDE.md

### M4 Tasks — Selling & Economy
- [ ] 4.1: Seller system
- [ ] 4.2: Economy system
- [ ] 4.3: Fish market building data
- [ ] 4.4: Building inventory — items flow from belts into buildings
- [ ] 4.5: HUD — funds display
- [ ] 4.6: Integration test — first playable loop
- [ ] 4.7: Update CLAUDE.md

### M5 Tasks — Processing & Recipes
- [ ] 5.1: Recipe data
- [ ] 5.2: Cutting board building data
- [ ] 5.3: Processor system
- [ ] 5.4: Building I/O — input from belt, output to belt
- [ ] 5.5: Processing progress rendering
- [ ] 5.6: Integration test — processing chain
- [ ] 5.7: Update CLAUDE.md

### M6 Tasks — Shop & Unlocks
- [ ] 6.1: Unlock and upgrade data
- [ ] 6.2: Economy system — purchase and unlock logic
- [ ] 6.3: Shop renderer — panel UI
- [ ] 6.4: Building tool — select from unlocked buildings
- [ ] 6.5: Starter state and initial unlocks
- [ ] 6.6: Integration test — progression loop
- [ ] 6.7: Update CLAUDE.md

### M7 Tasks — Assembly & Multi-Input
- [ ] 7.1: Rice items and recipe data
- [ ] 7.2: Rice buildings data
- [ ] 7.3: Assembler system
- [ ] 7.4: Multi-input building — inventory routing
- [ ] 7.5: Nigiri press and sushi shop building data
- [ ] 7.6: Assembler rendering — input slots and progress
- [ ] 7.7: Integration test — nigiri production chain
- [ ] 7.8: Update CLAUDE.md

### M8 Tasks — Belt Network Tools
- [ ] 8.1: Splitter data and entity
- [ ] 8.2: Splitter logic in belt system
- [ ] 8.3: Merger data and entity
- [ ] 8.4: Merger logic in belt system
- [ ] 8.5: Tunnel data and entity
- [ ] 8.6: Tunnel logic in belt system
- [ ] 8.7: Splitter/merger/tunnel rendering
- [ ] 8.8: Integration test — complex belt network
- [ ] 8.9: Update CLAUDE.md

### M9 Tasks — Full Content & Save/Load
- [ ] 9.1: Complete item definitions
- [ ] 9.2: Complete recipe definitions
- [ ] 9.3: Complete building definitions
- [ ] 9.4: Complete sell prices
- [ ] 9.5: Data validation test
- [ ] 9.6: Save system — serialize and deserialize
- [ ] 9.7: Auto-save and load UI
- [ ] 9.8: Integration test — full progression
- [ ] 9.9: Update CLAUDE.md

### M10 Tasks — Polish & Debug Tools
- [ ] 10.1: Shop upgrades — belt speed
- [ ] 10.2: Shop upgrades — production bonuses
- [ ] 10.3: Shop upgrades — extra building slots
- [ ] 10.4: State inspection API
- [ ] 10.5: Dev console commands
- [ ] 10.6: Debug overlay renderer
- [ ] 10.7: Performance monitor
- [ ] 10.8: Texture atlas pipeline
- [ ] 10.9: Replace colored rectangles with sprites
- [ ] 10.10: Final integration test — full game evaluation
- [ ] 10.11: Final CLAUDE.md update

## Backlog
<!-- Add items here when you notice something that needs attention but is outside your current task -->
