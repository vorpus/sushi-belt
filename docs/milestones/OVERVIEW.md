# Sushi Belt — Milestone Breakdown

Reference: [PRD](../PRD.md) | [Engineering Doc](../ENGINEERING.md)

---

## How to Use This Breakdown

Each milestone is a **playable goalpost** — after completing it, both a human and an AI agent can evaluate the game's state. Milestones build on each other sequentially.

Each milestone contains **tasks** — small, focused changes (typically 1-4 files) that an agent can complete in a single context window. Tasks are ordered so that each one produces a working (or at least testable) state.

### Evaluation Methods

At each milestone, the game can be evaluated two ways:

1. **State inspection (AI)**: Run the headless simulation, call `inspectState()` or run unit/integration tests to verify behavior programmatically.
2. **Human playtesting**: Open the game in a browser, interact with it, and verify visual/interactive behavior.

---

## Milestones at a Glance

| # | Milestone | What You Can Evaluate |
|---|---|---|
| 1 | [Project Scaffolding & Core Types](./M1-scaffolding.md) | Project builds, types compile, empty game loop runs, tests pass |
| 2 | [The Living Grid](./M2-living-grid.md) | Visible grid with water/land, camera pan/zoom, a fishing boat produces fish on the ground |
| 3 | [Belts Move Items](./M3-belts.md) | Place belts with click-drag, fish flow from boat along belts, segment system works |
| 4 | [Selling & Economy](./M4-selling.md) | Fish market consumes items for money, funds display on HUD, income is flowing |
| 5 | [Processing & Recipes](./M5-processing.md) | Cutting board transforms fish into fish cuts, full chain: boat → cutter → market |
| 6 | [Shop & Unlocks](./M6-shop.md) | Shop panel UI, purchase buildings with funds, unlock tree progression |
| 7 | [Assembly & Multi-Input](./M7-assembly.md) | Rice chain works, nigiri press combines two inputs, sushi shop sells assembled items |
| 8 | [Belt Network Tools](./M8-belt-tools.md) | Splitters, mergers, and tunnels work; complex routing is possible |
| 9 | [Full Content & Save/Load](./M9-content.md) | All items/recipes/buildings from PRD are playable, game saves and loads |
| 10 | [Polish & Debug Tools](./M10-polish.md) | Debug overlay, state inspection API, upgrades, performance tuning |

---

## Dependency Graph

```
M1 (Scaffolding)
 └─► M2 (Grid + Buildings + Sources)
      └─► M3 (Belts)
           └─► M4 (Selling + Economy)
                └─► M5 (Processing)
                     └─► M6 (Shop + Unlocks)
                          └─► M7 (Assembly)
                               └─► M8 (Belt Tools)
                                    └─► M9 (Full Content + Save/Load)
                                         └─► M10 (Polish + Debug)
```

Each milestone assumes all prior milestones are complete.
