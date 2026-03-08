// ---------------------------------------------------------------------------
// Grid Renderer — draws terrain tiles and grid lines
// ---------------------------------------------------------------------------

import { Container, Graphics } from 'pixi.js';
import type { GameState } from '../core/state.ts';

export const TILE_SIZE = 48;

export class GridRenderer {
  readonly container = new Container();
  private terrainGraphics = new Graphics();
  private gridLines = new Graphics();
  private highlightGraphics = new Graphics();
  private ghostGraphics = new Graphics();
  private dirty = true;

  constructor() {
    this.container.addChild(this.terrainGraphics);
    this.container.addChild(this.gridLines);
    this.container.addChild(this.highlightGraphics);
    this.container.addChild(this.ghostGraphics);
  }

  markDirty(): void {
    this.dirty = true;
  }

  render(state: GameState): void {
    if (!this.dirty) return;
    this.dirty = false;

    this.terrainGraphics.clear();
    this.gridLines.clear();

    const gridHeight = state.grid.length;
    const gridWidth = state.grid[0]?.length ?? 0;

    // Draw terrain tiles
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const cell = state.grid[y][x];
        const color = cell.terrain === 'water' ? 0x4a90d9 : 0xc2b280;
        this.terrainGraphics.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.terrainGraphics.fill(color);
      }
    }

    // Draw grid lines
    this.gridLines.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.15 });
    for (let y = 0; y <= gridHeight; y++) {
      this.gridLines.moveTo(0, y * TILE_SIZE);
      this.gridLines.lineTo(gridWidth * TILE_SIZE, y * TILE_SIZE);
      this.gridLines.stroke();
    }
    for (let x = 0; x <= gridWidth; x++) {
      this.gridLines.moveTo(x * TILE_SIZE, 0);
      this.gridLines.lineTo(x * TILE_SIZE, gridHeight * TILE_SIZE);
      this.gridLines.stroke();
    }
  }

  /** Show a highlight at the given grid position. Pass null to clear. */
  renderHighlight(
    gridX: number | null,
    gridY: number | null,
  ): void {
    this.highlightGraphics.clear();
    if (gridX === null || gridY === null) return;

    this.highlightGraphics.rect(
      gridX * TILE_SIZE,
      gridY * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
    );
    this.highlightGraphics.fill({ color: 0xffffff, alpha: 0.2 });
  }

  /** Show a ghost building footprint. Color green if valid, red if invalid. */
  renderGhost(
    gridX: number | null,
    gridY: number | null,
    sizeW: number,
    sizeH: number,
    valid: boolean,
  ): void {
    this.ghostGraphics.clear();
    if (gridX === null || gridY === null) return;

    const color = valid ? 0x00ff00 : 0xff0000;
    this.ghostGraphics.rect(
      gridX * TILE_SIZE,
      gridY * TILE_SIZE,
      sizeW * TILE_SIZE,
      sizeH * TILE_SIZE,
    );
    this.ghostGraphics.fill({ color, alpha: 0.3 });
    this.ghostGraphics.setStrokeStyle({ width: 2, color, alpha: 0.6 });
    this.ghostGraphics.rect(
      gridX * TILE_SIZE,
      gridY * TILE_SIZE,
      sizeW * TILE_SIZE,
      sizeH * TILE_SIZE,
    );
    this.ghostGraphics.stroke();
  }
}
