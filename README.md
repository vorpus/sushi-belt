# Sushi Belt

A cozy conveyor-belt automation game built with TypeScript and PixiJS. Place buildings, connect them with belts, and watch your sushi empire grow.

## What's Working

- **Grid world** with water and land tiles, pan/zoom camera
- **Buildings** — fishing boats (produce fish) and fish markets (sell fish)
- **Conveyor belts** — click-and-drag to draw L-shaped belt paths between buildings
- **Item transport** — fish flow from sources along belts into sellers
- **Economy** — selling fish earns money, HUD shows funds and income rate

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`).

## Controls

| Input | Action |
|---|---|
| Left-click | Place building or start belt drag |
| Left-click drag | Draw L-shaped belt path (in belt mode) |
| Right-click | Delete belt tile or building under cursor |
| Right-click / middle-click drag | Pan camera |
| Scroll wheel | Zoom in/out |
| B | Toggle between building and belt placement |
| X | Toggle delete tool |
| Escape | Return to select mode |

## How to Play

1. Place a **fishing boat** on a water tile (blue)
2. Press **B** to switch to belt mode
3. Drag a belt path from the fishing boat to a land tile
4. Press **B** to switch back to building mode, then place a **fish market** on land at the end of the belt
5. Watch fish travel along the belt and get sold — your funds go up!

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check and build for production |
| `pnpm test` | Run all tests (headless, no browser needed) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint with ESLint |
| `pnpm format` | Format with Prettier |
