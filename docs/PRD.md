# Sushi Belt — Product Requirements Document

A cozy automation game about wiring together conveyor belts to build a sushi empire. No stress, no enemies, no timers — just the satisfying puzzle of routing ingredients through machines like writing elegant code.

---

## Core Fantasy

You are designing a sushi production floor from above. Boats bring in fish, farms grow rice, and your job is to connect sources → processors → sellers with conveyor belts. The game feels like building a circuit or piping data through a pipeline. Messy spaghetti belts work just fine — but clean ones feel *great*.

---

## Design Pillars

1. **Belt spaghetti is the game.** The primary verb is laying, routing, splitting, and merging belts. Every unlock should create new routing problems to solve.
2. **Cozy, never stressful.** Nothing spoils. Nothing attacks. Belts that back up simply pause — no penalty, no waste. The player optimizes because they *want to*, not because they're punished.
3. **Incremental satisfaction.** Numbers go up. New recipes unlock. Throughput scales. The dopamine loop is: unlock a thing → figure out the belt routing → watch it hum → earn money → repeat.
4. **Readable complexity.** Individual pieces are simple (belt, splitter, machine). Complexity comes from *composition*, not from any single element being hard to understand.

---

## Belt System (Core Mechanic)

### Belt Primitives

| Element | Behavior |
|---|---|
| **Belt** | Moves items in one direction, one item per tile. Configurable speed (upgradeable). |
| **Splitter** | 1 input → 2 outputs. Round-robin by default, filterable later. |
| **Merger** | 2 inputs → 1 output. Alternates, first-come-first-served. |
| **Tunnel** | Belt goes underground for N tiles, passes under other belts. Unlock mid-game to tame spaghetti. |

### Key Belt Rules

- Items on a belt never expire, rot, or disappear.
- If a belt's destination is full, the belt **pauses** — no overflow, no waste.
- Belts can cross only via tunnels (this is what creates routing puzzles).
- Belt speed tiers: Slow → Normal → Fast (global upgrade, not per-belt).

---

## Ingredient & Recipe Tree

### Base Ingredients (Sources)

| Ingredient | Source Building | Unlock |
|---|---|---|
| **Fish** | Fishing Boat (placed on water tiles) | Start |
| **Rice** | Rice Paddy (placed on land tiles) | $50 |
| **Nori** | Seaweed Farm (placed on water tiles) | $200 |
| **Vegetables** | Garden Plot (placed on land tiles) | $500 |

Vegetables include: cucumber, avocado, pickled daikon — abstracted as a single resource type until late-game.

### Processing Stations

| Station | Input → Output | Unlock |
|---|---|---|
| **Cutting Board** | Fish → 2× Fish Cut | $25 |
| **Rice Cooker** | Rice → Sushi Rice | $75 |
| **Seasoning Station** | Sushi Rice → Seasoned Rice | $300 |
| **Pickling Barrel** | Vegetables → Pickled Veg | $600 |

Stations take in one item from a belt, process it (short visible timer, ~2-4s), and output to a belt on the other side. Input side and output side are fixed per rotation, creating placement puzzles.

### Assembly Stations

Assembly stations have **2 or 3 input belts** and **1 output belt**. They wait until all required ingredients are present, then produce the output.

| Station | Inputs → Output | Unlock |
|---|---|---|
| **Nigiri Press** | Fish Cut + Sushi Rice → Nigiri | $150 |
| **Maki Roller** | Fish Cut + Seasoned Rice + Nori → Maki Roll | $500 |
| **Gunkan Wrapper** | Fish Cut + Sushi Rice + Nori → Gunkan | $750 |
| **Veggie Roll Station** | Pickled Veg + Seasoned Rice + Nori → Veggie Roll | $900 |
| **Temaki Hand-Roll** | Fish Cut + Sushi Rice + Nori + Pickled Veg → Temaki | $1500 |

### Sale Values

