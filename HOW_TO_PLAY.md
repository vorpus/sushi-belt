# How to Play Sushi Belt

Sushi Belt is a cozy conveyor-belt automation game. Your goal is to catch fish, move them along conveyor belts, process them, and sell them for profit.

## Getting Started

When you start the game, you're looking at a grid with water tiles (top) and land tiles (bottom). A **toolbar** at the bottom of the screen lets you switch between tools and select buildings. Your job is to set up production chains: **Source → Belts → (Processor) → Belts → Seller**.

### Step-by-step: Your First Production Chain

1. **Place a Fishing Boat** — The game starts with the Build tool active and the Fishing Boat selected (shown in the building picker above the toolbar). Click on a **water** tile to place it. The boat catches fish every 3 seconds. Look for the **orange arrow** showing where items come out.

2. **Switch to belt mode** — Click the **Belt** button in the toolbar (or press **B**).

3. **Draw a belt path** — Click and drag from the Fishing Boat's output down to where you want your Fish Market. You'll see a **live preview** of the belt path as you drag. Belts are drawn in an L-shape: horizontal first, then vertical.

4. **Place a Fish Market** — Click the **Build** button in the toolbar (or press **B**), then select **Fish Market** from the building picker. Click a **land** tile at the end of your belt path. Look for the **blue arrow** showing where items go in.

5. **Watch the money roll in** — Fish travel along the belts and get sold automatically at the market for $2 each. Your earnings are displayed in the top-left corner.

### Upgrading to Processing

Once your basic chain is running, add a **Cutting Board** between the boat and market to multiply your profits:

1. Select the **Cutting Board** from the building picker and place it on a **land** tile.
2. Press **R** to **rotate** the building so its **blue arrow** (input) faces your incoming belt and its **orange arrow** (output) faces where you want items to go next.
3. Connect belts from the Fishing Boat to the Cutting Board's input, and from its output to the Fish Market.
4. The Cutting Board turns 1 fish into 2 fish cuts (worth $5 each = $10 total, vs $2 for raw fish).

## Controls

| Action | Input |
|---|---|
| Place building / start belt drag | **Left-click** |
| Draw belt path | **Left-click and drag** (in Belt mode) |
| Delete belt or building | **Right-click** |
| Pan camera | **WASD** / **Arrow keys** / **Right-click drag** / **Middle-click drag** |
| Zoom | **Scroll wheel** |

### Toolbar

The toolbar at the bottom of the screen has buttons for:

- **Build** — Place buildings. A building picker appears above the toolbar showing available buildings.
- **Rotate** — Rotate the building before placing (or press **R**). The arrow icon shows the current orientation.
- **Belt** — Click and drag to draw conveyor belt paths.
- **Delete** — Click to remove buildings or belts.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| **B** | Toggle between Build and Belt mode |
| **R** | Rotate building (while in Build mode) |
| **X** | Toggle Delete mode |
| **WASD** / **Arrows** | Pan camera |
| **Escape** | Return to default mode |

## Buildings

| Building | Terrain | Cost | What it does |
|---|---|---|---|
| **Fishing Boat** | Water | $0 | Produces fish every 3 seconds |
| **Cutting Board** | Land | $25 | Transforms 1 fish into 2 fish cuts (2s processing time) |
| **Fish Market** | Land | $0 | Sells any items delivered to it |

## Connection Points

Every building shows colored arrows indicating where items flow:

- **Blue arrows** = **inputs** (where items go in)
- **Orange arrows** = **outputs** (where items come out)

These arrows are visible both on the placement preview and on placed buildings. Use **R** to rotate a building so its input and output face the right direction for your belt layout.

## Items & Prices

| Item | Category | Sell Price |
|---|---|---|
| Fish | Raw | $2 |
| Fish Cut | Processed | $5 |

## Tips

- **Rotate before placing!** Press **R** to orient buildings so their inputs and outputs line up with your belts.
- When dragging belts, watch the **path preview** to see exactly where your belts will be placed before releasing.
- If a belt is blocked (the next segment is full), items will back up but won't disappear.
- The building placement ghost turns **green** when placement is valid and **red** when it's not (wrong terrain or occupied tile).
- Processing is more profitable: fish cuts sell for $5 each, and each fish produces 2 cuts ($10 total vs $2 raw).
- You can delete misplaced belts or buildings with **right-click** or by using the Delete tool.
