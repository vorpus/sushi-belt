// ---------------------------------------------------------------------------
// Input Manager — mouse tracking, coordinate conversion, tool actions
// ---------------------------------------------------------------------------

import type { Viewport } from 'pixi-viewport';
import type { FederatedPointerEvent } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { GridPosition } from '../core/types.ts';
import { TILE_SIZE } from '../rendering/gridRenderer.ts';
import { type ToolState } from './tools.ts';
import { BUILDINGS, type BuildingDefinition } from '../data/buildings.ts';
import { placeBuilding } from '../systems/buildingPlacement.ts';
import type { Renderer } from '../rendering/renderer.ts';

export class InputManager {
  /** Current grid coordinates under the mouse (null if off-grid). */
  gridX: number | null = null;
  gridY: number | null = null;

  private viewport: Viewport;
  private state: GameState;
  private events: EventBus;
  private toolState: ToolState;
  private renderer: Renderer;

  constructor(
    viewport: Viewport,
    state: GameState,
    events: EventBus,
    toolState: ToolState,
    renderer: Renderer,
  ) {
    this.viewport = viewport;
    this.state = state;
    this.events = events;
    this.toolState = toolState;
    this.renderer = renderer;

    this.viewport.on('pointermove', this.onPointerMove.bind(this));
    this.viewport.on('pointerdown', this.onPointerDown.bind(this));
  }

  private screenToGrid(screenX: number, screenY: number): GridPosition | null {
    const worldPos = this.viewport.toWorld(screenX, screenY);
    const gx = Math.floor(worldPos.x / TILE_SIZE);
    const gy = Math.floor(worldPos.y / TILE_SIZE);

    const gridHeight = this.state.grid.length;
    const gridWidth = this.state.grid[0]?.length ?? 0;

    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) {
      return null;
    }

    return { x: gx, y: gy };
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    const pos = this.screenToGrid(e.globalX, e.globalY);
    if (pos) {
      this.gridX = pos.x;
      this.gridY = pos.y;
    } else {
      this.gridX = null;
      this.gridY = null;
    }

    this.updatePreview();
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    // Only handle left-click
    if (e.button !== 0) return;

    const pos = this.screenToGrid(e.globalX, e.globalY);
    if (!pos) return;

    if (
      this.toolState.activeTool === 'place_building' &&
      this.toolState.selectedBuilding
    ) {
      const result = placeBuilding(
        this.state,
        this.toolState.selectedBuilding,
        pos,
        0,
        this.events,
      );
      if (result) {
        this.renderer.gridRenderer.markDirty();
      }
    }
  }

  private updatePreview(): void {
    if (
      this.toolState.activeTool === 'place_building' &&
      this.toolState.selectedBuilding &&
      this.gridX !== null &&
      this.gridY !== null
    ) {
      const def: BuildingDefinition = BUILDINGS[this.toolState.selectedBuilding];
      const valid = this.isPlacementValid(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        def.terrain,
      );
      this.renderer.gridRenderer.renderGhost(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        valid,
      );
      this.renderer.gridRenderer.renderHighlight(null, null);
    } else {
      this.renderer.gridRenderer.renderGhost(null, null, 0, 0, false);
      this.renderer.gridRenderer.renderHighlight(this.gridX, this.gridY);
    }
  }

  private isPlacementValid(
    gx: number,
    gy: number,
    w: number,
    h: number,
    terrain: string,
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (
          cy < 0 ||
          cy >= this.state.grid.length ||
          cx < 0 ||
          cx >= this.state.grid[0].length
        ) {
          return false;
        }
        const cell = this.state.grid[cy][cx];
        if (cell.terrain !== terrain || cell.entityId !== null) {
          return false;
        }
      }
    }
    return true;
  }
}