| Item | Sell Price | Where |
|---|---|---|
| Raw Fish | $2 | Fish Market |
| Fish Cut | $5 | Fish Market |
| Sushi Rice | $3 | Fish Market |
| Seasoned Rice | $6 | Fish Market |
| Nori | $3 | Fish Market |
| Pickled Veg | $4 | Fish Market |
| Nigiri | $15 | Sushi Shop |
| Maki Roll | $30 | Sushi Shop |
| Gunkan | $25 | Sushi Shop |
| Veggie Roll | $22 | Sushi Shop |
| Temaki | $50 | Sushi Shop |

### Sellers

| Building | Accepts | Unlock |
|---|---|---|
| **Fish Market** | Any raw/processed ingredient | Start |
| **Sushi Shop** | Any assembled sushi item | $100 |

Sellers have an input belt. Items arrive and are sold automatically. Sellers have no capacity limit — they just consume and pay.

---

## Progression & Economy

### Unlock Tree (Linear First Hour)

```
START
  │
  ├── Fishing Boat (free)
  ├── Fish Market (free)
  │
  ├── Cutting Board ($25)
  │     └── Fish → Fish Cuts  (revenue: $2 → $5×2)
  │
  ├── Rice Paddy ($50)
  │     └── Second ingredient on the board
  │
  ├── Rice Cooker ($75)
  │     └── Rice → Sushi Rice
  │
  ├── Sushi Shop ($100)
  │     └── Can now sell assembled items
  │
  ├── Nigiri Press ($150)
  │     └── Fish Cut + Sushi Rice → Nigiri ($15)
  │     └── FIRST MULTI-INPUT ROUTING PUZZLE
  │
  ├── Nori Farm ($200)
  │     └── Third ingredient, third belt to manage
  │
  ├── Seasoning Station ($300)
  │     └── Sushi Rice → Seasoned Rice
  │     └── NEW: intermediate processing chain
  │
  ├── Maki Roller ($500)
  │     └── Fish Cut + Seasoned Rice + Nori → Maki ($30)
  │     └── THREE-INPUT ROUTING — spaghetti begins
  │
  ├── Garden Plot ($500)
  ├── Pickling Barrel ($600)
  ├── Gunkan Wrapper ($750)
  ├── Veggie Roll Station ($900)
  │
  └── Temaki Hand-Roll ($1500)
        └── FOUR-INPUT ASSEMBLY — belt mastery
```

### Shop Upgrades (Purchased Separately)

| Upgrade | Cost | Effect |
|---|---|---|
| Belt Speed I | $100 | All belts move 25% faster |
| Belt Speed II | $400 | All belts move 50% faster |
| Extra Boat Slot | $150 | Can place one additional fishing boat |
| Extra Paddy Slot | $150 | Can place one additional rice paddy |
| Splitter | $50 | Unlocks belt splitters |
| Merger | $75 | Unlocks belt mergers |
| Tunnel | $300 | Unlocks underground belt crossings |
| Bulk Cutting | $250 | Cutting Board outputs 3× cuts instead of 2× |
| Fast Cooker | $200 | Rice Cooker processes 50% faster |
| Efficient Assembly | $800 | All assembly stations process 30% faster |

---

## First Hour Walkthrough

### Minutes 0–5: One Fish, One Belt

- Player places a **Fishing Boat** on water. Fish appear on its output belt.
- Player lays a belt from the boat to the **Fish Market**.
- Fish flow in, money trickles. Player learns: belt → direction → destination.
- Income: ~$2 every 3 seconds.

### Minutes 5–10: The First Split

- Player buys the **Cutting Board** ($25).
- Reroutes the fish belt through the cutting board first.
- Fish Cut × 2 comes out the other side → belt to market.
- Income jumps from $2 to $10 per fish. Feels great.
- Player intuitively learns: source → processor → seller.

### Minutes 10–18: Second Ingredient

