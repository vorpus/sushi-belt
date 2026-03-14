// ---------------------------------------------------------------------------
// Minimap Renderer — simplified grid overview with viewport indicator
// ---------------------------------------------------------------------------

import type { Viewport } from 'pixi-viewport';
import type { Application } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const BUILDING_COLORS: Record<string, string> = {
  fishing_boat: '#2255aa',
  fish_market: '#e87f22',
  cutting_board: '#8b6914',
  rice_paddy: '#55aa22',
  rice_cooker: '#aa5522',
  nigiri_press: '#884488',
  sushi_shop: '#cc3344',
  splitter: '#66aacc',
  merger: '#cc9944',
  tunnel: '#555577',
};

export class MinimapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: Viewport;
  private app: Application;
  private gridWidth: number;
  private gridHeight: number;
  private scaleX: number;
  private scaleY: number;

  constructor(viewport: Viewport, app: Application, gridWidth: number, gridHeight: number) {
    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.viewport = viewport;
    this.app = app;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.scaleX = this.canvas.width / gridWidth;
    this.scaleY = this.canvas.height / gridHeight;

    // Click-to-navigate
    this.canvas.addEventListener('pointerdown', this.onClick.bind(this));
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const sx = this.scaleX;
    const sy = this.scaleY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw terrain
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const cell = state.grid[y]?.[x];
        if (!cell) continue;
        ctx.fillStyle = cell.terrain === 'water' ? '#3a70a9' : '#a09870';
        ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
      }
    }

    // Draw belts
    ctx.fillStyle = '#777777';
    for (const key of state.beltGrid.keys()) {
      const [bx, by] = key.split(',').map(Number);
      ctx.fillRect(bx * sx, by * sy, sx + 0.5, sy + 0.5);
    }

    // Draw buildings
    for (const entity of state.entities.values()) {
      if (!entity.building) continue;
      const def = BUILDINGS[entity.building.buildingId as BuildingId];
      if (!def) continue;
      ctx.fillStyle = BUILDING_COLORS[def.id] ?? '#888888';
      ctx.fillRect(
        entity.position.x * sx,
        entity.position.y * sy,
        def.size.w * sx,
        def.size.h * sy,
      );
    }

    // Draw viewport indicator
    const worldPxW = this.gridWidth * TILE_SIZE;
    const worldPxH = this.gridHeight * TILE_SIZE;
    const vpScale = this.viewport.scale.x;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const viewWorldW = screenW / vpScale;
    const viewWorldH = screenH / vpScale;
    const viewWorldX = this.viewport.center.x - viewWorldW / 2;
    const viewWorldY = this.viewport.center.y - viewWorldH / 2;

    const rx = (viewWorldX / worldPxW) * this.canvas.width;
    const ry = (viewWorldY / worldPxH) * this.canvas.height;
    const rw = (viewWorldW / worldPxW) * this.canvas.width;
    const rh = (viewWorldH / worldPxH) * this.canvas.height;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
  }

  private onClick(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert minimap click to world coordinates
    const worldPxW = this.gridWidth * TILE_SIZE;
    const worldPxH = this.gridHeight * TILE_SIZE;
    const worldX = (mx / this.canvas.width) * worldPxW;
    const worldY = (my / this.canvas.height) * worldPxH;

    this.viewport.moveCenter(worldX, worldY);
  }
}
