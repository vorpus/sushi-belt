# How to Play Sushi Belt

Sushi Belt is a cozy conveyor-belt automation game. Your goal is to catch fish, move them along conveyor belts, and sell them for profit.

## Getting Started

When you start the game, you're looking at a grid with water tiles (top) and land tiles (bottom). A **toolbar** at the bottom of the screen lets you switch between tools and select buildings. Your job is to set up a production chain: **Source → Belts → Seller**.

### Step-by-step: Your First Production Chain

1. **Place a Fishing Boat** — The game starts with the Build tool active and the Fishing Boat selected (shown in the building picker above the toolbar). Click on a **water** tile to place it. The boat catches fish every 3 seconds and outputs them from its south side.

2. **Switch to belt mode** — Click the **Belt** button in the toolbar (or press **B**).

3. **Draw a belt path** — Click and drag from the Fishing Boat's output (just below it) down to where you want your Fish Market. You'll see a **live preview** of the belt path as you drag. Belts are drawn in an L-shape: horizontal first, then vertical.

4. **Place a Fish Market** — Click the **Build** button in the toolbar (or press **B**), then select **Fish Market** from the building picker. Click a **land** tile at the end of your belt path. The Fish Market accepts items from its north side.

5. **Watch the money roll in** — Fish travel along the belts and get sold automatically at the market for $2 each. Your earnings are displayed in the top-left corner.

## Controls

| Action | Input |
|---|---|
| Place building / start belt drag | **Left-click** |
| Draw belt path | **Left-click and drag** (in Belt mode) |
| Delete belt or building | **Right-click** |
| Pan camera | **Right-click drag** or **middle-click drag** |
| Zoom | **Scroll wheel** |

### Toolbar

The toolbar at the bottom of the screen has three tool buttons:

- **Build** — Place buildings. A building picker appears above the toolbar showing available buildings.
- **Belt** — Click and drag to draw conveyor belt paths.
- **Delete** — Click to remove buildings or belts.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| **B** | Toggle between Build and Belt mode |
| **X** | Toggle Delete mode |
| **Escape** | Return to default mode |

## Buildings

| Building | Terrain | What it does |
|---|---|---|
| **Fishing Boat** | Water | Produces fish every 3 seconds |
| **Fish Market** | Land | Sells any items delivered to it |

## Tips

- Buildings have specific **connection points** — the Fishing Boat outputs from its south side, and the Fish Market accepts input from its north side. Make sure your belts connect to the right spots.
- When dragging belts, watch the **path preview** to see exactly where your belts will be placed before releasing.
- If a belt is blocked (the next segment is full), items will back up but won't disappear.
- The building placement ghost turns **green** when placement is valid and **red** when it's not (wrong terrain or occupied tile).
- You can delete misplaced belts or buildings with **right-click** or by using the Delete tool.