- Player buys **Rice Paddy** ($50), then **Rice Cooker** ($75).
- Now there are TWO production lines running in parallel.
- Player has to route a second belt system without crossing the first (no tunnels yet).
- This is the first real layout decision.

### Minutes 18–25: First Assembly

- Player buys **Sushi Shop** ($100), then **Nigiri Press** ($150).
- The Nigiri Press needs Fish Cuts AND Sushi Rice arriving on two separate input belts.
- Player must split their fish cut belt (or build a second cutting board) and route sushi rice over.
- **This is the key moment** — the game shifts from linear chains to network routing.
- Nigiri sells for $15 vs $5+$3 raw. The reward for routing complexity is clear.

### Minutes 25–35: Third Ingredient, Belt Tools

- Player buys **Splitters** ($50) and **Mergers** ($75).
- Player buys **Nori Farm** ($200).
- Three ingredient streams now. Belts start getting tangled.
- Player optimizes, reroutes, maybe rebuilds. This is the fun.

### Minutes 35–50: The Seasoning Chain & Maki

- Player unlocks **Seasoning Station** ($300): Sushi Rice → Seasoned Rice.
- This creates a *three-stage chain*: Rice Paddy → Rice Cooker → Seasoning Station.
- Player unlocks **Maki Roller** ($500): needs Fish Cut + Seasoned Rice + Nori.
- Three inputs converging on one station. Belt routing gets complex.
- Player may unlock **Tunnels** ($300) here to cross belts underground.
- Maki at $30 each — income accelerates.

### Minutes 50–60: Expanding & Optimizing

- Player has enough money to unlock vegetables, pickling, gunkan.
- Multiple assembly lines running. The floor looks like a circuit board (or spaghetti).
- The player's goal shifts from "unlock next thing" to "how do I route this cleanly?"
- No pressure to do so — just the intrinsic satisfaction of a tidy factory.

---

## Map & Grid

- Top-down 2D grid. Each tile is one belt segment or one building.
- Map has **water tiles** (top/edges) and **land tiles** (center).
- Boats and seaweed farms go on water. Everything else on land.
- Map starts small-ish, expandable via purchase (keeps early game focused).
- Camera: pan and zoom freely.

---

## UI & Controls

- **Click** to place buildings and belt segments.
- **Drag** to draw belt paths (auto-connects, snaps to grid).
- **Right-click** to delete belt segments or buildings (full refund — no punishment for experimenting).
- **Rotate** buildings before placing (R key or scroll wheel).
- **Shop panel** on the side — shows what's unlockable and costs.
- **Income ticker** visible at all times — satisfying to watch numbers go up.
- Items on belts are visible and animate smoothly. You can watch a fish become cuts become nigiri become money.

---

## What This Game is NOT

- **Not timed.** No day/night cycle affecting gameplay. No rush.
- **Not punishing.** Nothing rots. Backed-up belts pause, no overflow. Full refunds on deletion.
- **Not combat.** No enemies, no threats, no health bars.
- **Not a management sim.** No employees, no customer satisfaction meters, no randomized orders.
- It IS: a spatial puzzle game about connecting things with belts, wearing the skin of a sushi restaurant.

---

## Future Scope (Post First-Hour, Out of V1)

- **Fish varieties**: Tuna, Salmon, Shrimp, Eel — each caught by specialized boats, used in different recipes.
- **Sashimi platter assembly**: Arrange multiple fish types on a plate for premium sale.
- **Bento boxes**: Complex multi-item assembly for high-value output.
- **Tea / Miso soup**: Side items from new ingredient chains.
- **Dipping sauces**: Soy sauce, wasabi, ginger — condiment belts that add value multipliers.
- **Customer preferences**: Optional overlay showing which items are "trending" for bonus income (never a penalty, only a bonus).
- **Blueprint system**: Save and stamp belt layouts for repeated patterns.
- **Endless map**: Expand indefinitely, build mega-factories.
